import ExcelJS from "exceljs";
import path from "path";
import { SPORTS, SIDO_FULL } from "./constants";
import type { RegionAgg, SportAgg } from "./db";

/**
 * Build Excel matching 탭4 "(지역명) 통계" format perfectly.
 * Uses the original template and fills aggregated values.
 */

function failSum(a: SportAgg) {
  return a.failG1 + a.failG2 + a.failG3;
}
function completeSum(a: SportAgg) {
  return a.completeG1 + a.completeG2 + a.completeG3;
}

async function loadTemplate(): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const templatePath = path.join(process.cwd(), "templates", "template.xlsx");
  await wb.xlsx.readFile(templatePath);
  return wb;
}

/**
 * Fill a statistics sheet (clone of tab 4) with aggregated data.
 */
function fillStatsSheet(
  ws: ExcelJS.Worksheet,
  agg: RegionAgg,
  sheetTitle: string
) {
  ws.name = sheetTitle;

  // Title stays from template; region label
  // X4: 시도명: 경기도교육청
  const sidoCell = ws.getCell("X4");
  sidoCell.value = `시도명: ${SIDO_FULL}`;

  // Optionally note region in title area if not all
  // B2 title from template is fine

  // Sports rows: 9..63 (1..55), 64 = 계
  // Columns:
  // 초: D=total, E-G fail, H fail sum, I-K complete, L complete sum
  // 중: M=total, N-P fail, Q fail sum, R-T complete, U complete sum
  // 고: V=total, W-Y fail, Z fail sum, AA-AC complete, AD complete sum

  const totals = {
    초: emptyRow(),
    중: emptyRow(),
    고: emptyRow(),
  };

  SPORTS.forEach((sport, idx) => {
    const row = 9 + idx;
    const data = agg[sport] || {
      초: emptyAgg(),
      중: emptyAgg(),
      고: emptyAgg(),
    };

    // Ensure sport name
    ws.getCell(row, 3).value = sport; // C
    ws.getCell(row, 2).value = idx + 1; // B 연번

    writeLevel(ws, row, "초", data.초, 4); // D start col=4
    writeLevel(ws, row, "중", data.중, 13); // M start col=13
    writeLevel(ws, row, "고", data.고, 22); // V start col=22

    addTo(totals.초, data.초);
    addTo(totals.중, data.중);
    addTo(totals.고, data.고);
  });

  // 계 row 64
  const totalRow = 64;
  ws.getCell(totalRow, 3).value = "계";
  writeLevel(ws, totalRow, "초", totals.초, 4);
  writeLevel(ws, totalRow, "중", totals.중, 13);
  writeLevel(ws, totalRow, "고", totals.고, 22);
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

function emptyRow(): SportAgg {
  return emptyAgg();
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

/**
 * Write one school-level block starting at `startCol` (1-indexed).
 * Layout: total | failG1 | failG2 | failG3 | failSum | completeG1 | completeG2 | completeG3 | completeSum
 * = 9 columns
 */
function writeLevel(
  ws: ExcelJS.Worksheet,
  row: number,
  _level: string,
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

/**
 * Export single region statistics Excel (tab4 format only).
 */
export async function exportRegionExcel(
  region: string,
  agg: RegionAgg
): Promise<Buffer> {
  const wb = await loadTemplate();

  // Remove school sheets (1-3), keep only stats sheet renamed
  const keepName = wb.worksheets[3]?.name || "(지역명) 통계";
  const statsSheet = wb.getWorksheet(keepName) || wb.worksheets[3];

  // Remove first 3 sheets
  const namesToRemove = wb.worksheets
    .filter((s) => s !== statsSheet)
    .map((s) => s.name);
  for (const n of namesToRemove) {
    wb.removeWorksheet(n);
  }

  // Short region name for sheet: e.g. 수원교육지원청 → 수원 통계
  const short = region.replace("교육지원청", "").trim();
  fillStatsSheet(statsSheet!, agg, `${short} 통계`);

  // Update title to include region
  statsSheet!.getCell("B2").value =
    `(통계) 2026학년도 1학기 초중고 종목별 최저학력 기준 기초학력프로그램 이수 학생선수 현황 — ${region}`;

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/**
 * Export all regions: one sheet per region + one combined "전체 통계" sheet.
 */
export async function exportAllRegionsExcel(
  regionAggs: Array<{ region: string; agg: RegionAgg }>
): Promise<Buffer> {
  const wb = await loadTemplate();
  const templateStats =
    wb.getWorksheet("(지역명) 통계") || wb.worksheets[3];

  // Remove school entry sheets
  const remove = wb.worksheets
    .filter((s) => s !== templateStats)
    .map((s) => s.name);
  for (const n of remove) {
    wb.removeWorksheet(n);
  }

  // Combined all data
  const combined: RegionAgg = {};
  for (const sport of SPORTS) {
    combined[sport] = {
      초: emptyAgg(),
      중: emptyAgg(),
      고: emptyAgg(),
    };
  }
  for (const { agg } of regionAggs) {
    for (const sport of SPORTS) {
      const src = agg[sport];
      if (!src) continue;
      addTo(combined[sport].초, src.초);
      addTo(combined[sport].중, src.중);
      addTo(combined[sport].고, src.고);
    }
  }

  // First sheet: 전체 통계 (reuse template sheet)
  fillStatsSheet(templateStats!, combined, "전체 통계");
  templateStats!.getCell("B2").value =
    "(통계) 2026학년도 1학기 초중고 종목별 최저학력 기준 기초학력프로그램 이수 학생선수 현황 — 경기도 전체";

  // Clone for each region that has data (or all 25)
  for (const { region, agg } of regionAggs) {
    const short = region.replace("교육지원청", "").trim();
    const sheetName = `${short} 통계`.slice(0, 31); // Excel sheet name limit
    const newSheet = wb.addWorksheet(sheetName);
    // Copy structure by re-reading template is hard; rebuild headers from template
    await copySheetStructure(templateStats!, newSheet);
    fillStatsSheet(newSheet, agg, sheetName);
    newSheet.getCell("B2").value =
      `(통계) 2026학년도 1학기 초중고 종목별 최저학력 기준 기초학력프로그램 이수 학생선수 현황 — ${region}`;
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/**
 * Copy column widths, merges, and header cells from source to target.
 */
async function copySheetStructure(
  source: ExcelJS.Worksheet,
  target: ExcelJS.Worksheet
) {
  // Column widths
  source.columns.forEach((col, i) => {
    if (col.width) {
      const tCol = target.getColumn(i + 1);
      tCol.width = col.width;
    }
  });

  // Row heights
  source.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    if (row.height) {
      target.getRow(rowNumber).height = row.height;
    }
  });

  // Merges
  const merges = (source as unknown as { model: { merges?: string[] } }).model
    ?.merges;
  if (merges) {
    for (const m of merges) {
      try {
        target.mergeCells(m);
      } catch {
        /* already merged */
      }
    }
  } else {
    // Fallback known merges for tab4
    const known = [
      "B2:AD2",
      "X4:AD4",
      "B6:B8",
      "C6:C8",
      "D6:L6",
      "M6:U6",
      "V6:AD6",
      "D7:D8",
      "E7:H7",
      "I7:L7",
      "M7:M8",
      "N7:Q7",
      "R7:U7",
      "V7:V8",
      "W7:Z7",
      "AA7:AD7",
    ];
    for (const m of known) {
      try {
        target.mergeCells(m);
      } catch {
        /* skip */
      }
    }
  }

  // Copy cells (styles + values for headers, structure for data rows)
  source.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const tRow = target.getRow(rowNumber);
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const tCell = tRow.getCell(colNumber);
      tCell.value = cell.value;
      if (cell.style) {
        tCell.style = { ...cell.style };
      }
      if (cell.numFmt) tCell.numFmt = cell.numFmt;
      if (cell.font) tCell.font = { ...cell.font };
      if (cell.fill) tCell.fill = { ...cell.fill } as ExcelJS.Fill;
      if (cell.border) tCell.border = { ...cell.border };
      if (cell.alignment) tCell.alignment = { ...cell.alignment };
    });
  });
}

