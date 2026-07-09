import Link from "next/link";
import Header from "@/components/Header";
import { FilePlus2, Search, Shield } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white px-6 py-12 shadow-xl shadow-slate-200/50 sm:px-12 sm:py-16">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-blue-100/60 blur-3xl" />
          <div className="absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-sky-100/70 blur-3xl" />

          <div className="relative">
            <p className="text-sm font-semibold text-blue-700">
              2026학년도 1학기
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl leading-tight">
              학생선수 최저학력 기준
              <br />
              기초학력프로그램 이수 현황
            </h1>
            <p className="mt-4 max-w-xl text-sm text-slate-500 sm:text-base">
              경기도교육청 학교 제출 · 교육지원청 취합 시스템
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/submit"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
              >
                <FilePlus2 className="h-4 w-4" />
                신규 제출하기
              </Link>
              <Link
                href="/view"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <Search className="h-4 w-4" />
                입력 내용 확인하기
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <HomeCard
            href="/submit"
            icon={<FilePlus2 className="h-5 w-5" />}
            title="신규 제출"
            desc="학교 정보와 종목별 현황을 입력·제출합니다."
          />
          <HomeCard
            href="/view"
            icon={<Search className="h-5 w-5" />}
            title="입력 확인·수정"
            desc="제출한 내용을 조회하고 수정할 수 있습니다."
          />
          <HomeCard
            href="/admin"
            icon={<Shield className="h-5 w-5" />}
            title="관리자"
            desc="제출 현황 확인 및 취합 엑셀 다운로드"
          />
        </section>
      </main>
    </div>
  );
}

function HomeCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="card group block p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition">
        {icon}
      </div>
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
    </Link>
  );
}
