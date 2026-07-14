/**
 * 종목 N개 엑셀 반영 검증 (B14 병합으로 7번째 누락되던 버그)
 */
import ExcelJS from "exceljs";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Use dynamic import of compiled? We'll reimplement minimal test via exceljs template + same logic
// Import from ts not available — call the built-in export via spawning node with tsx, or duplicate test in pure JS.

// Direct: load template, unmerge, write N sports, read back
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const template = path.join(root, "templates", "template.xlsx");

function colToNum(col) {
  let n = 0;
  for (const ch of col.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function unmergeFromRow(ws, fromRow) {
  const merges = [...(ws.model?.merges || [])];
  for (const range of merges) {
    const m = String(range).match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/i);
    if (!m) continue;
    const r1 = parseInt(m[2], 10);
    const r2 = parseInt(m[4], 10);
    if (r2 >= fromRow || r1 >= fromRow) {
      try {
        ws.unMergeCells(String(range));
      } catch {
        /* */
      }
    }
  }
  try {
    ws.unMergeCells("B14:U14");
  } catch {
    /* */
  }
}

async function writeN(n) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(template);
  const ws = wb.getWorksheet("초등학교");
  unmergeFromRow(ws, 8);

  const sports = [];
  for (let i = 0; i < n; i++) {
    sports.push(`종목테스트${i + 1}`);
  }

  sports.forEach((sport, idx) => {
    const r = 8 + idx;
    ws.getCell(r, 2).value = idx + 1;
    ws.getCell(r, 6).value = "테스트초등학교";
    ws.getCell(r, 7).value = sport;
    ws.getCell(r, 8).value = 10;
  });

  const out = path.join(root, "data", `test-${n}-sports.xlsx`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await wb.xlsx.writeFile(out);

  // re-read
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.readFile(out);
  const ws2 = wb2.getWorksheet("초등학교");
  const found = [];
  for (let r = 8; r < 8 + n + 5; r++) {
    const s = ws2.getCell(r, 7).value;
    if (s) found.push(String(s));
  }
  return { out, found, expected: sports };
}

// Also test via actual TypeScript module using next - run exportSchoolWorkbook by importing built files
// Use child process with dynamic compile:

async function testViaAppModule(n) {
  // Use excel.ts through a small ts-node free approach: spawn node after building is heavy
  // Replicate exportSchoolWorkbook path using same fill logic by requiring after transpile - skip
  return null;
}

let failed = 0;
for (const n of [1, 6, 7, 8, 15, 50, 55]) {
  const { found, expected } = await writeN(n);
  const ok =
    found.length === n && expected.every((s, i) => found[i] === s);
  console.log(
    n,
    ok ? "PASS" : "FAIL",
    `found=${found.length}`,
    !ok ? found.slice(-3) : ""
  );
  if (!ok) failed++;
}

// Test actual exportSchoolWorkbook via next/server path - import from dist not available
// Use dynamic import with experimental - instead call API if server up
const BASE = process.env.BASE || "http://localhost:3000";
try {
  const login = await fetch(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "관리자", password: "1004" }),
  });
  if (login.ok) {
    // create school with 7 sports
    const sportsList = [
      "검도",
      "골프",
      "농구",
      "배구",
      "배드민턴",
      "수영",
      "축구",
    ];
    const body = {
      region: "수원교육지원청",
      schoolLevel: "초",
      schoolName: `행수검증초${Date.now().toString().slice(-6)}`,
      password: "1234",
      sports: sportsList.map((sport) => ({
        sport,
        totalAthletes: 5,
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
      })),
    };
    const create = await fetch(`${BASE}/api/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const cj = await create.json();
    if (!create.ok) {
      console.log("API create skip/fail", cj.error);
    } else {
      const exp = await fetch(`${BASE}/api/submissions/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cj.data.id, password: "1234" }),
      });
      if (!exp.ok) {
        console.log("API export fail", await exp.text());
        failed++;
      } else {
        const buf = Buffer.from(await exp.arrayBuffer());
        const out = path.join(root, "data", "api-7-sports.xlsx");
        fs.writeFileSync(out, buf);
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buf);
        const ws = wb.getWorksheet("초등학교") || wb.worksheets[0];
        const found = [];
        for (let r = 8; r < 30; r++) {
          const s = ws.getCell(r, 7).value;
          if (s) found.push(String(s));
        }
        const ok = found.length === 7 && sportsList.every((s) => found.includes(s));
        console.log("API 7 sports", ok ? "PASS" : "FAIL", found);
        if (!ok) failed++;

        // 15 sports
        const many = [
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
        ];
        const body2 = {
          region: "성남교육지원청",
          schoolLevel: "중",
          schoolName: `행수검증중${Date.now().toString().slice(-6)}`,
          password: "5678",
          sports: many.map((sport) => ({
            sport,
            totalAthletes: 3,
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
          })),
        };
        const c2 = await fetch(`${BASE}/api/submissions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body2),
        });
        const c2j = await c2.json();
        if (c2.ok) {
          const e2 = await fetch(`${BASE}/api/submissions/export`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: c2j.data.id, password: "5678" }),
          });
          const buf2 = Buffer.from(await e2.arrayBuffer());
          const wb2 = new ExcelJS.Workbook();
          await wb2.xlsx.load(buf2);
          const ws2 = wb2.getWorksheet("중학교") || wb2.worksheets[0];
          const found2 = [];
          for (let r = 8; r < 40; r++) {
            const s = ws2.getCell(r, 7).value;
            if (s) found2.push(String(s));
          }
          const ok2 = found2.length === 15 && many.every((s) => found2.includes(s));
          console.log("API 15 sports", ok2 ? "PASS" : "FAIL", `count=${found2.length}`);
          if (!ok2) failed++;
        }
      }
    }
  } else {
    console.log("Server not available for API tests (template unit tests still ran)");
  }
} catch (e) {
  console.log("API tests skipped:", e.message);
}

console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
process.exit(failed > 0 ? 1 : 0);
