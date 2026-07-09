"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LogIn, ArrowLeft, Download } from "lucide-react";
import Header from "@/components/Header";
import SubmissionForm from "@/components/SubmissionForm";
import { REGIONS, SCHOOL_LEVELS, type SchoolLevel } from "@/lib/constants";
import type { SubmissionPublic } from "@/lib/types";
import { downloadSchoolExcel } from "@/lib/download-school-excel";

export default function ViewPage() {
  const [region, setRegion] = useState("");
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel | "">("");
  const [schoolName, setSchoolName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SubmissionPublic | null>(null);
  const [authPassword, setAuthPassword] = useState("");
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadExcel() {
    if (!data?.id || !authPassword) {
      toast.error("로그인 후 이용할 수 있습니다.");
      return;
    }
    setDownloading(true);
    try {
      const result = await downloadSchoolExcel({
        id: data.id,
        password: authPassword,
        schoolName: data.schoolName,
      });
      if (result.ok) {
        toast.success("본교 엑셀 파일이 다운로드되었습니다.");
      } else {
        toast.error(result.error);
      }
    } finally {
      setDownloading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!region || !schoolLevel || !schoolName.trim() || !/^\d{4}$/.test(password)) {
      toast.error("지역·학교급·학교명·4자리 임시비밀번호를 모두 입력해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/submissions/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region,
          schoolLevel,
          schoolName,
          password,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "로그인에 실패했습니다.");
        return;
      }
      setData(json.data);
      setAuthPassword(password);
      toast.success("입력 내용을 불러왔습니다.");
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setData(null);
    setAuthPassword("");
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">
            입력 내용 확인·수정
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            제출 시 설정한 교육지원청·학교급·학교명·임시비밀번호로 로그인하세요.
          </p>
        </div>

        {!data ? (
          <form onSubmit={handleLogin} className="card mx-auto max-w-lg p-6 sm:p-8">
            <div className="mb-5 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <LogIn className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">학교 로그인</h2>
                <p className="text-xs text-slate-500">본인이 제출한 기록만 조회할 수 있습니다</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">교육지원청</label>
                <select
                  className="select"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  required
                >
                  <option value="">선택</option>
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">학교급</label>
                <select
                  className="select"
                  value={schoolLevel}
                  onChange={(e) =>
                    setSchoolLevel(e.target.value as SchoolLevel | "")
                  }
                  required
                >
                  <option value="">선택</option>
                  {SCHOOL_LEVELS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">학교명</label>
                <input
                  className="input"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="학교명을 입력하세요"
                  required
                />
              </div>
              <div>
                <label className="label">임시비밀번호 (4자리)</label>
                <input
                  className="input tracking-[0.35em] font-mono text-center text-lg"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
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
                {loading ? "확인 중..." : "입력 내용 불러오기"}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <button className="btn btn-secondary" onClick={handleLogout}>
                <ArrowLeft className="h-4 w-4" />
                다른 학교 조회
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm text-slate-500">
                  <span className="font-semibold text-slate-800">
                    {data.schoolName}
                  </span>
                  {" · "}
                  최근 저장 {new Date(data.updatedAt).toLocaleString("ko-KR")}
                </div>
                <button
                  type="button"
                  className="btn btn-success !py-2 text-sm"
                  onClick={handleDownloadExcel}
                  disabled={downloading}
                >
                  <Download className="h-4 w-4" />
                  {downloading ? "생성 중..." : "본교 엑셀 다운"}
                </button>
              </div>
            </div>
            <SubmissionForm
              mode="edit"
              initial={data}
              editPassword={authPassword}
              onSuccess={() => {
                toast.message("수정이 반영되었습니다.");
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
