import { exportSchoolWorkbook } from "../src/lib/excel.ts";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

const SPORTS = [
  "검도",
  "골프",
  "근대5종",
  "농구",
  "당구",
  "댄스스포츠",
  "럭비",
  "레슬링",
  "롤러",
  "루지",
  "바이애슬론",
  "배구",
  "배드민턴",
  "보디빌딩",
  "복싱",
  "볼링",
  "봅슬레이스켈레톤",
  "빙상",
  "사격",
  "스포츠클라이밍",
  "세팍타크로",
  "소프트테니스",
  "수상스키웨이크보드",
  "수영",
  "수중_핀수영",
  "스쿼시",
  "스키",
  "승마",
  "씨름",
  "아이스하키",
  "야구소프트볼(소프트볼)",
  "야구소프트볼(야구)",
  "양궁",
  "에어로빅힙합",
  "역도",
  "요트",
  "우슈",
  "유도",
  "육상",
  "자전거",
  "조정",
  "철인3종",
  "체조",
  "축구",
  "카누",
  "카바디",
  "컬링",
  "탁구",
  "태권도",
  "태견",
  "테니스",
  "펜싱",
  "하키",
  "핸드볼",
  "기타",
];

function makeSub(n, level = "초") {
  const sports = [];
  for (let i = 0; i < n; i++) {
    sports.push({
      id: "s" + i,
      submissionId: "sub1",
      sport: SPORTS[i],
      totalAthletes: i + 1,
      failG1: 0,
      failG2: 0,
      failG3: 0,
      completeG1: 0,
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
    schoolName: "검증초등학교",
    passwordHash: "x",
    createdAt: "",
    updatedAt: "",
    sports,
  };
}

async function check(n) {
  const buf = await exportSchoolWorkbook(makeSub(n));
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(path.join("data", `export-${n}.xlsx`), buf);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.getWorksheet("초등학교") || wb.worksheets[0];

  // 연번(숫자)이 있는 행만 종목 행으로 집계
  const found = [];
  for (let r = 8; r < 8 + n + 20; r++) {
    const num = ws.getCell(r, 2).value;
    const sport = ws.getCell(r, 7).value;
    if (typeof num === "number" && sport) {
      found.push(String(sport));
    }
  }

  const expected = new Set(SPORTS.slice(0, n));
  const foundSet = new Set(found);
  const missing = [...expected].filter((s) => !foundSet.has(s));
  const ok = found.length === n && missing.length === 0;

  // 7개 이상일 때 14행(7번째 데이터 행)이 비지 않았는지 = 옛 B14 병합 버그 회귀 방지
  if (n >= 7) {
    const row14Sport = ws.getCell(14, 7).value;
    const row14Num = ws.getCell(14, 2).value;
    if (row14Num !== 7 || !row14Sport) {
      console.log(n, "FAIL row14 empty/wrong", { row14Num, row14Sport });
      return false;
    }
  }

  console.log(
    n,
    ok ? "PASS" : "FAIL",
    `count=${found.length}`,
    n >= 7 ? `row14=#${ws.getCell(14, 2).value} ${ws.getCell(14, 7).value}` : ""
  );
  if (!ok) console.log("  missing", missing, "found", found);
  return ok;
}

let fail = 0;
for (const n of [1, 6, 7, 8, 15, 50, 55]) {
  if (!(await check(n))) fail++;
}
console.log(fail === 0 ? "\nALL PASS" : `\nFAILED ${fail}`);
process.exit(fail > 0 ? 1 : 0);
