import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  adminUpdateSubmission,
  deleteSubmission,
  findById,
} from "@/lib/db";
import { SPORTS } from "@/lib/constants";
import {
  isValidAdminToken,
  withSecurityHeaders,
  safeError,
  enforceRateLimit,
} from "@/lib/security";

const idSchema = z.string().uuid();

function requireAdmin(req: NextRequest): NextResponse | null {
  if (!isValidAdminToken(req.headers.get("x-admin-token"))) {
    return withSecurityHeaders(safeError("인증이 필요합니다.", 401));
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = enforceRateLimit(req, "admin-sub-get", 60, 60_000);
  if (limited) return withSecurityHeaders(limited);
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  if (!idSchema.safeParse(id).success) {
    return withSecurityHeaders(safeError("잘못된 요청입니다.", 400));
  }
  const sub = await findById(id);
  if (!sub) {
    return withSecurityHeaders(safeError("기록을 찾을 수 없습니다.", 404));
  }
  // passwordHash 절대 미노출
  return withSecurityHeaders(
    NextResponse.json({
      success: true,
      data: {
        id: sub.id,
        region: sub.region,
        schoolLevel: sub.schoolLevel,
        schoolName: sub.schoolName,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
        sports: sub.sports.map(({ id: _i, submissionId: _s, ...rest }) => rest),
      },
    })
  );
}

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

const putSchema = z.object({
  sports: z.array(sportSchema).min(1).max(55),
  newPassword: z
    .string()
    .regex(/^\d{4}$/)
    .optional()
    .or(z.literal("")),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = enforceRateLimit(req, "admin-sub-put", 30, 60_000);
  if (limited) return withSecurityHeaders(limited);
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      return withSecurityHeaders(safeError("잘못된 요청입니다.", 400));
    }
    const json = await req.json();
    const parsed = putSchema.safeParse(json);
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
    const pw =
      parsed.data.newPassword && parsed.data.newPassword.length === 4
        ? parsed.data.newPassword
        : undefined;
    const result = await adminUpdateSubmission(
      id,
      parsed.data.sports.map((s) => ({ ...s, note: s.note || "" })),
      pw
    );
    return withSecurityHeaders(
      NextResponse.json({ success: true, data: result })
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "오류";
    if (msg === "NOT_FOUND") {
      return withSecurityHeaders(safeError("기록을 찾을 수 없습니다.", 404));
    }
    return withSecurityHeaders(safeError("서버 오류", 500, e));
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = enforceRateLimit(req, "admin-sub-del", 20, 60_000);
  if (limited) return withSecurityHeaders(limited);
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const { id } = await params;
    if (!idSchema.safeParse(id).success) {
      return withSecurityHeaders(safeError("잘못된 요청입니다.", 400));
    }
    await deleteSubmission(id);
    return withSecurityHeaders(NextResponse.json({ success: true }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "오류";
    if (msg === "NOT_FOUND") {
      return withSecurityHeaders(safeError("기록을 찾을 수 없습니다.", 404));
    }
    return withSecurityHeaders(safeError("서버 오류", 500, e));
  }
}
