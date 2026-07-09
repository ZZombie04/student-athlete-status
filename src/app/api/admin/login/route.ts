import { NextRequest, NextResponse } from "next/server";
import { ADMIN_ID, ADMIN_PASSWORD } from "@/lib/constants";
import {
  enforceRateLimit,
  withSecurityHeaders,
  safeError,
} from "@/lib/security";

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, "admin-login", 10, 60_000);
  if (limited) return withSecurityHeaders(limited);

  try {
    const body = await req.json();
    const id = String(body.id || "").trim().slice(0, 50);
    const password = String(body.password || "").trim().slice(0, 50);

    if (id === ADMIN_ID && password === ADMIN_PASSWORD) {
      const token = Buffer.from(
        `admin:${Date.now()}:${ADMIN_PASSWORD}`
      ).toString("base64");
      return withSecurityHeaders(
        NextResponse.json({ success: true, token })
      );
    }

    return withSecurityHeaders(
      safeError("아이디 또는 비밀번호가 올바르지 않습니다.", 401)
    );
  } catch {
    return withSecurityHeaders(safeError("서버 오류", 500));
  }
}
