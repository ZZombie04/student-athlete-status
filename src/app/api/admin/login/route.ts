import { NextRequest, NextResponse } from "next/server";
import { ADMIN_ID, ADMIN_PASSWORD } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = String(body.id || "").trim();
    const password = String(body.password || "").trim();

    if (id === ADMIN_ID && password === ADMIN_PASSWORD) {
      // Simple token for client session (hardcoded admin — not JWT for simplicity)
      const token = Buffer.from(
        `admin:${Date.now()}:${ADMIN_PASSWORD}`
      ).toString("base64");
      return NextResponse.json({ success: true, token });
    }

    return NextResponse.json(
      { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
