"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";

export default function Header() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 group min-w-0">
          <Image
            src="/logo.png"
            alt="경기교육 대전환"
            width={286}
            height={108}
            className="h-8 w-auto sm:h-9 object-contain"
            priority
          />
          <div className="leading-tight min-w-0 hidden xs:block sm:block">
            <div className="truncate text-sm font-bold text-slate-900 sm:text-base">
              학생선수 기초학력 현황
            </div>
            <div className="truncate text-[11px] text-slate-500 sm:text-xs">
              경기도교육청 · 2026학년도 1학기
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2 shrink-0">
          {!isAdmin && (
            <>
              <Link
                href="/"
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  pathname === "/"
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                홈
              </Link>
              <Link
                href="/submit"
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  pathname === "/submit"
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                신규 제출
              </Link>
              <Link
                href="/view"
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  pathname === "/view"
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                입력 확인
              </Link>
            </>
          )}
          <Link
            href="/admin"
            className={`ml-1 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isAdmin
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">관리자</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
