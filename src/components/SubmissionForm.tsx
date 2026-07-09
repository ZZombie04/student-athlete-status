"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Save,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  REGIONS,
  SCHOOL_LEVELS,
  SPORTS,
  GRADE_LABELS,
  type SchoolLevel,
} from "@/lib/constants";
import { normalizeSchoolName, schoolLevelLabel } from "@/lib/school-name";
import type { SportEntryInput, SubmissionPublic } from "@/lib/types";

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

function num(v: string): number {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

interface Props {
  mode: "create" | "edit";
  initial?: SubmissionPublic | null;
  editPassword?: string;
  onSuccess?: () => void;
}

export default function SubmissionForm({
  mode,
  initial,
  editPassword,
  onSuccess,
}: Props) {
  const [region, setRegion] = useState(initial?.region || "");
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel | "">(
    initial?.schoolLevel || ""
  );
  const [schoolNameRaw, setSchoolNameRaw] = useState(
    initial?.schoolName || ""
  );
  const [password, setPassword] = useState(editPassword || "");
  const [sports, setSports] = useState<SportEntryInput[]>(
    initial?.sports?.length ? initial.sports : [emptySport()]
  );
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const grades = useMemo(() => {
    if (!schoolLevel) return ["학년1", "학년2", "학년3"] as [string, string, string];
    return GRADE_LABELS[schoolLevel];
  }, [schoolLevel]);

  const normalizedName = useMemo(() => {
    if (!schoolLevel || !schoolNameRaw.trim()) return "";
    return normalizeSchoolName(schoolNameRaw, schoolLevel as SchoolLevel);
  }, [schoolNameRaw, schoolLevel]);

  useEffect(() => {
    if (initial) {
      setRegion(initial.region);
      setSchoolLevel(initial.schoolLevel);
      setSchoolNameRaw(initial.schoolName);
      setSports(initial.sports.length ? initial.sports : [emptySport()]);
    }
  }, [initial]);

  function updateSport(index: number, patch: Partial<SportEntryInput>) {
    setSports((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  }

  function addRow() {
    setSports((prev) => [...prev, emptySport()]);
  }

  function removeRow(index: number) {
    if (sports.length <= 1) {
      toast.error("종목은 최소 1개 이상이어야 합니다.");
      return;
    }
    setSports((prev) => prev.filter((_, i) => i !== index));
  }

  function validate(): string | null {
    if (!region) return "교육지원청을 선택해 주세요.";
    if (!schoolLevel) return "학교급을 선택해 주세요.";
    if (!schoolNameRaw.trim()) return "학교명을 입력해 주세요.";
    if (mode === "create" && !/^\d{4}$/.test(password)) {
      return "임시비밀번호 숫자 4자리를 입력해 주세요.";
    }
    if (mode === "edit" && !editPassword && !/^\d{4}$/.test(password)) {
      return "임시비밀번호를 확인해 주세요.";
    }
    for (let i = 0; i < sports.length; i++) {
      const s = sports[i];
      if (!s.sport) return `${i + 1}번째 줄의 종목을 선택해 주세요.`;
    }
    const names = sports.map((s) => s.sport);
    if (new Set(names).size !== names.length) {
      return "중복된 종목이 있습니다. 종목별로 한 줄만 입력해 주세요.";
    }
    return null;
  }

  function handleSaveClick() {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setShowConfirm(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      if (mode === "create") {
        const res = await fetch("/api/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            region,
            schoolLevel,
            schoolName: schoolNameRaw,
            password,
            sports,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error || "제출에 실패했습니다.", {
            duration: 5000,
            icon: <AlertCircle className="h-4 w-4" />,
          });
          return;
        }
        toast.success("제출이 완료되었습니다!", {
          description: `${json.data.schoolName} 데이터가 저장되었습니다.`,
          icon: <CheckCircle2 className="h-4 w-4" />,
        });
        setShowConfirm(false);
        onSuccess?.();
        // reset
        setSports([emptySport()]);
        setSchoolNameRaw("");
        setPassword("");
      } else {
        if (!initial?.id) return;
        const res = await fetch(`/api/submissions/${initial.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: editPassword || password,
            sports,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error || "수정에 실패했습니다.");
          return;
        }
        toast.success("수정 내용이 제출되었습니다!", {
          description: `${json.data.schoolName} 데이터가 업데이트되었습니다.`,
        });
        setShowConfirm(false);
        onSuccess?.();
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const isLockedMeta = mode === "edit";

  return (
    <div className="space-y-6">
      {/* Step 1: Meta */}
      <section className="card p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            1
          </span>
          <h2 className="text-lg font-bold text-slate-900">학교 정보</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">교육지원청 *</label>
            <select
              className="select"
              value={region}
              disabled={isLockedMeta}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option value="">선택하세요 (25개)</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">학교급 *</label>
            <select
              className="select"
              value={schoolLevel}
              disabled={isLockedMeta}
              onChange={(e) =>
                setSchoolLevel(e.target.value as SchoolLevel | "")
              }
            >
              <option value="">선택하세요</option>
              {SCHOOL_LEVELS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">학교명 *</label>
            <input
              className="input"
              placeholder="학교명을 입력하세요"
              value={schoolNameRaw}
              disabled={isLockedMeta}
              onChange={(e) => setSchoolNameRaw(e.target.value)}
              onBlur={() => {
                if (schoolLevel && schoolNameRaw.trim()) {
                  setSchoolNameRaw(
                    normalizeSchoolName(
                      schoolNameRaw,
                      schoolLevel as SchoolLevel
                    )
                  );
                }
              }}
            />
            {normalizedName && normalizedName !== schoolNameRaw.trim() && (
              <p className="mt-1.5 text-xs text-blue-600">
                자동완성: <strong>{normalizedName}</strong>
              </p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              약칭 입력 시 자동 변환됩니다. 특수학교(~학교)는 그대로 유지됩니다.
            </p>
          </div>

          {mode === "create" && (
            <div>
              <label className="label">임시비밀번호 (숫자 4자리) *</label>
              <input
                className="input tracking-[0.35em] font-mono text-center text-lg"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
              />
              <p className="mt-1 text-xs text-slate-400">
                이후 조회·수정 시 사용합니다. 안전한 곳에 기록해 두세요.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Step 2: Sports */}
      <section className="card p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              2
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              종목별 현황 입력
            </h2>
            <span className="badge badge-slate">{sports.length}개 종목</span>
          </div>
          <button type="button" className="btn btn-secondary" onClick={addRow}>
            <Plus className="h-4 w-4" />
            줄 추가하기
          </button>
        </div>

        <div className="space-y-4">
          {sports.map((row, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50/80 to-white p-4 sm:p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="badge badge-blue">{idx + 1}</span>
                  <span className="text-sm font-semibold text-slate-700">
                    종목 행
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-danger !py-1.5 !px-2.5 text-xs"
                  onClick={() => removeRow(idx)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  줄 삭제
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="label">종목 *</label>
                  <select
                    className="select"
                    value={row.sport}
                    onChange={(e) =>
                      updateSport(idx, { sport: e.target.value })
                    }
                  >
                    <option value="">종목 선택 (55개)</option>
                    {SPORTS.map((sp) => (
                      <option
                        key={sp}
                        value={sp}
                        disabled={
                          sports.some((s, i) => i !== idx && s.sport === sp)
                        }
                      >
                        {sp}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">전체 학생선수 수</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={row.totalAthletes}
                    onChange={(e) =>
                      updateSport(idx, {
                        totalAthletes: num(e.target.value),
                      })
                    }
                  />
                </div>

                <div>
                  <label className="label">비고</label>
                  <input
                    className="input"
                    placeholder="예: 기초학력프로그램 미이수"
                    value={row.note}
                    onChange={(e) =>
                      updateSport(idx, { note: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* 3 metric groups */}
              <div className="mt-4 grid gap-3 md:grid-cols-1 xl:grid-cols-3">
                <MetricGroup
                  title="학년별 최저학력기준 미도달 학생선수 수"
                  grades={grades}
                  values={[row.failG1, row.failG2, row.failG3]}
                  onChange={(g1, g2, g3) =>
                    updateSport(idx, {
                      failG1: g1,
                      failG2: g2,
                      failG3: g3,
                    })
                  }
                  color="amber"
                />
                <MetricGroup
                  title="기초학력프로그램 이수 학생선수 수"
                  grades={grades}
                  values={[row.completeG1, row.completeG2, row.completeG3]}
                  onChange={(g1, g2, g3) =>
                    updateSport(idx, {
                      completeG1: g1,
                      completeG2: g2,
                      completeG3: g3,
                    })
                  }
                  color="green"
                />
                <MetricGroup
                  title="최저학력에 미도달한 학생선수 중 기초학력보장법에 의거한 기초학력 미달 학생선수 수"
                  grades={grades}
                  values={[
                    row.basicFailG1,
                    row.basicFailG2,
                    row.basicFailG3,
                  ]}
                  onChange={(g1, g2, g3) =>
                    updateSport(idx, {
                      basicFailG1: g1,
                      basicFailG2: g2,
                      basicFailG3: g3,
                    })
                  }
                  color="rose"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          className="btn btn-primary min-w-[160px]"
          onClick={handleSaveClick}
        >
          <Save className="h-4 w-4" />
          저장하기
        </button>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="modal-backdrop" role="dialog" aria-modal>
          <div className="modal-panel !max-w-3xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  최종 입력 내용 확인
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  학년별 입력값을 확인한 후 제출하기를 눌러 주세요.
                </p>
              </div>
              <button
                className="btn btn-ghost !p-2"
                onClick={() => setShowConfirm(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="grid gap-2 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <Info label="교육지원청" value={region} />
                <Info
                  label="학교급"
                  value={
                    schoolLevel
                      ? schoolLevelLabel(schoolLevel as SchoolLevel)
                      : "-"
                  }
                />
                <Info
                  label="학교명"
                  value={normalizedName || schoolNameRaw || "-"}
                />
                {mode === "create" && (
                  <Info
                    label="임시비밀번호"
                    value={
                      "•".repeat(password.length) + ` (${password.length}자리)`
                    }
                  />
                )}
              </div>

              <div className="space-y-4">
                {sports.map((s, i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-xl border border-slate-200"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="font-bold text-slate-900">
                        <span className="mr-2 badge badge-blue">{i + 1}</span>
                        {s.sport || "종목 미선택"}
                      </div>
                      <div className="text-sm text-slate-600">
                        전체 학생선수{" "}
                        <strong className="text-slate-900">
                          {s.totalAthletes}
                        </strong>
                        명
                        {s.note ? (
                          <span className="ml-2 text-slate-400">
                            · 비고: {s.note}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="overflow-x-auto p-3">
                      <table className="data-table text-xs sm:text-sm">
                        <thead>
                          <tr>
                            <th className="!py-2">구분</th>
                            <th className="!py-2 text-center">{grades[0]}</th>
                            <th className="!py-2 text-center">{grades[1]}</th>
                            <th className="!py-2 text-center">{grades[2]}</th>
                            <th className="!py-2 text-center">합계</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="font-medium text-amber-800">
                              학년별 최저학력기준 미도달 학생선수 수
                            </td>
                            <td className="text-center tabular-nums">
                              {s.failG1}
                            </td>
                            <td className="text-center tabular-nums">
                              {s.failG2}
                            </td>
                            <td className="text-center tabular-nums">
                              {s.failG3}
                            </td>
                            <td className="text-center font-bold tabular-nums">
                              {s.failG1 + s.failG2 + s.failG3}
                            </td>
                          </tr>
                          <tr>
                            <td className="font-medium text-emerald-800">
                              기초학력프로그램 이수 학생선수 수
                            </td>
                            <td className="text-center tabular-nums">
                              {s.completeG1}
                            </td>
                            <td className="text-center tabular-nums">
                              {s.completeG2}
                            </td>
                            <td className="text-center tabular-nums">
                              {s.completeG3}
                            </td>
                            <td className="text-center font-bold tabular-nums">
                              {s.completeG1 + s.completeG2 + s.completeG3}
                            </td>
                          </tr>
                          <tr>
                            <td className="font-medium text-rose-800">
                              최저학력에 미도달한 학생선수 중 기초학력보장법에
                              의거한 기초학력 미달 학생선수 수
                            </td>
                            <td className="text-center tabular-nums">
                              {s.basicFailG1}
                            </td>
                            <td className="text-center tabular-nums">
                              {s.basicFailG2}
                            </td>
                            <td className="text-center tabular-nums">
                              {s.basicFailG3}
                            </td>
                            <td className="text-center font-bold tabular-nums">
                              {s.basicFailG1 +
                                s.basicFailG2 +
                                s.basicFailG3}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                className="btn btn-secondary"
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
              >
                수정하기
              </button>
              <button
                className="btn btn-success min-w-[140px]"
                onClick={handleSubmit}
                disabled={submitting}
              >
                <Send className="h-4 w-4" />
                {submitting ? "제출 중..." : "제출하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function MetricGroup({
  title,
  grades,
  values,
  onChange,
  color,
}: {
  title: string;
  grades: [string, string, string];
  values: [number, number, number] | number[];
  onChange: (g1: number, g2: number, g3: number) => void;
  color: "amber" | "green" | "rose";
}) {
  const border =
    color === "amber"
      ? "border-amber-200 bg-amber-50/40"
      : color === "green"
        ? "border-emerald-200 bg-emerald-50/40"
        : "border-rose-200 bg-rose-50/40";
  const titleColor =
    color === "amber"
      ? "text-amber-900"
      : color === "green"
        ? "text-emerald-900"
        : "text-rose-900";
  const sum = values[0] + values[1] + values[2];

  return (
    <div className={`rounded-xl border p-3 ${border}`}>
      <div className="mb-2 space-y-1">
        <div className={`text-[11px] font-bold leading-snug ${titleColor}`}>
          {title}
        </div>
        <div className="text-xs text-slate-500">
          합계 <strong className="text-slate-800">{sum}</strong>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">
              {grades[i]}
            </label>
            <input
              className="input !px-2 !py-1.5 text-center"
              type="number"
              min={0}
              value={values[i]}
              onChange={(e) => {
                const next = [...values] as [number, number, number];
                next[i] = num(e.target.value);
                onChange(next[0], next[1], next[2]);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
