/**
 * 엑셀 종목 누락·병합 충돌 전수 검증
 * - 학교 시트: 1~55 종목 전부 기록 + 14행(7번째) 유효
 * - 통계 시트: 55종목 + 계 행
 * - 관리자 다학교 취합: 행 수 = 각 학교 종목 합
 */
import { exportSchoolWorkbook, exportFullFormWorkbook } from "../src/lib/excel.ts";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

const SPORTS = [
  "검도", "골프", "근대5종", "농구", "당구", "댄스스포츠", "럭비", "레슬링",
  "롤러", "루지", "바이애슬론", "배구", "배드민턴", "보디빌딩", "복싱", "볼링",
  "봅슬레이스켈레톤", "빙상", "사격", "스포츠클라이밍", "세팍타크로", "소프트테니스",
  "수상스키웨이크보드", "수영", "수중_핀수영", "스쿼시", "스키", "승마", "씨름",
  "아이스하키", "야구소프트볼(소프트볼)", "야구소프트볼(야구)", "양궁", "에어로빅힙합",
  "역도", "요트", "우슈", "유도", "육상", "자전거", "조정", "철인3종", "체조",
  "축구", "카누", "카바디", "컬링", "탁구", "태권도", "태견", "테니스", "펜싱",
  "하키", "핸드볼", "기타",
];

function makeSub(n, level = "초", name = "검증초등학교") {
  const sports = [];
  for (let i = 0; i < n; i++) {
    sports.push({
      id: "s" + i,
      submissionId: "sub1",
      sport: SPORTS[i],
      totalAthletes: i + 1,
      failG1: 1,
      failG2: 0,
      failG3: 0,
      completeG1: 1,
      completeG2: 0,
      completeG3: 0,
      basicFailG1: 0,
      basicFailG2: 0,
      basicFailG3: 0,
      note: "",
    });
  }
  return {
    id: "sub1",
    region: "수원교육지원청",
    schoolLevel: level,
    schoolName: name,
    passwordHash: "x",
    createdAt: "",
    updatedAt: "",
    sports,
  };
}

function countSchoolSports(ws, expectedN) {
  const found = [];
  for (let r = 8; r < 8 + expectedN + 30; r++) {
    const num = ws.getCell(r, 2).value;
    const sport = ws.getCell(r, 7).value;
    if (typeof num === "number" && sport) found.push(String(sport));
  }
  return found;
}

function countStatsSports(ws) {
  const found = [];
  for (let r = 9; r <= 63; r++) {
    const sport = ws.getCell(r, 3).value;
    if (sport) found.push(String(sport));
  }
  const totalLabel = ws.getCell(64, 3).value;
  return { found, totalLabel };
}

let fail = 0;

async function checkSchool(n) {
  const sub = makeSub(n);
  const buf = await exportSchoolWorkbook(sub);
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(path.join("data", `audit-${n}.xlsx`), buf);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const school = wb.getWorksheet("초등학교") || wb.worksheets[0];
  const stats = wb.getWorksheet("통계") || wb.worksheets[wb.worksheets.length - 1];

  const found = countSchoolSports(school, n);
  const expected = new Set(SPORTS.slice(0, n));
  const missing = [...expected].filter((s) => !found.includes(s));
  let ok = found.length === n && missing.length === 0;

  // 7개 이상: 14행이 7번째 데이터여야 함 (옛 B14 병합 버그)
  if (n >= 7) {
    const row14Num = school.getCell(14, 2).value;
    const row14Sport = school.getCell(14, 7).value;
    if (row14Num !== 7 || !row14Sport) {
      console.log(`school n=${n} FAIL row14`, row14Num, row14Sport);
      ok = false;
    }
  }

  // 통계 탭 55종목 + 계
  const st = countStatsSports(stats);
  if (st.found.length !== 55) {
    console.log(`school n=${n} FAIL stats sports ${st.found.length}`);
    ok = false;
  }
  if (String(st.totalLabel) !== "계") {
    console.log(`school n=${n} FAIL stats total row`, st.totalLabel);
    ok = false;
  }

  // 통계 합계: 해당 학교급 total 합
  const soccerRow = 9 + SPORTS.indexOf("축구");
  // 축구가 n개 안에 있으면 totalAthletes 확인
  if (n > SPORTS.indexOf("축구")) {
    const expectedTotal = SPORTS.indexOf("축구") + 1; // makeSub totalAthletes = i+1
    const cellTotal = stats.getCell(soccerRow, 4).value; // 초 total col D
    if (Number(cellTotal) !== expectedTotal) {
      console.log(
        `school n=${n} FAIL 축구 초 total`,
        cellTotal,
        "expected",
        expectedTotal
      );
      ok = false;
    }
  }

  console.log(
    `school n=${n}`,
    ok ? "PASS" : "FAIL",
    `rows=${found.length}`,
    n >= 7 ? `r14=#${school.getCell(14, 2).value}` : ""
  );
  if (!ok && missing.length) console.log("  missing", missing);
  if (!ok) fail++;
}

async function checkMultiSchool() {
  // 초 3종 + 중 5종 + 고 7종 → 각 시트 행 수 검증
  const subs = [
    makeSub(3, "초", "A초"),
    makeSub(5, "중", "B중"),
    makeSub(7, "고", "C고"),
  ];
  // fix school levels / names
  subs[1].schoolLevel = "중";
  subs[1].schoolName = "B중학교";
  subs[2].schoolLevel = "고";
  subs[2].schoolName = "C고등학교";

  const buf = await exportFullFormWorkbook(subs, { titleSuffix: "테스트" });
  fs.writeFileSync(path.join("data", "audit-multi.xlsx"), buf);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const e = wb.getWorksheet("초등학교");
  const m = wb.getWorksheet("중학교");
  const h = wb.getWorksheet("고등학교");
  const st = wb.getWorksheet("통계") || wb.worksheets[3];

  const ec = countSchoolSports(e, 3).length;
  const mc = countSchoolSports(m, 5).length;
  const hc = countSchoolSports(h, 7).length;
  const sc = countStatsSports(st);

  const ok =
    ec === 3 && mc === 5 && hc === 7 && sc.found.length === 55 && sc.totalLabel === "계";
  // 고 7개 → 14행 존재
  const h14 = h.getCell(14, 2).value;
  const ok14 = h14 === 7;

  console.log(
    "multi-school",
    ok && ok14 ? "PASS" : "FAIL",
    { ec, mc, hc, stats: sc.found.length, highRow14: h14 }
  );
  if (!(ok && ok14)) fail++;
}

// B14 병합이 템플릿에 있는지 + unmerge 후 7행 기록 확인은 school n=7로 커버

console.log("=== Excel audit ===\n");
for (const n of [1, 6, 7, 8, 15, 30, 50, 55]) {
  await checkSchool(n);
}
await checkMultiSchool();

console.log(fail === 0 ? "\nALL PASS" : `\nFAILED ${fail}`);
process.exit(fail > 0 ? 1 : 0);
