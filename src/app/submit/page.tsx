"use client";

import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import SubmissionForm from "@/components/SubmissionForm";

export default function SubmitPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">
            신규 현황 제출
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            작성 안내를 확인한 뒤 교육지원청·학교급·학교명과 종목별 현황을
            입력해 주세요.
          </p>
        </div>
        <SubmissionForm
          mode="create"
          onSuccess={() => {
            setTimeout(() => router.push("/"), 1200);
          }}
        />
      </main>
    </div>
  );
}
