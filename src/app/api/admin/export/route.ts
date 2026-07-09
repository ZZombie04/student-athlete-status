import { NextRequest, NextResponse } from "next/server";
import { REGIONS } from "@/lib/constants";
import { aggregateForExport } from "@/lib/db";
import {
  exportAllRegionsExcelV2,
  exportRegionExcel,
} from "@/lib/excel";

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
      if (!REGIONS.includes(region as (typeof REGIONS)[number])) {
        return NextResponse.json(
          { error: "유효하지 않은 교육지원청입니다." },
          { status: 400 }
        );
      }
      const agg = await aggregateForExport(region);
      const buffer = await exportRegionExcel(region, agg);
      const short = region.replace("교육지원청", "");
      const filename = encodeURIComponent(
        `2026_1학기_학생선수_기초학력프로그램_이수현황_${short}통계.xlsx`
      );
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
        },
      });
    }

    // All regions combined
    const regionAggs = [];
    for (const r of REGIONS) {
      const agg = await aggregateForExport(r);
      regionAggs.push({ region: r, agg });
    }
    const buffer = await exportAllRegionsExcelV2(regionAggs);
    const filename = encodeURIComponent(
      `2026_1학기_학생선수_기초학력프로그램_이수현황_경기도전체취합.xlsx`
    );
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "엑셀 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
