import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  adminUpdateSubmission,
  deleteSubmission,
  findById,
} from "@/lib/db";
import { SPORTS } from "@/lib/constants";

function checkAdmin(req: NextRequest): boolean {
  const auth = req.headers.get("x-admin-token");
  if (!auth) return false;
  try {
    return Buffer.from(auth, "base64").toString("utf8").startsWith("admin:");
  } catch {
    return false;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { id } = await params;
  const sub = await findById(id);
  if (!sub) {
    return NextResponse.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({
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
  });
}

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

const putSchema = z.object({
  sports: z.array(sportSchema).min(1),
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
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  try {
    const { id } = await params;
    const json = await req.json();
    const parsed = putSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "입력값이 올바르지 않습니다." },
        { status: 400 }
      );
    }
    for (const s of parsed.data.sports) {
      if (!SPORTS.includes(s.sport as (typeof SPORTS)[number])) {
        return NextResponse.json(
          { error: `유효하지 않은 종목: ${s.sport}` },
          { status: 400 }
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
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "오류";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  try {
    const { id } = await params;
    await deleteSubmission(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "오류";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
