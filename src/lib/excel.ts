import ExcelJS from "exceljs";
import path from "path";
import { SPORTS, SIDO, SIDO_FULL } from "./constants";
import type { RegionAgg, SportAgg } from "./db";
import type { SubmissionRecord, SportEntryInput } from "./types";
import type { SchoolLevel } from "./constants";

/**
 * 원본 서식 기반 엑셀 생성
 *
 * 주의 (과거 버그):
 * - 초·중·고 시트 B14:U14 안내 병합이 7번째 종목 행과 겹쳐 종목 누락 발생
 * → 데이터 영역(8행~) 병합은 쓰기 전에 반드시 전부 해제
 * - 통계 시트 데이터는 9행~ (헤더 병합이 6~8행까지)
 */

/** 학교 시트: 데이터 시작 행 (1-based) */
const SCHOOL_DATA_START = 8;
/** 통계 시트: 종목 데이터 시작 행 */
const STATS_DATA_START = 9;
/** 통계 시트: 합계 행 = 시작 + 종목수 */
const STATS_TOTAL_ROW = STATS_DATA_START + SPORTS.length; // 9+55=64

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

function colToNum(col: string): number {
  let n = 0;
  for (const ch of col.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n;
}

/**
 * 워크시트에서 fromRow 이상과 겹치는 모든 병합 셀을 해제.
 * ExcelJS 버전별 merges 저장 방식 차이를 모두 커버.
 */
function unmergeOverlappingRows(ws: ExcelJS.Worksheet, fromRow: number) {
  const ranges = new Set<string>();

  const model = (ws as unknown as { model?: { merges?: string[] } }).model;
  for (const m of model?.merges || []) ranges.add(String(m));

  const internal = (
    ws as unknown as {
      _merges?: Map<string, unknown> | Record<string, unknown>;
    }
  )._merges;

  if (internal instanceof Map) {
    for (const key of internal.keys()) ranges.add(String(key));
  } else if (internal && typeof internal === "object") {
    for (const key of Object.keys(internal)) ranges.add(key);
  }

  // 알려진 서식 고정 병합 (학교 시트 안내 / 안전망)
  for (const fixed of ["B14:U14"]) {
    ranges.add(fixed);
  }

  for (const range of ranges) {
    const m = String(range).match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/i);
    if (!m) continue;
    const r1 = parseInt(m[2], 10);
    const r2 = parseInt(m[4], 10);
    // 데이터 영역과 한 행이라도 겹치면 해제
    if (r2 >= fromRow) {
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
}

function clearCell(cell: ExcelJS.Cell) {
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
  cell.fill = { type: "pattern", pattern: "none" };
  cell.numFmt = "";
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
  // 통계 시트: 헤더 병합은 6~8행. 데이터는 9행~. 8행 이하는 건드리지 않음.
  // 샘플/수식 잔존 방지: 9~(합계행) 값만 덮어씀
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

  // 방어: 종목 수와 합계 행 위치 불일치 방지
  if (STATS_TOTAL_ROW !== 64 || SPORTS.length !== 55) {
    console.warn(
      `[excel] SPORTS.length=${SPORTS.length} STATS_TOTAL_ROW=${STATS_TOTAL_ROW} (expected 55/64)`
    );
  }

  SPORTS.forEach((sport, idx) => {
    const row = STATS_DATA_START + idx; // 9..63
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

  const totalRow = STATS_TOTAL_ROW; // 64
  ws.getCell(totalRow, 3).value = "계";
  writeLevel(ws, totalRow, totals.초, 4);
  writeLevel(ws, totalRow, totals.중, 13);
  writeLevel(ws, totalRow, totals.고, 22);
}

const blackCenterStyle = {
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

/** 학교 작성 시트(초/중/고) — 모든 종목 행을 누락 없이 기록 */
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
  // 1) 데이터 영역 병합 전부 해제 (B14:U14 등) — 종목 누락 방지의 핵심
  unmergeOverlappingRows(ws, SCHOOL_DATA_START);

  // 2) 충분한 범위 초기화 (55종목 + 안내 + 여유)
  const clearEnd = Math.max(
    SCHOOL_DATA_START + 80,
    SCHOOL_DATA_START + rows.length + 30
  );
  for (let r = SCHOOL_DATA_START; r <= clearEnd; r++) {
    for (let c = 2; c <= 21; c++) {
      clearCell(ws.getCell(r, c));
    }
  }

  const regionShort = (r: string) => r.replace("교육지원청", "").trim();

  // 3) 종목 행 전체 기록 (SCHOOL_DATA_START부터 연속, 중간 건너뛰기 없음)
  rows.forEach((item, idx) => {
    const r = SCHOOL_DATA_START + idx;
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
      cell.font = { ...blackCenterStyle.font };
      cell.alignment = { ...blackCenterStyle.alignment };
      cell.border = { ...blackCenterStyle.border };
    });
  });

  // 4) 안내문은 데이터 완전 종료 후 (절대 데이터 행과 겹치지 않음)
  const guideRow = SCHOOL_DATA_START + rows.length + 2;
  // 안내 행 위치에도 잔여 병합이 있으면 해제
  unmergeOverlappingRows(ws, guideRow);

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

  // 5) 사후 검증: 기록한 종목 수 = 입력 수 (런타임 안전장치)
  let written = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = SCHOOL_DATA_START + i;
    const sport = ws.getCell(r, 7).value;
    const num = ws.getCell(r, 2).value;
    if (sport != null && sport !== "" && num != null) written++;
  }
  if (written !== rows.length) {
    console.error(
      `[excel] fillSchoolSheet mismatch: expected ${rows.length} sports, wrote ${written} on sheet ${ws.name}`
    );
  }
}

/**
 * 제출 → 시트 행 목록.
 * 입력 순서 유지(종목 가나다 재정렬 안 함) — 사용자가 넣은 순서 그대로 엑셀에 반영.
 * 여러 학교 취합 시에만 학교명 순 정렬.
 */
function flattenSubmissions(
  submissions: SubmissionRecord[],
  level: SchoolLevel,
  options?: { sortSports?: boolean }
) {
  const out: Array<{
    region: string;
    schoolName: string;
    sport: string;
    entry: SportEntryInput;
  }> = [];

  const list = [...submissions]
    .filter((s) => s.schoolLevel === level)
    .sort((a, b) => {
      const r = a.region.localeCompare(b.region, "ko");
      if (r !== 0) return r;
      return a.schoolName.localeCompare(b.schoolName, "ko");
    });

  for (const sub of list) {
    // 기본: DB/입력 순서 유지. 필요 시 가나다 정렬.
    const sports = options?.sortSports
      ? [...sub.sports].sort((a, b) => a.sport.localeCompare(b.sport, "ko"))
      : [...sub.sports];
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

  const toRemove: string[] = [];
  for (const sheet of [elem, mid, high]) {
    if (sheet && sheet.name !== keepSchoolName) toRemove.push(sheet.name);
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

  const rows = flattenSubmissions([submission], level, { sortSports: false });
  fillSchoolSheet(schoolSheet!, level, rows);

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
  const stats = wb.getWorksheet("(지역명) 통계") || wb.worksheets[3];

  // 각 학교급 시트: 데이터 영역 병합 해제 후 전체 행 기록
  fillSchoolSheet(elem!, "초", flattenSubmissions(submissions, "초"));
  fillSchoolSheet(mid!, "중", flattenSubmissions(submissions, "중"));
  fillSchoolSheet(high!, "고", flattenSubmissions(submissions, "고"));

  const agg = buildAggFromSubmissions(submissions);
  const suffix =
    options?.titleSuffix || options?.region || "경기도 전체";
  fillStatsSheet(stats!, agg, suffix);

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
