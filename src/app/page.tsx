import Link from "next/link";
import Header from "@/components/Header";
import {
  FilePlus2,
  Search,
  Shield,
  ClipboardList,
  School,
  Download,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 px-6 py-12 text-white shadow-2xl shadow-blue-500/25 sm:px-12 sm:py-16">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 left-20 h-48 w-48 rounded-full bg-sky-300/20 blur-2xl" />
          <div className="relative max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <ClipboardList className="h-3.5 w-3.5" />
              2026학년도 1학기 · 경기도교육청
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl leading-tight">
              학생선수 최저학력 기준
              <br />
              기초학력프로그램 이수 현황
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-blue-50 sm:text-base">
              학교에서 종목별 현황을 입력·제출하면, 교육지원청에서는 통계
              서식(탭4)과 동일한 엑셀로 취합 데이터를 내려받을 수 있습니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/submit"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-lg transition hover:bg-blue-50"
              >
                <FilePlus2 className="h-4 w-4" />
                신규 제출하기
              </Link>
              <Link
                href="/view"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
              >
                <Search className="h-4 w-4" />
                입력 내용 확인하기
              </Link>
            </div>
          </div>
        </section>

        {/* Cards */}
        <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            href="/submit"
            icon={<FilePlus2 className="h-6 w-6" />}
            title="신규 제출"
            desc="교육지원청·학교급·학교명·종목별 현황을 입력하고 제출합니다. 등록 시 4자리 임시비밀번호를 설정합니다."
            accent="from-blue-500 to-blue-600"
          />
          <ActionCard
            href="/view"
            icon={<Search className="h-6 w-6" />}
            title="입력 내용 확인·수정"
            desc="지역·학교급·학교명·임시비밀번호로 로그인하여 제출한 내용을 확인하고 수정·재제출할 수 있습니다."
            accent="from-sky-500 to-cyan-600"
          />
          <ActionCard
            href="/admin"
            icon={<Shield className="h-6 w-6" />}
            title="관리자 (교육지원청)"
            desc="제출 현황 대시보드 확인 및 지역별·전체 취합 엑셀(탭4 형식) 다운로드를 제공합니다."
            accent="from-slate-700 to-slate-900"
          />
        </section>

        {/* Guide */}
        <section className="card mt-10 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900">이용 안내</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Step
              n={1}
              title="학교 정보 입력"
              desc="25개 교육지원청 선택 → 학교급 → 학교명(약칭 자동완성) → 4자리 임시비번"
            />
            <Step
              n={2}
              title="종목별 수치 입력"
              desc="55개 종목 중 선택, 줄 추가/삭제로 복수 종목 입력. 학년별 미도달·이수·기초미달 입력"
            />
            <Step
              n={3}
              title="확인 후 제출"
              desc="저장하기 → 최종 확인 창 → 제출하기. 관리자는 탭4 형식 엑셀로 취합 다운로드"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
              <School className="h-3.5 w-3.5" /> 초4–고3 학생선수 대상
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
              <Download className="h-3.5 w-3.5" /> 엑셀 서식 탭4 완벽 호환
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
              동일 학교명 중복 제출 방지
            </span>
          </div>
        </section>

        <footer className="mt-12 pb-8 text-center text-xs text-slate-400">
          © 2026 경기도교육청 · 학생선수 기초학력프로그램 이수 현황 시스템
        </footer>
      </main>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  desc,
  accent,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="card group block p-6 transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-lg`}
      >
        {icon}
      </div>
      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{desc}</p>
    </Link>
  );
}

function Step({
  n,
  title,
  desc,
}: {
  n: number;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
        {n}
      </div>
      <div className="font-semibold text-slate-800">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{desc}</p>
    </div>
  );
}
