"use client";

import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  School,
  Users,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Header from "@/components/Header";
import AdminSchoolModal from "@/components/AdminSchoolModal";
import type { RegionStats } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { schoolLevelLabel } from "@/lib/school-name";
import type { SchoolLevel } from "@/lib/constants";

const PAGE_SIZE = 10;

export default function RegionDetailPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region: regionParam } = use(params);
  const region = decodeURIComponent(regionParam);
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<RegionStats | null>(null);
  const [exporting, setExporting] = useState(false);
  const [levelFilter, setLevelFilter] = useState<"all" | SchoolLevel>("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function load(t: string) {
    try {
      const res = await fetch(
        `/api/admin/stats?region=${encodeURIComponent(region)}`,
        { headers: { "x-admin-token": t } }
      );
      if (!res.ok) {
        toast.error("데이터를 불러오지 못했습니다.");
        return;
      }
      const json = await res.json();
      setStats(json.data);
    } catch {
      toast.error("네트워크 오류");
    }
  }

  useEffect(() => {
    const t = sessionStorage.getItem("adminToken");
    if (!t) {
      router.replace("/admin");
      return;
    }
    setToken(t);
    load(t);
  }, [region, router]);

  useEffect(() => {
    setPage(1);
  }, [levelFilter]);

  const filtered = useMemo(() => {
    const list = stats?.submissions || [];
    if (levelFilter === "all") return list;
    return list.filter((s) => s.schoolLevel === levelFilter);
  }, [stats, levelFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function downloadExcel() {
    if (!token) return;
    setExporting(true);
    try {
      const res = await fetch(
        `/api/admin/export?region=${encodeURIComponent(region)}`,
        { headers: { "x-admin-token": token } }
      );
      if (!res.ok) {
        toast.error("다운로드 실패");
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      const href = URL.createObjectURL(blob);
      a.href = href;
      const cd = res.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename\*=UTF-8''([^;]+)/i);
      let filename = `2026년 1학기 학생선수 최저학력 기준 기초학력프로그램 이수 현황(${region}).xlsx`;
      if (m?.[1]) {
        try {
          filename = decodeURIComponent(m[1]);
        } catch {
          /* keep fallback */
        }
      }
      a.download = filename;
      a.click();
      URL.revokeObjectURL(href);
      toast.success("엑셀 다운로드가 시작되었습니다.");
    } catch {
      toast.error("다운로드 오류");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/admin"
              className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600"
            >
              <ArrowLeft className="h-4 w-4" />
              대시보드로
            </Link>
            <h1 className="text-2xl font-extrabold text-slate-900">
              {region}
            </h1>
            <p className="text-sm text-slate-500">
              제출 현황 확인 및 통계 엑셀 다운로드
            </p>
          </div>
          <button
            className="btn btn-success"
            onClick={downloadExcel}
            disabled={exporting}
          >
            <Download className="h-4 w-4" />
            {exporting ? "생성 중..." : "결과 다운받기"}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MiniKpi
            icon={<School className="h-4 w-4" />}
            label="제출 건수"
            value={stats?.schoolCount ?? 0}
          />
          <MiniKpi
            icon={<Users className="h-4 w-4" />}
            label="학생선수"
            value={stats?.totalAthletes ?? 0}
          />
          <MiniKpi
            icon={<AlertTriangle className="h-4 w-4" />}
            label="미도달"
            value={stats?.totalFail ?? 0}
          />
          <MiniKpi
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="이수"
            value={stats?.totalComplete ?? 0}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="badge badge-blue">
            초 {stats?.countElementary ?? 0}
          </span>
          <span className="badge badge-green">
            중 {stats?.countMiddle ?? 0}
          </span>
          <span className="badge badge-amber">고 {stats?.countHigh ?? 0}</span>
        </div>

        <div className="card mt-6 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-slate-900">제출 학교 목록</h2>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500">
                학교급
              </label>
              <select
                className="select !w-auto !py-1.5 !text-sm"
                value={levelFilter}
                onChange={(e) =>
                  setLevelFilter(e.target.value as "all" | SchoolLevel)
                }
              >
                <option value="all">전체</option>
                <option value="초">초등학교</option>
                <option value="중">중학교</option>
                <option value="고">고등학교</option>
              </select>
            </div>
          </div>

          {!stats || filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400">
              조건에 맞는 제출 학교가 없습니다.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>학교명</th>
                      <th>학교급</th>
                      <th>종목 수</th>
                      <th>학생선수</th>
                      <th>최초 제출</th>
                      <th>최종 수정</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <button
                            type="button"
                            className="font-medium text-blue-700 hover:underline"
                            onClick={() => setSelectedId(s.id)}
                          >
                            {s.schoolName}
                          </button>
                        </td>
                        <td>
                          <span className="badge badge-blue">
                            {schoolLevelLabel(s.schoolLevel as SchoolLevel)}
                          </span>
                        </td>
                        <td>{s.sportCount}</td>
                        <td>{s.totalAthletes}</td>
                        <td className="text-slate-500 text-xs">
                          {formatDate(s.createdAt)}
                        </td>
                        <td className="text-slate-500 text-xs">
                          {formatDate(s.updatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
                <div className="text-xs text-slate-500">
                  총 {filtered.length}건 · {page}/{totalPages} 페이지
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="btn btn-secondary !py-1.5 !px-2.5 text-xs"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    이전
                  </button>
                  <button
                    className="btn btn-secondary !py-1.5 !px-2.5 text-xs"
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    다음
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {selectedId && token && (
        <AdminSchoolModal
          submissionId={selectedId}
          token={token}
          onClose={() => setSelectedId(null)}
          onChanged={() => token && load(token)}
        />
      )}
    </div>
  );
}

function MiniKpi({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        {icon}
      </div>
      <div>
        <div className="text-lg font-extrabold tabular-nums text-slate-900">
          {value.toLocaleString()}
        </div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}
