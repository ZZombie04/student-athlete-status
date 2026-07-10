import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { findById, findSubmission } from "@/lib/db";
import { exportSchoolWorkbook } from "@/lib/excel";
import { normalizeSchoolName } from "@/lib/school-name";
import type { SchoolLevel } from "@/lib/constants";
import {
  enforceRateLimit,
  safeError,
  withSecurityHeaders,
} from "@/lib/security";

/**
 * 학교 본인 엑셀 다운로드
 * - id + password 필수 검증 (IDOR 방지)
 * - 또는 region+schoolLevel+schoolName+password
 * - 본인 제출 1건만 엑셀에 포함 (다른 학교 유출 불가)
 */
const schema = z.object({
  id: z.string().uuid().optional(),
  password: z.string().regex(/^\d{4}$/),
  region: z.string().min(1).optional(),
  schoolLevel: z.enum(["초", "중", "고"]).optional(),
  schoolName: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, "school-export", 15, 60_000);
  if (limited) return withSecurityHeaders(limited);

  try {
    const json = await req.json().catch(() => null);
    if (!json || typeof json !== "object") {
      return withSecurityHeaders(
        safeError("요청 형식이 올바르지 않습니다.", 400)
      );
    }

    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return withSecurityHeaders(
        safeError("인증 정보가 올바르지 않습니다.", 400)
      );
    }

    const { id, password, region, schoolLevel, schoolName } = parsed.data;

    let sub = null as Awaited<ReturnType<typeof findById>>;

    if (id) {
      sub = await findById(id);
    } else if (region && schoolLevel && schoolName) {
      const name = normalizeSchoolName(
        schoolName,
        schoolLevel as SchoolLevel
      );
      sub = await findSubmission(region, schoolLevel, name);
    } else {
      return withSecurityHeaders(
        safeError("인증 정보가 올바르지 않습니다.", 400)
      );
    }

    // 존재하지 않음 / 비번 오류를 동일 메시지로 (정보 유출 최소화)
    if (!sub) {
      return withSecurityHeaders(
        safeError("다운로드 권한이 없거나 기록이 없습니다.", 403)
      );
    }

    const ok = await bcrypt.compare(password, sub.passwordHash);
    if (!ok) {
      return withSecurityHeaders(
        safeError("다운로드 권한이 없거나 기록이 없습니다.", 403)
      );
    }

    // 이중 검증: 요청에 schoolName이 있으면 반드시 일치
    if (schoolName) {
      const name = normalizeSchoolName(
        schoolName,
        (schoolLevel || sub.schoolLevel) as SchoolLevel
      );
      if (name !== sub.schoolName) {
        return withSecurityHeaders(
          safeError("다운로드 권한이 없거나 기록이 없습니다.", 403)
        );
      }
    }
    if (region && region !== sub.region) {
      return withSecurityHeaders(
        safeError("다운로드 권한이 없거나 기록이 없습니다.", 403)
      );
    }
    if (schoolLevel && schoolLevel !== sub.schoolLevel) {
      return withSecurityHeaders(
        safeError("다운로드 권한이 없거나 기록이 없습니다.", 403)
      );
    }

    // 본인 제출 1건만 엑셀 생성
    const buffer = await exportSchoolWorkbook(sub);
    const {
      excelFilenameForSchool,
      contentDispositionAttachment,
    } = await import("@/lib/excel-filename");
    const filename = excelFilenameForSchool(sub.schoolName);

    const res = new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": contentDispositionAttachment(filename),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    });
    return withSecurityHeaders(res);
  } catch (e) {
    return withSecurityHeaders(
      safeError("엑셀 생성 중 오류가 발생했습니다.", 500, e)
    );
  }
}

// GET 차단 (실수로 쿼리스트링에 비밀번호 노출 방지)
export async function GET() {
  return withSecurityHeaders(
    safeError("Method Not Allowed", 405)
  );
}
