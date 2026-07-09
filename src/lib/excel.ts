import ExcelJS from "exceljs";
import path from "path";
import { SPORTS, SIDO, SIDO_FULL } from "./constants";
import type { RegionAgg, SportAgg } from "./db";
import type { SubmissionRecord, SportEntryInput } from "./types";
import type { SchoolLevel } from "./constants";

/**
 * 원본 서식(초/중/고/통계 4탭)을 유지한 채 제출 데이터를 누적 반영한 엑셀 생성
 */

function failSum(a: SportAgg) {
  return a.failG1 + a.failG2 + a.failG3;
}
function completeSum(a: SportAgg) {
  return a.completeG1 + a.completeG2 + a.completeG3;
}

function emptyAgg(): SportAgg {
  return {
    total: 0,
    failG1: 0,
    failG2: 0,
    failG3: 0,
    completeG1: 0,
    completeG2: 0,
    completeG3: 0,
  };
}

function addTo(target: SportAgg, src: SportAgg) {
  target.total += src.total;
  target.failG1 += src.failG1;
  target.failG2 += src.failG2;
  target.failG3 += src.failG3;
  target.completeG1 += src.completeG1;
  target.completeG2 += src.completeG2;
  target.completeG3 += src.completeG3;
}

async function loadTemplate(): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const templatePath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "templates",
    "template.xlsx"
  );
  await wb.xlsx.readFile(templatePath);
  return wb;
}

function writeLevel(
  ws: ExcelJS.Worksheet,
  row: number,
  data: SportAgg,
  startCol: number
) {
  const vals = [
    data.total,
    data.failG1,
    data.failG2,
    data.failG3,
    failSum(data),
    data.completeG1,
    data.completeG2,
    data.completeG3,
    completeSum(data),
  ];
  vals.forEach((v, i) => {
    ws.getCell(row, startCol + i).value = v;
  });
}

function fillStatsSheet(
  ws: ExcelJS.Worksheet,
  agg: RegionAgg,
  titleSuffix?: string
) {
  const sidoCell = ws.getCell("X4");
  sidoCell.value = `시도명: ${SIDO_FULL}`;

  if (titleSuffix) {
    ws.getCell("B2").value =
      `(통계) 2026학년도 1학기 초중고 종목별 최저학력 기준 기초학력프로그램 이수 학생선수 현황 — ${titleSuffix}`;
  }

  const totals = {
    초: emptyAgg(),
    중: emptyAgg(),
    고: emptyAgg(),
  };

  SPORTS.forEach((sport, idx) => {
    const row = 9 + idx;
    const data = agg[sport] || {
      초: emptyAgg(),
      중: emptyAgg(),
      고: emptyAgg(),
    };
    ws.getCell(row, 2).value = idx + 1;
    ws.getCell(row, 3).value = sport;
    writeLevel(ws, row, data.초, 4);
    writeLevel(ws, row, data.중, 13);
    writeLevel(ws, row, data.고, 22);
    addTo(totals.초, data.초);
    addTo(totals.중, data.중);
    addTo(totals.고, data.고);
  });

  const totalRow = 64;
  ws.getCell(totalRow, 3).value = "계";
  writeLevel(ws, totalRow, totals.초, 4);
  writeLevel(ws, totalRow, totals.중, 13);
  writeLevel(ws, totalRow, totals.고, 22);
}

/** 학교 작성 시트(초/중/고) 샘플 행 제거 후 제출 행 채우기 */
function fillSchoolSheet(
  ws: ExcelJS.Worksheet,
  level: SchoolLevel,
  rows: Array<{
    region: string;
    schoolName: string;
    sport: string;
    entry: SportEntryInput;
  }>
) {
  // 샘플 데이터 영역 비우기 (B8:U50 정도) + 안내문 위치 확보
  // 기존 샘플 8~12, 안내 14 → 데이터 후 안내 재배치
  for (let r = 8; r <= 200; r++) {
    for (let c = 2; c <= 21; c++) {
      const cell = ws.getCell(r, c);
      // keep nothing in data area
      cell.value = null;
    }
  }

  const regionShort = (r: string) => r.replace("교육지원청", "").trim();

  rows.forEach((item, idx) => {
    const r = 8 + idx;
    const e = item.entry;
    const failSumV = e.failG1 + e.failG2 + e.failG3;
    const completeSumV = e.completeG1 + e.completeG2 + e.completeG3;
    const basicSumV = e.basicFailG1 + e.basicFailG2 + e.basicFailG3;

    ws.getCell(r, 2).value = idx + 1; // 연번
    ws.getCell(r, 3).value = SIDO; // 시도
    ws.getCell(r, 4).value = regionShort(item.region); // 지역청
    ws.getCell(r, 5).value = level; // 학교급
    ws.getCell(r, 6).value = item.schoolName;
    ws.getCell(r, 7).value = e.sport;
    ws.getCell(r, 8).value = e.totalAthletes;
    // 미도달
    ws.getCell(r, 9).value = e.failG1;
    ws.getCell(r, 10).value = e.failG2;
    ws.getCell(r, 11).value = e.failG3;
    ws.getCell(r, 12).value = failSumV;
    // 이수
    ws.getCell(r, 13).value = e.completeG1;
    ws.getCell(r, 14).value = e.completeG2;
    ws.getCell(r, 15).value = e.completeG3;
    ws.getCell(r, 16).value = completeSumV;
    // 기초학력 미달
    ws.getCell(r, 17).value = e.basicFailG1;
    ws.getCell(r, 18).value = e.basicFailG2;
    ws.getCell(r, 19).value = e.basicFailG3;
    ws.getCell(r, 20).value = basicSumV;
    // 비고
    ws.getCell(r, 21).value = e.note || "";

    // light border for readability
    for (let c = 2; c <= 21; c++) {
      const cell = ws.getCell(r, c);
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FFB0B0B0" } },
        left: { style: "thin", color: { argb: "FFB0B0B0" } },
        bottom: { style: "thin", color: { argb: "FFB0B0B0" } },
        right: { style: "thin", color: { argb: "FFB0B0B0" } },
      };
      if (c === 6 || c === 7 || c === 21) {
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      }
    }
  });

  // 안내문 (데이터 아래) — 기존 B14 병합 영역 클리어 후 재기록
  const guideRow = Math.max(8 + rows.length + 2, 16);
  try {
    ws.unMergeCells("B14:U14");
  } catch {
    /* ignore */
  }
  const guide =
    "[최저학력제 안내]\n" +
    "  - 적용시기 및 대상 : 2026년 1학기, 초4-고3 학생선수(동호인 선수 등록 학생은 제외)\n" +
    "  - 본 시트는 제출 데이터를 자동 취합한 결과입니다.";
  ws.getCell(guideRow, 2).value = guide;
  ws.getCell(guideRow, 2).alignment = {
    vertical: "top",
    horizontal: "left",
    wrapText: true,
  };
  ws.getRow(guideRow).height = 60;
  try {
    ws.mergeCells(guideRow, 2, guideRow, 21);
  } catch {
    /* already merged */
  }
}