/**
 * Simpler approach: always base export on template file and fill one sheet.
 * For multi-region, create workbook from template multiple times and merge sheets.
 */
export async function exportAllRegionsExcelV2(
  regionAggs: Array<{ region: string; agg: RegionAgg }>
): Promise<Buffer> {
  // Combined first
  const combined: RegionAgg = {};
  for (const sport of SPORTS) {
    combined[sport] = {
      초: emptyAgg(),
      중: emptyAgg(),
      고: emptyAgg(),
    };
  }
  for (const { agg } of regionAggs) {
    for (const sport of SPORTS) {
      const src = agg[sport];
      if (!src) continue;
      addTo(combined[sport].초, src.초);
      addTo(combined[sport].중, src.중);
      addTo(combined[sport].고, src.고);
    }
  }

  // Start from template
  const mainWb = await loadTemplate();
  // Remove school sheets
  while (mainWb.worksheets.length > 1) {
    const toRemove = mainWb.worksheets.find(
      (s) => s.name !== "(지역명) 통계"
    );
    if (toRemove) mainWb.removeWorksheet(toRemove.id);
    else break;
  }

  const allSheet = mainWb.getWorksheet("(지역명) 통계") || mainWb.worksheets[0];
  fillStatsSheet(allSheet!, combined, "전체 통계");
  allSheet!.getCell("B2").value =
    "(통계) 2026학년도 1학기 초중고 종목별 최저학력 기준 기초학력프로그램 이수 학생선수 현황 — 경기도 전체";

  // For each region, load template, fill, copy sheet into main
  for (const { region, agg } of regionAggs) {
    const short = region.replace("교육지원청", "").trim();
    const sheetName = `${short} 통계`.slice(0, 31);

    const tmpWb = await loadTemplate();
    while (tmpWb.worksheets.length > 1) {
      const toRemove = tmpWb.worksheets.find(
        (s) => s.name !== "(지역명) 통계"
      );
      if (toRemove) tmpWb.removeWorksheet(toRemove.id);
      else break;
    }
    const src = tmpWb.getWorksheet("(지역명) 통계") || tmpWb.worksheets[0];
    fillStatsSheet(src!, agg, sheetName);
    src!.getCell("B2").value =
      `(통계) 2026학년도 1학기 초중고 종목별 최저학력 기준 기초학력프로그램 이수 학생선수 현황 — ${region}`;

    // Write tmp to buffer and re-read to transfer sheet - use model clone
    const newSheet = mainWb.addWorksheet(sheetName);
    await copySheetStructure(src!, newSheet);
    // Values already in src; re-fill to be safe
    fillStatsSheet(newSheet, agg, sheetName);
    newSheet.getCell("B2").value =
      `(통계) 2026학년도 1학기 초중고 종목별 최저학력 기준 기초학력프로그램 이수 학생선수 현황 — ${region}`;
  }

  const buf = await mainWb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
