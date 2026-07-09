import { NextRequest, NextResponse } from "next/server";
import { getDashboardStats, getRegionStats } from "@/lib/db";
import { REGIONS } from "@/lib/constants";
import {
  isValidAdminToken,
  withSecurityHeaders,
  safeError,
  enforceRateLimit,
} from "@/lib/security";

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, "admin-stats", 60, 60_000);
  if (limited) return withSecurityHeaders(limited);

  if (!isValidAdminToken(req.headers.get("x-admin-token"))) {
    return withSecurityHeaders(safeError("인증이 필요합니다.", 401));
  }

  try {
    const region = req.nextUrl.searchParams.get("region");
    if (region) {
      if (!REGIONS.includes(region as (typeof REGIONS)[number])) {
        return withSecurityHeaders(safeError("유효하지 않은 지역입니다.", 400));
      }
      const stats = await getRegionStats(region);
      return withSecurityHeaders(
        NextResponse.json({ success: true, data: stats })
      );
    }
    const stats = await getDashboardStats();
    return withSecurityHeaders(
      NextResponse.json({ success: true, data: stats })
    );
  } catch (e) {
    return withSecurityHeaders(safeError("서버 오류", 500, e));
  }
}
