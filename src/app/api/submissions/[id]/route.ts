import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateSubmission } from "@/lib/db";
import { SPORTS } from "@/lib/constants";

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
  password: z.string().regex(/^\d{4}$/),
  sports: z.array(sportSchema).min(1),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
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

    const result = await updateSubmission(
      id,
      parsed.data.password,
      parsed.data.sports.map((s) => ({ ...s, note: s.note || "" }))
    );

    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "오류";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 });
    }
    if (msg === "INVALID_PASSWORD") {
      return NextResponse.json(
        { error: "임시비밀번호가 일치하지 않습니다." },
        { status: 401 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
