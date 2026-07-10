import { NextRequest, NextResponse } from "next/server";
import { REGIONS } from "@/lib/constants";
import {
  getAllSubmissions,
  getSubmissionsByRegion,
} from "@/lib/db";
import { exportFullFormWorkbook } from "@/lib/excel";
import {
  isValidAdminToken,
  withSecurityHeaders,
  safeError,
  enforceRateLimit,
} from "@/lib/security";
import {
  contentDispositionAttachment,
  excelFilenameForProvince,
  excelFilenameForRegion,
} from "@/lib/excel-filename";

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, "admin-export", 20, 60_000);
  if (limited) return withSecurityHeaders(limited);

  if (!isValidAdminToken(req.headers.get("x-admin-token"))) {
    return withSecurityHeaders(safeError("인증이 필요합니다.", 401));
  }

  try {
    const region = req.nextUrl.searchParams.get("region");

    if (region) {
      if (!REGIONS.includes(region as (typeof REGIONS)[number])) {
        return withSecurityHeaders(
          safeError("유효하지 않은 교육지원청입니다.", 400)
        );
      }
      const submissions = await getSubmissionsByRegion(region);
      const buffer = await exportFullFormWorkbook(submissions, {
        region,
        titleSuffix: region,
      });
      const filename = excelFilenameForRegion(region);
      return withSecurityHeaders(
        new NextResponse(new Uint8Array(buffer), {
          headers: {
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": contentDispositionAttachment(filename),
          },
        })
      );
    }

    const submissions = await getAllSubmissions();
    const buffer = await exportFullFormWorkbook(submissions, {
      titleSuffix: "경기도 전체",
    });
    const filename = excelFilenameForProvince();
    return withSecurityHeaders(
      new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": contentDispositionAttachment(filename),
        },
      })
    );
  } catch (e) {
    return withSecurityHeaders(
      safeError("엑셀 생성 중 오류가 발생했습니다.", 500, e)
    );
  }
}
