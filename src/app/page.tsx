import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import { FilePlus2, Search, Shield } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <section className="relative min-h-[340px] overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/80 to-sky-50/40 px-6 py-12 shadow-xl shadow-slate-200/40 sm:min-h-[380px] sm:px-12 sm:py-16">
          {/* ambient */}
          <div className="pointer-events-none absolute -left-8 top-0 h-40 w-40 rounded-full bg-blue-100/40 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-1/3 h-32 w-32 rounded-full bg-sky-100/30 blur-3xl" />

          {/* 우측 하단 장식 사진 — 가시성 확보 + 가장자리만 소프트 블렌드 */}
          <div
            className="hero-deco pointer-events-none absolute bottom-0 right-0 z-[1] h-[220px] w-[min(58%,340px)] sm:h-[280px] sm:w-[min(50%,420px)] md:h-[300px] md:w-[460px]"
            aria-hidden
          >
            <Image
              src="/hero-deco.png"
              alt=""
              width={800}
              height={533}
              className="h-full w-full object-contain object-right-bottom drop-shadow-sm"
              priority
            />
          </div>

          <div className="relative z-10 max-w-lg pr-2 sm:pr-8">
            <p className="text-sm font-semibold text-blue-700">
              2026학년도 1학기
            </p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
              학생선수 최저학력 기준
              <br />
              기초학력프로그램 이수 현황
            </h1>
            <p className="mt-4 max-w-md text-sm text-slate-500 sm:text-base">
              학교운동부 및 학생선수 운영교 데이터 취합 시스템
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
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
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
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white">
        {icon}
      </div>
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
    </Link>
  );
}
