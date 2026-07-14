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
    const cell = ws.getCell(row, startCol + i);
    cell.value = v;
    cell.font = {
      name: "맑은 고딕",
      size: 10,
      color: { argb: "FF000000" },
      bold: false,
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
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

/**
 * 데이터 행 영역(8행~)의 병합 해제.
 * 서식 원본 B14:U14 안내 병합이 7번째 종목(14행) 등과 겹쳐
 * 종목이 누락되는 문제 방지 — 반드시 데이터 쓰기 전에 호출.
 */
function unmergeFromRow(ws: ExcelJS.Worksheet, fromRow: number) {
  const model = (ws as unknown as { model?: { merges?: string[] } }).model;
  const merges = [...(model?.merges || [])];
  // ExcelJS 내부 _merges Map 형태도 처리
  const internal = (
    ws as unknown as { _merges?: Record<string, { model?: string } | string> }
  )._merges;
  if (internal && typeof internal === "object") {
    for (const key of Object.keys(internal)) {
      if (!merges.includes(key)) merges.push(key);
    }
  }

  for (const range of merges) {
    const m = String(range).match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/i);
    if (!m) continue;
    const r1 = parseInt(m[2], 10);
    const r2 = parseInt(m[4], 10);
    if (r2 >= fromRow || r1 >= fromRow) {
      try {
        ws.unMergeCells(String(range));
      } catch {
        try {
          ws.unMergeCells(r1, colToNum(m[1]), r2, colToNum(m[3]));
        } catch {
          /* ignore */
        }
      }
    }
  }

  // 서식 고정 병합 명시적 해제
  for (const fixed of ["B14:U14"]) {
    try {
      ws.unMergeCells(fixed);
    } catch {
      /* ignore */
    }
  }
}

function colToNum(col: string): number {
  let n = 0;
  for (const ch of col.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n;
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
  // 1) 데이터 영역 병합 먼저 해제 (B14:U14 등) — 종목 누락 방지
  unmergeFromRow(ws, 8);

  // 2) 샘플·기존 값 초기화 (최대 55종목 + 여유)
  const clearEnd = Math.max(200, 8 + rows.length + 20);
  for (let r = 8; r <= clearEnd; r++) {
    for (let c = 2; c <= 21; c++) {
      const cell = ws.getCell(r, c);
      cell.value = null;
      cell.font = {
        name: "맑은 고딕",
        size: 11,
        color: { argb: "FF000000" },
        bold: false,
        italic: false,
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
      cell.border = {};
      cell.fill = {
        type: "pattern",
        pattern: "none",
      };
    }
  }

  const regionShort = (r: string) => r.replace("교육지원청", "").trim();
  const blackCenter = {
    font: {
      name: "맑은 고딕",
      size: 11,
      color: { argb: "FF000000" },
      bold: false,
    } as ExcelJS.Font,
    alignment: {
      vertical: "middle" as const,
      horizontal: "center" as const,
      wrapText: true,
    },
    border: {
      top: { style: "thin" as const, color: { argb: "FFB0B0B0" } },
      left: { style: "thin" as const, color: { argb: "FFB0B0B0" } },
      bottom: { style: "thin" as const, color: { argb: "FFB0B0B0" } },
      right: { style: "thin" as const, color: { argb: "FFB0B0B0" } },
    },
  };

  // 3) 종목 행 전체 기록 (8행부터 연속)
  rows.forEach((item, idx) => {
    const r = 8 + idx;
    const e = item.entry;
    const failSumV = e.failG1 + e.failG2 + e.failG3;
    const completeSumV = e.completeG1 + e.completeG2 + e.completeG3;
    const basicSumV = e.basicFailG1 + e.basicFailG2 + e.basicFailG3;

    const vals: Array<string | number> = [
      idx + 1,
      SIDO,
      regionShort(item.region),
      level,
      item.schoolName,
      e.sport,
      e.totalAthletes,
      e.failG1,
      e.failG2,
      e.failG3,
      failSumV,
      e.completeG1,
      e.completeG2,
      e.completeG3,
      completeSumV,
      e.basicFailG1,
      e.basicFailG2,
      e.basicFailG3,
      basicSumV,
      e.note || "",
    ];

    vals.forEach((v, i) => {
      const cell = ws.getCell(r, 2 + i);
      cell.value = v;
      cell.font = { ...blackCenter.font };
      cell.alignment = { ...blackCenter.alignment };
      cell.border = { ...blackCenter.border };
    });
  });

  // 4) 안내문은 데이터 마지막 행 아래 2행 이후 (병합과 절대 겹치지 않음)
  const guideRow = 8 + rows.length + 2;
  const guide =
    "[최저학력제 안내]\n" +
    "  - 적용시기 및 대상 : 2026년 1학기, 초4-고3 학생선수(동호인 선수 등록 학생은 제외)\n" +
    "  - 본 시트는 제출 데이터를 자동 취합한 결과입니다.";
  ws.getCell(guideRow, 2).value = guide;
  ws.getCell(guideRow, 2).font = {
    name: "맑은 고딕",
    size: 10,
    color: { argb: "FF000000" },
  };
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

const LEVEL_SHEET: Record<SchoolLevel, string> = {
  초: "초등학교",
  중: "중학교",
  고: "고등학교",
};

/**
 * 학교 본인용: 해당 학교급 탭 1개 + 통계 탭만
 * (다른 학교 데이터 포함하지 않음)
 */
export async function exportSchoolWorkbook(
  submission: SubmissionRecord
): Promise<Buffer> {
  const wb = await loadTemplate();
  const level = submission.schoolLevel;
  const keepSchoolName = LEVEL_SHEET[level];

  const elem = wb.getWorksheet("초등학교");
  const mid = wb.getWorksheet("중학교");
  const high = wb.getWorksheet("고등학교");
  const stats = wb.getWorksheet("(지역명) 통계") || wb.worksheets[3];

  // 다른 학교급 시트 제거
  const toRemove: string[] = [];
  for (const ws of [elem, mid, high]) {
    if (ws && ws.name !== keepSchoolName) toRemove.push(ws.name);
  }
  for (const name of toRemove) {
    try {
      wb.removeWorksheet(name);
    } catch {
      /* ignore */
    }
  }

  const schoolSheet =
    wb.getWorksheet(keepSchoolName) ||
    (level === "초" ? elem : level === "중" ? mid : high);

  fillSchoolSheet(schoolSheet!, level, flattenSubmissions([submission], level));

  const agg = buildAggFromSubmissions([submission]);
  fillStatsSheet(
    stats!,
    agg,
    `${submission.schoolName} (${submission.region})`
  );
  stats!.name = "통계".slice(0, 31);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
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
