"use client";

import { useEffect, useState, use } from "react";
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
} from "lucide-react";
import Header from "@/components/Header";
import type { RegionStats } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { schoolLevelLabel } from "@/lib/school-name";
import type { SchoolLevel } from "@/lib/constants";

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

  useEffect(() => {
    const t = sessionStorage.getItem("adminToken");
    if (!t) {
      router.replace("/admin");
      return;
    }
    setToken(t);
    (async () => {
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
    })();
  }, [region, router]);

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
      a.download = `2026_1학기_학생선수_기초학력_${region.replace("교육지원청", "")}통계.xlsx`;
      a.click();
      URL.revokeObjectURL(href);
      toast.success("엑셀 다운로드가 시작되었습니다. (탭4 형식)");
    } catch {
      toast.error("다운로드 오류");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
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
              제출 현황 및 탭4 형식 통계 엑셀 다운로드
            </p>
          </div>
          <button
            className="btn btn-success"
            onClick={downloadExcel}
            disabled={exporting}
          >
            <Download className="h-4 w-4" />
            {exporting ? "생성 중..." : "결과 다운받기 (탭4 형식)"}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MiniKpi
            icon={<School className="h-4 w-4" />}
            label="제출 학교"
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

        <div className="card mt-6 overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-slate-900">제출 학교 목록</h2>
          </div>
          {!stats || stats.submissions.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400">
              아직 이 지원청에 제출된 학교가 없습니다.
            </div>
          ) : (
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
                  {stats.submissions.map((s) => (
                    <tr key={s.id}>
                      <td className="font-medium">{s.schoolName}</td>
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
          )}
        </div>
      </main>
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