function flattenSubmissions(
  submissions: SubmissionRecord[],
  level: SchoolLevel
) {
  const out: Array<{
    region: string;
    schoolName: string;
    sport: string;
    entry: SportEntryInput;
  }> = [];

  const list = submissions
    .filter((s) => s.schoolLevel === level)
    .sort((a, b) => {
      const r = a.region.localeCompare(b.region, "ko");
      if (r !== 0) return r;
      return a.schoolName.localeCompare(b.schoolName, "ko");
    });

  for (const sub of list) {
    const sports = [...sub.sports].sort((a, b) =>
      a.sport.localeCompare(b.sport, "ko")
    );
    for (const sp of sports) {
      out.push({
        region: sub.region,
        schoolName: sub.schoolName,
        sport: sp.sport,
        entry: sp,
      });
    }
  }
  return out;
}

function buildAggFromSubmissions(submissions: SubmissionRecord[]): RegionAgg {
  const result: RegionAgg = {};
  for (const sport of SPORTS) {
    result[sport] = { 초: emptyAgg(), 중: emptyAgg(), 고: emptyAgg() };
  }
  for (const sub of submissions) {
    const level = sub.schoolLevel;
    for (const sp of sub.sports) {
      if (!result[sp.sport]) {
        result[sp.sport] = { 초: emptyAgg(), 중: emptyAgg(), 고: emptyAgg() };
      }
      const bucket = result[sp.sport][level];
      bucket.total += sp.totalAthletes;
      bucket.failG1 += sp.failG1;
      bucket.failG2 += sp.failG2;
      bucket.failG3 += sp.failG3;
      bucket.completeG1 += sp.completeG1;
      bucket.completeG2 += sp.completeG2;
      bucket.completeG3 += sp.completeG3;
    }
  }
  return result;
}

/**
 * 원본 서식 4탭 유지 + 제출 데이터 누적 반영
 * sheets: 초등학교 | 중학교 | 고등학교 | (지역명) 통계
 */
export async function exportFullFormWorkbook(
  submissions: SubmissionRecord[],
  options?: { region?: string; titleSuffix?: string }
): Promise<Buffer> {
  const wb = await loadTemplate();

  const elem = wb.getWorksheet("초등학교") || wb.worksheets[0];
  const mid = wb.getWorksheet("중학교") || wb.worksheets[1];
  const high = wb.getWorksheet("고등학교") || wb.worksheets[2];
  const stats =
    wb.getWorksheet("(지역명) 통계") || wb.worksheets[3];

  fillSchoolSheet(elem!, "초", flattenSubmissions(submissions, "초"));
  fillSchoolSheet(mid!, "중", flattenSubmissions(submissions, "중"));
  fillSchoolSheet(high!, "고", flattenSubmissions(submissions, "고"));

  const agg = buildAggFromSubmissions(submissions);
  const suffix =
    options?.titleSuffix ||
    options?.region ||
    "경기도 전체";
  fillStatsSheet(stats!, agg, suffix);

  // 통계 시트 이름
  if (options?.region) {
    const short = options.region.replace("교육지원청", "").trim();
    stats!.name = `${short} 통계`.slice(0, 31);
  } else {
    stats!.name = "통계";
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/** @deprecated use exportFullFormWorkbook */
export async function exportRegionExcel(
  region: string,
  _agg: RegionAgg,
  submissions?: SubmissionRecord[]
): Promise<Buffer> {
  return exportFullFormWorkbook(submissions || [], {
    region,
    titleSuffix: region,
  });
}

/** @deprecated use exportFullFormWorkbook */
export async function exportAllRegionsExcelV2(
  _regionAggs: Array<{ region: string; agg: RegionAgg }>,
  submissions?: SubmissionRecord[]
): Promise<Buffer> {
  return exportFullFormWorkbook(submissions || [], {
    titleSuffix: "경기도 전체",
  });
}
