import { NextRequest, NextResponse } from "next/server";
import { getDashboardStats, getRegionStats } from "@/lib/db";

function checkAdmin(req: NextRequest): boolean {
  const auth = req.headers.get("x-admin-token");
  if (!auth) return false;
  try {
    const decoded = Buffer.from(auth, "base64").toString("utf8");
    return decoded.startsWith("admin:");
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const region = req.nextUrl.searchParams.get("region");
    if (region) {
      const stats = await getRegionStats(region);
      return NextResponse.json({ success: true, data: stats });
    }
    const stats = await getDashboardStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
