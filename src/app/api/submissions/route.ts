import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSubmission } from "@/lib/db";
import { normalizeSchoolName } from "@/lib/school-name";
import { REGIONS, SCHOOL_LEVELS, SPORTS } from "@/lib/constants";
import type { SchoolLevel } from "@/lib/constants";
import {
  enforceRateLimit,
  withSecurityHeaders,
  safeError,
} from "@/lib/security";

const sportSchema = z.object({
  sport: z.string().min(1),
  totalAthletes: z.number().int().min(0),
  failG1: z.number().int().min(0),
  failG2: z.number().int().min(0),
  failG3: z.number().int().min(0),
  completeG1: z.number().int().min(0),
  completeG2: z.number().int().min(0),
  completeG3: z.number().int().min(0),
  basicFailG1: z.number().int().min(0),
  basicFailG2: z.number().int().min(0),
  basicFailG3: z.number().int().min(0),
  note: z.string().optional().default(""),
});

const bodySchema = z.object({
  region: z.string().min(1),
  schoolLevel: z.enum(["초", "중", "고"]),
  schoolName: z.string().min(1),
  password: z.string().regex(/^\d{4}$/, "임시비밀번호는 숫자 4자리여야 합니다."),
  sports: z.array(sportSchema).min(1, "종목을 1개 이상 입력하세요."),
});

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, "school-submit", 20, 60_000);
  if (limited) return withSecurityHeaders(limited);

  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return withSecurityHeaders(
        NextResponse.json(
          {
            error:
              parsed.error.issues[0]?.message || "입력값이 올바르지 않습니다.",
          },
          { status: 400 }
        )
      );
    }

    const data = parsed.data;

    if (!REGIONS.includes(data.region as (typeof REGIONS)[number])) {
      return NextResponse.json(
        { error: "유효하지 않은 교육지원청입니다." },
        { status: 400 }
      );
    }

    if (!SCHOOL_LEVELS.some((s) => s.value === data.schoolLevel)) {
      return NextResponse.json(
        { error: "유효하지 않은 학교급입니다." },
        { status: 400 }
      );
    }

    for (const s of data.sports) {
      if (!SPORTS.includes(s.sport as (typeof SPORTS)[number])) {
        return NextResponse.json(
          { error: `유효하지 않은 종목입니다: ${s.sport}` },
          { status: 400 }
        );
      }
    }

    const sports = data.sports;
    const sportNames = sports.map((s) => s.sport);
    if (new Set(sportNames).size !== sportNames.length) {
      return NextResponse.json(
        { error: "중복된 종목이 있습니다." },
        { status: 400 }
      );
    }

    const schoolName = normalizeSchoolName(
      data.schoolName,
      data.schoolLevel as SchoolLevel
    );

    const result = await createSubmission({
      region: data.region,
      schoolLevel: data.schoolLevel as SchoolLevel,
      schoolName,
      password: data.password,
      sports: sports.map((s) => ({
        ...s,
        note: s.note || "",
      })),
    });

    return withSecurityHeaders(
      NextResponse.json({ success: true, data: result })
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "서버 오류";
    if (msg === "DUPLICATE_SCHOOL") {
      return withSecurityHeaders(
        NextResponse.json(
          {
            error:
              "이미 저장된 기록이 있습니다. 관리자(담당 장학사)에게 문의해 주세요.",
            code: "DUPLICATE_SCHOOL",
          },
          { status: 409 }
        )
      );
    }
    return withSecurityHeaders(safeError("서버 오류", 500, e));
  }
}
