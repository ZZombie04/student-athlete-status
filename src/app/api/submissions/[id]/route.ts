import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateSubmission } from "@/lib/db";
import { SPORTS } from "@/lib/constants";
import {
  enforceRateLimit,
  withSecurityHeaders,
  safeError,
} from "@/lib/security";

const sportSchema = z.object({
  sport: z.string().min(1).max(80),
  totalAthletes: z.number().int().min(0).max(100000),
  failG1: z.number().int().min(0).max(100000),
  failG2: z.number().int().min(0).max(100000),
  failG3: z.number().int().min(0).max(100000),
  completeG1: z.number().int().min(0).max(100000),
  completeG2: z.number().int().min(0).max(100000),
  completeG3: z.number().int().min(0).max(100000),
  basicFailG1: z.number().int().min(0).max(100000),
  basicFailG2: z.number().int().min(0).max(100000),
  basicFailG3: z.number().int().min(0).max(100000),
  note: z.string().max(500).optional().default(""),
});

const bodySchema = z.object({
  password: z.string().regex(/^\d{4}$/),
  sports: z.array(sportSchema).min(1).max(55),
});

const idSchema = z.string().uuid();

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = enforceRateLimit(req, "school-update", 20, 60_000);
  if (limited) return withSecurityHeaders(limited);

  try {
    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      return withSecurityHeaders(safeError("잘못된 요청입니다.", 400));
    }

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

    for (const s of parsed.data.sports) {
      if (!SPORTS.includes(s.sport as (typeof SPORTS)[number])) {
        return withSecurityHeaders(
          safeError("유효하지 않은 종목이 포함되어 있습니다.", 400)
        );
      }
    }

    const result = await updateSubmission(
      id,
      parsed.data.password,
      parsed.data.sports.map((s) => ({ ...s, note: s.note || "" }))
    );

    return withSecurityHeaders(
      NextResponse.json({ success: true, data: result })
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "오류";
    if (msg === "NOT_FOUND" || msg === "INVALID_PASSWORD") {
      return withSecurityHeaders(
        safeError("권한이 없거나 기록을 찾을 수 없습니다.", 401)
      );
    }
    return withSecurityHeaders(safeError("서버 오류", 500, e));
  }
}
