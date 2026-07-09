import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAndGet } from "@/lib/db";
import { normalizeSchoolName } from "@/lib/school-name";
import type { SchoolLevel } from "@/lib/constants";

const schema = z.object({
  region: z.string().min(1),
  schoolLevel: z.enum(["초", "중", "고"]),
  schoolName: z.string().min(1),
  password: z.string().regex(/^\d{4}$/),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력값을 확인해 주세요. (지역·학교급·학교명·4자리 비밀번호)" },
        { status: 400 }
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

    return NextResponse.json({ success: true, data, password: parsed.data.password });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "오류";
    if (msg === "NOT_FOUND") {
      return NextResponse.json(
        { error: "일치하는 제출 기록이 없습니다. 입력 정보를 확인해 주세요." },
        { status: 404 }
      );
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
