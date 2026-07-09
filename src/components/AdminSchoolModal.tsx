"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { X, Save, Trash2, Plus } from "lucide-react";
import {
  GRADE_LABELS,
  SPORTS,
  type SchoolLevel,
} from "@/lib/constants";
import { schoolLevelLabel } from "@/lib/school-name";
import type { SportEntryInput, SubmissionPublic } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import IntInput from "@/components/IntInput";

function emptySport(): SportEntryInput {
  return {
    sport: "",
    totalAthletes: 0,
    failG1: 0,
    failG2: 0,
    failG3: 0,
    completeG1: 0,
    completeG2: 0,
    completeG3: 0,
    basicFailG1: 0,
    basicFailG2: 0,
    basicFailG3: 0,
    note: "",
  };
}

interface Props {
  submissionId: string;
  token: string;
  onClose: () => void;
  onChanged: () => void;
}

export default function AdminSchoolModal({
  submissionId,
  token,
  onClose,
  onChanged,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<SubmissionPublic | null>(null);
  const [sports, setSports] = useState<SportEntryInput[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [editing, setEditing] = useState(false);

  const grades = useMemo(() => {
    if (!data) return ["1학년", "2학년", "3학년"] as [string, string, string];
    return GRADE_LABELS[data.schoolLevel as SchoolLevel];
  }, [data]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/submissions/${submissionId}`, {
          headers: { "x-admin-token": token },
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          toast.error(json.error || "불러오기 실패");
          onClose();
          return;
        }
        setData(json.data);
        setSports(json.data.sports || []);
      } catch {
        if (!cancelled) {
          toast.error("네트워크 오류");
          onClose();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId, token]);

  function updateSport(index: number, patch: Partial<SportEntryInput>) {
    setSports((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  }

  async function handleSave() {
    if (sports.some((s) => !s.sport)) {
      toast.error("종목을 모두 선택해 주세요.");
      return;
    }
    if (newPassword && !/^\d{4}$/.test(newPassword)) {
      toast.error("임시비밀번호는 숫자 4자리여야 합니다.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({
          sports,
          newPassword: newPassword || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "저장 실패");
        return;
      }
      setData(json.data);
      setSports(json.data.sports);
      setNewPassword("");
      setEditing(false);
      toast.success("저장되었습니다.");
      onChanged();
    } catch {
      toast.error("네트워크 오류");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("이 학교 제출 기록을 삭제하시겠습니까?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}`, {
        method: "DELETE",
        headers: { "x-admin-token": token },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || "삭제 실패");
        return;
      }
      toast.success("삭제되었습니다.");
      onChanged();
      onClose();
    } catch {
      toast.error("네트워크 오류");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal>
      <div className="modal-panel !max-w-3xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {data?.schoolName || "학교 제출 상세"}
            </h3>
            {data && (
              <p className="mt-1 text-sm text-slate-500">
                {data.region} ·{" "}
                {schoolLevelLabel(data.schoolLevel as SchoolLevel)} · 수정{" "}
                {formatDate(data.updatedAt)}
              </p>
            )}
          </div>
          <button className="btn btn-ghost !p-2" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">
          {loading || !data ? (
            <div className="py-12 text-center text-sm text-slate-400">
              불러오는 중…
            </div>
          ) : (
            <div className="space-y-4">
              {!editing ? (
                <>
                  {sports.map((s, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-slate-200 overflow-hidden"
                    >
                      <div className="bg-slate-50 px-4 py-2.5 flex flex-wrap justify-between gap-2 text-sm">
                        <strong>{s.sport}</strong>
                        <span>전체 학생선수 {s.totalAthletes}명</span>
                      </div>
                      <div className="overflow-x-auto p-2">
                        <table className="data-table text-xs">
                          <thead>
                            <tr>
                              <th>구분</th>
                              <th className="text-center">{grades[0]}</th>
                              <th className="text-center">{grades[1]}</th>
                              <th className="text-center">{grades[2]}</th>
                              <th className="text-center">합계</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="max-w-[12rem]">
                                학년별 최저학력기준 미도달 학생선수 수
                              </td>
                              <td className="text-center">{s.failG1}</td>
                              <td className="text-center">{s.failG2}</td>
                              <td className="text-center">{s.failG3}</td>
                              <td className="text-center font-bold">
                                {s.failG1 + s.failG2 + s.failG3}
                              </td>
                            </tr>
                            <tr>
                              <td className="max-w-[12rem]">
                                기초학력프로그램 이수 학생선수 수
                              </td>
                              <td className="text-center">{s.completeG1}</td>
                              <td className="text-center">{s.completeG2}</td>
                              <td className="text-center">{s.completeG3}</td>
                              <td className="text-center font-bold">
                                {s.completeG1 + s.completeG2 + s.completeG3}
                              </td>
                            </tr>
                            <tr>
                              <td className="max-w-[12rem]">
                                최저학력에 미도달한 학생선수 중 기초학력보장법에
                                의거한 기초학력 미달 학생선수 수
                              </td>
                              <td className="text-center">{s.basicFailG1}</td>
                              <td className="text-center">{s.basicFailG2}</td>
                              <td className="text-center">{s.basicFailG3}</td>
                              <td className="text-center font-bold">
                                {s.basicFailG1 +
                                  s.basicFailG2 +
                                  s.basicFailG3}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      {s.note && (
                        <div className="px-4 pb-3 text-xs text-slate-500">
                          비고: {s.note}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div>
                    <label className="label">
                      임시비밀번호 변경 (선택, 숫자 4자리)
                    </label>
                    <input
                      className="input max-w-xs tracking-widest font-mono"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="변경 시에만 입력"
                      value={newPassword}
                      onChange={(e) =>
                        setNewPassword(
                          e.target.value.replace(/\D/g, "").slice(0, 4)
                        )
                      }
                    />
                  </div>
                  {sports.map((row, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 p-4 space-y-3"
                    >
                      <div className="flex justify-between gap-2">
                        <select
                          className="select"
                          value={row.sport}
                          onChange={(e) =>
                            updateSport(idx, { sport: e.target.value })
                          }
                        >
                          <option value="">종목 선택</option>
                          {SPORTS.map((sp) => (
                            <option key={sp} value={sp}>
                              {sp}
                            </option>
                          ))}
                        </select>
                        {idx > 0 ? (
                          <button
                            type="button"
                            className="btn btn-danger !py-1.5 text-xs"
                            onClick={() =>
                              setSports((p) =>
                                p.length <= 1
                                  ? p
                                  : p.filter((_, i) => i !== idx)
                              )
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div>
                          <label className="label">전체</label>
                          <IntInput
                            className="input"
                            value={row.totalAthletes}
                            onChange={(n) =>
                              updateSport(idx, { totalAthletes: n })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid gap-2 text-xs sm:grid-cols-3">
                        {(
                          [
                            [
                              "학년별 최저학력기준 미도달 학생선수 수",
                              "failG",
                            ],
                            ["기초학력프로그램 이수 학생선수 수", "completeG"],
                            [
                              "최저학력에 미도달한 학생선수 중 기초학력보장법에 의거한 기초학력 미달 학생선수 수",
                              "basicFailG",
                            ],
                          ] as const
                        ).map(([label, prefix]) => (
                          <div
                            key={prefix}
                            className="flex min-h-[140px] flex-col rounded-xl border border-slate-200 bg-slate-50/60 p-2.5"
                          >
                            <div className="mb-2 line-clamp-3 h-[3.2rem] text-[10px] font-bold leading-snug text-slate-700">
                              {label}
                            </div>
                            <div className="mt-auto grid grid-cols-3 gap-1.5">
                              {[1, 2, 3].map((g) => {
                                const key =
                                  `${prefix}${g}` as keyof SportEntryInput;
                                return (
                                  <div key={key} className="min-w-0">
                                    <div className="mb-0.5 text-center text-[10px] font-semibold text-slate-500">
                                      {grades[g - 1]}
                                    </div>
                                    <IntInput
                                      className="input !h-9 !px-1 !py-0 text-center text-sm tabular-nums"
                                      value={Number(row[key]) || 0}
                                      onChange={(n) =>
                                        updateSport(idx, {
                                          [key]: n,
                                        } as Partial<SportEntryInput>)
                                      }
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                      <input
                        className="input"
                        placeholder="비고"
                        value={row.note}
                        onChange={(e) =>
                          updateSport(idx, { note: e.target.value })
                        }
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSports((p) => [...p, emptySport()])}
                  >
                    <Plus className="h-4 w-4" /> 종목 추가
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 px-5 py-4">
          <button
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={saving || loading}
          >
            <Trash2 className="h-4 w-4" />
            삭제
          </button>
          <div className="flex gap-2">
            {!editing ? (
              <>
                <button className="btn btn-secondary" onClick={onClose}>
                  닫기
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setEditing(true)}
                  disabled={loading}
                >
                  수정하기
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditing(false);
                    setNewPassword("");
                    if (data) setSports(data.sports);
                  }}
                  disabled={saving}
                >
                  취소
                </button>
                <button
                  className="btn btn-success"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save className="h-4 w-4" />
                  {saving ? "저장 중..." : "저장"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
