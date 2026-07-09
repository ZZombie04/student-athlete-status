"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Shield,
  LogIn,
  LayoutDashboard,
  Download,
  School,
  Users,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  TrendingUp,
  LogOut,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Header from "@/components/Header";
import { REGIONS } from "@/lib/constants";
import type { DashboardStats } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

const PIE_COLORS = ["#2563eb", "#0ea5e9", "#8b5cf6"];

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const t = sessionStorage.getItem("adminToken");
    if (t) {
      setToken(t);
      loadStats(t);
    }
  }, []);

  async function loadStats(t: string) {
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { "x-admin-token": t },
      });
      if (!res.ok) {
        sessionStorage.removeItem("adminToken");
        setToken(null);
        return;
      }
      const json = await res.json();
      setStats(json.data);
    } catch {
      toast.error("통계를 불러오지 못했습니다.");
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "로그인 실패");
        return;
      }
      sessionStorage.setItem("adminToken", json.token);
      setToken(json.token);
      toast.success("관리자 로그인 성공");
      await loadStats(json.token);
    } catch {
      toast.error("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    sessionStorage.removeItem("adminToken");
    setToken(null);
    setStats(null);
    router.refresh();
  }

  async function downloadExcel(region?: string) {
    if (!token) return;
    setExporting(true);
    try {
      const url = region
        ? `/api/admin/export?region=${encodeURIComponent(region)}`
        : "/api/admin/export";
      const res = await fetch(url, {
        headers: { "x-admin-token": token },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error || "다운로드 실패");
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      const href = URL.createObjectURL(blob);
      a.href = href;
      const short = region ? region.replace("교육지원청", "") : "경기도전체";
      a.download = `2026_1학기_학생선수_기초학력_${short}통계.xlsx`;
      a.click();
      URL.revokeObjectURL(href);
      toast.success("엑셀 다운로드가 시작되었습니다.");
    } catch {
      toast.error("다운로드 중 오류");
    } finally {
      setExporting(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto flex max-w-md flex-col px-4 py-16">
          <form onSubmit={handleLogin} className="card p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
                <Shield className="h-7 w-7" />
              </div>
              <h1 className="text-xl font-extrabold text-slate-900">
                관리자 로그인
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                담당 장학사 전용 메뉴입니다
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">아이디</label>
                <input
                  className="input"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="관리자"
                  required
                />
              </div>
              <div>
                <label className="label">비밀번호</label>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••"
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading}
              >
                <LogIn className="h-4 w-4" />
                {loading ? "확인 중..." : "로그인"}
              </button>
            </div>
          </form>
        </main>
      </div>
    );
  }

  const levelChart = stats
    ? [
        { name: "초", value: stats.bySchoolLevel["초"] || 0 },
        { name: "중", value: stats.bySchoolLevel["중"] || 0 },
        { name: "고", value: stats.bySchoolLevel["고"] || 0 },
      ]
    : [];

  const regionChart =
    stats?.byRegion
      .filter((r) => r.submissionCount > 0)
      .map((r) => ({
        name: r.region.replace("교육지원청", ""),
        count: r.submissionCount,
        athletes: r.totalAthletes,
      })) || [];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <LayoutDashboard className="h-4 w-4" />
              관리자 대시보드
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              제출 현황 종합
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-success"
              onClick={() => downloadExcel()}
              disabled={exporting}
            >
              <Download className="h-4 w-4" />
              {exporting ? "생성 중..." : "전체 취합 엑셀 다운"}
            </button>
            <button className="btn btn-secondary" onClick={logout}>
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            icon={<School className="h-5 w-5" />}
            label="제출 학교 수"
            value={stats?.totalSchools ?? 0}
            color="blue"
          />
          <Kpi
            icon={<Users className="h-5 w-5" />}
            label="전체 학생선수"
            value={stats?.totalAthletes ?? 0}
            color="sky"
          />
          <Kpi
            icon={<AlertTriangle className="h-5 w-5" />}
            label="최저학력 미도달"
            value={stats?.totalFail ?? 0}
            color="amber"
          />
          <Kpi
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="기초학력 이수"
            value={stats?.totalComplete ?? 0}
            color="green"
          />
        </div>

        {/* Charts */}
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <div className="card p-5 lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <h2 className="font-bold text-slate-900">지원청별 제출 현황</h2>
            </div>
            <div className="h-64">
              {regionChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        fontFamily: "Pretendard",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      name="제출 학교"
                      fill="#2563eb"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-sky-600" />
              <h2 className="font-bold text-slate-900">학교급 분포</h2>
            </div>
            <div className="h-64">
              {levelChart.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={levelChart}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name} ${value}`}
                    >
                      {levelChart.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </div>
          </div>
        </div>

        {/* Top sports */}
        {stats && stats.bySportTop.length > 0 && (
          <div className="card mt-5 p-5">
            <h2 className="mb-3 font-bold text-slate-900">종목별 학생선수 TOP 10</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.bySportTop} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="sport"
                    width={110}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar dataKey="athletes" name="학생선수" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Regions grid */}
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            교육지원청별 현황 (25개)
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {REGIONS.map((region) => {
              const r = stats?.byRegion.find((x) => x.region === region);
              const count = r?.submissionCount || 0;
              return (
                <div
                  key={region}
                  className="card group flex flex-col p-4 transition hover:border-blue-200 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-blue-600" />
                      <div className="text-sm font-bold text-slate-800 leading-snug">
                        {region.replace("교육지원청", "")}
                      </div>
                    </div>
                    <span
                      className={`badge ${count > 0 ? "badge-green" : "badge-slate"}`}
                    >
                      {count}교
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-500">
                    <span>학생선수 {r?.totalAthletes ?? 0}</span>
                    <span>미도달 {r?.totalFail ?? 0}</span>
                    <span className="col-span-2 truncate">
                      최근{" "}
                      {r?.lastSubmittedAt
                        ? formatDate(r.lastSubmittedAt)
                        : "—"}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/admin/region/${encodeURIComponent(region)}`}
                      className="btn btn-secondary !py-1.5 !px-2.5 flex-1 text-xs"
                    >
                      상세
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      className="btn btn-primary !py-1.5 !px-2.5 text-xs"
                      onClick={() => downloadExcel(region)}
                      disabled={exporting}
                      title="탭4 형식 엑셀 다운로드"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent */}
        {stats && stats.recentSubmissions.length > 0 && (
          <section className="card mt-8 overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-slate-900">최근 제출·수정</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>학교명</th>
                    <th>학교급</th>
                    <th>교육지원청</th>
                    <th>저장 시각</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentSubmissions.map((s) => (
                    <tr key={s.id}>
                      <td className="font-medium">{s.schoolName}</td>
                      <td>
                        <span className="badge badge-blue">{s.schoolLevel}</span>
                      </td>
                      <td>{s.region.replace("교육지원청", "")}</td>
                      <td className="text-slate-500">
                        {formatDate(s.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "blue" | "sky" | "amber" | "green";
}) {
  const map = {
    blue: "from-blue-500 to-blue-600",
    sky: "from-sky-500 to-cyan-600",
    amber: "from-amber-500 to-orange-500",
    green: "from-emerald-500 to-green-600",
  };
  return (
    <div className="stat-card card p-5">
      <div className="flex items-center justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${map[color]} text-white shadow`}
        >
          {icon}
        </div>
      </div>
      <div className="mt-3 text-2xl font-extrabold text-slate-900 tabular-nums">
        {value.toLocaleString()}
      </div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-400">
      아직 제출된 데이터가 없습니다
    </div>
  );
}
