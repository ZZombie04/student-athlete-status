import {
  excelFilenameForSchool,
  parseFilenameFromContentDisposition,
} from "@/lib/excel-filename";

/** 클라이언트: 본인 학교 엑셀 다운로드 (비밀번호 인증 필수) */

export async function downloadSchoolExcel(params: {
  id: string;
  password: string;
  schoolName?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/submissions/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: params.id,
        password: params.password,
      }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: j.error || "엑셀 다운로드에 실패했습니다.",
      };
    }

    const blob = await res.blob();
    const fallback = excelFilenameForSchool(params.schoolName || "학교");
    const filename = parseFilenameFromContentDisposition(
      res.headers.get("Content-Disposition"),
      fallback
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { ok: true };
  } catch {
    return { ok: false, error: "네트워크 오류로 다운로드에 실패했습니다." };
  }
}
