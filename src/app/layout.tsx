import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "학생선수 기초학력프로그램 이수 현황 | 경기도교육청",
  description:
    "2026학년도 1학기 학생선수 최저학력 기준 기초학력프로그램 이수 현황 제출 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: "Pretendard, sans-serif",
              borderRadius: "12px",
            },
          }}
        />
      </body>
    </html>
  );
}
