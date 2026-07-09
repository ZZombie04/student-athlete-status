import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAndGet } from "@/lib/db";
import { normalizeSchoolName } from "@/lib/school-name";
import type { SchoolLevel } from "@/lib/constants";
import {
  enforceRateLimit,
  withSecurityHeaders,
  safeError,
} from "@/lib/security";

const schema = z.object({
  region: z.string().min(1).max(100),
  schoolLevel: z.enum(["초", "중", "고"]),
  schoolName: z.string().min(1).max(100),
  password: z.string().regex(/^\d{4}$/),
});

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, "school-login", 20, 60_000);
  if (limited) return withSecurityHeaders(limited);

  try {
    const json = await req.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return withSecurityHeaders(
        safeError(
          "입력값을 확인해 주세요. (지역·학교급·학교명·4자리 비밀번호)",
          400
        )
      );
    }

    const schoolName = normalizeSchoolName(
      parsed.data.schoolName,
      parsed.data.schoolLevel as SchoolLevel
    );

    const data = await verifyAndGet({
      region: parsed.data.region,
      schoolLevel: parsed.data.schoolLevel,
      schoolName,
      password: parsed.data.password,
    });

    // 비밀번호는 응답에 절대 포함하지 않음
    return withSecurityHeaders(
      NextResponse.json({ success: true, data })
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "오류";
    if (msg === "NOT_FOUND" || msg === "INVALID_PASSWORD") {
      // 존재 여부·비번 오류 구분 완화 (열거 공격 완화)
      return withSecurityHeaders(
        safeError(
          "일치하는 제출 기록이 없거나 비밀번호가 올바르지 않습니다.",
          401
        )
      );
    }
    return withSecurityHeaders(safeError("서버 오류", 500, e));
  }
}
