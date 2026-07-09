import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "./rate-limit";

export function getClientIp(req: NextRequest): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

/** 인증·제출·다운로드 등 민감 API 공통 레이트리밋 */
export function enforceRateLimit(
  req: NextRequest,
  scope: string,
  limit = 30,
  windowMs = 60_000
): NextResponse | null {
  const ip = getClientIp(req);
  const { ok, retryAfterSec } = rateLimit(`${scope}:${ip}`, limit, windowMs);
  if (!ok) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec || 60) },
      }
    );
  }
  return null;
}

export function isValidAdminToken(token: string | null): boolean {
  if (!token || token.length > 500) return false;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    // admin:timestamp:password — 형식만 검증 (하드코딩 관리자 세션)
    if (!decoded.startsWith("admin:")) return false;
    const parts = decoded.split(":");
    if (parts.length < 3) return false;
    const ts = Number(parts[1]);
    if (!Number.isFinite(ts)) return false;
    // 토큰 유효기간 12시간
    if (Date.now() - ts > 12 * 60 * 60 * 1000) return false;
    return parts.slice(2).join(":") === "1004";
  } catch {
    return false;
  }
}

/** 안전한 JSON 에러 (내부 메시지 노출 최소화) */
export function safeError(
  publicMessage: string,
  status: number,
  internal?: unknown
): NextResponse {
  if (internal) {
    console.error("[api]", publicMessage, internal);
  }
  return NextResponse.json({ error: publicMessage }, { status });
}

export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cache-Control": "no-store",
};

export function withSecurityHeaders(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}
