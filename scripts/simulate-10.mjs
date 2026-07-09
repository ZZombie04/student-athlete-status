/**
 * 초·중·고·특수학교 10건 시나리오 + 4탭 엑셀 검증
 */
import { writeFileSync } from "fs";
const BASE = process.argv[2] || "http://localhost:3000";

let ok = 0;
let fail = 0;
function assert(c, m) {
  if (c) {
    console.log("  ✅", m);
    ok++;
  } else {
    console.error("  ❌", m);
    fail++;
  }
}

async function j(res) {
  return res.json();
}

function sport(name, total, f1, f2, f3, c1, c2, c3, b1 = 0, b2 = 0, b3 = 0, note = "") {
  return {
    sport: name,
    totalAthletes: total,
    failG1: f1,
    failG2: f2,
    failG3: f3,
    completeG1: c1,
    completeG2: c2,
    completeG3: c3,
    basicFailG1: b1,
    basicFailG2: b2,
    basicFailG3: b3,
    note,
  };
}

const scenarios = [
  {
    region: "수원교육지원청",
    schoolLevel: "초",
    schoolName: "매탄초",
    password: "1001",
    sports: [sport("축구", 20, 1, 2, 0, 1, 2, 0, 0, 1, 0)],
  },
  {
    region: "수원교육지원청",
    schoolLevel: "중",
    schoolName: "영통중",
    password: "1002",
    sports: [sport("농구", 15, 0, 1, 1, 0, 1, 1)],
  },
  {
    region: "성남교육지원청",
    schoolLevel: "고",
    schoolName: "분당고",
    password: "1003",
    sports: [
      sport("야구소프트볼(야구)", 25, 2, 1, 1, 2, 1, 0, 1, 0, 0),
      sport("핸드볼", 8, 0, 0, 1, 0, 0, 1),
    ],
  },
  {
    region: "고양교육지원청",
    schoolLevel: "초",
    schoolName: "에바다학교",
    password: "2001",
    sports: [sport("기타", 6, 1, 0, 0, 1, 0, 0, 0, 0, 0, "특수 초")],
  },
  {
    region: "고양교육지원청",
    schoolLevel: "중",
    schoolName: "에바다학교",
    password: "2002",
    sports: [sport("기타", 7, 0, 1, 0, 0, 1, 0)],
  },
  {
    region: "고양교육지원청",
    schoolLevel: "고",
    schoolName: "에바다학교",
    password: "2003",
    sports: [sport("기타", 5, 0, 0, 1, 0, 0, 1)],
  },
  {
    region: "용인교육지원청",
    schoolLevel: "초",
    schoolName: "신봉초",
    password: "3001",
    sports: [sport("수영", 12, 0, 2, 1, 0, 2, 1)],
  },
  {
    region: "용인교육지원청",
    schoolLevel: "중",
    schoolName: "구성중",
    password: "3002",
    sports: [sport("태권도", 10, 1, 0, 2, 1, 0, 2)],
  },
  {
    region: "화성오산교육지원청",
    schoolLevel: "고",
    schoolName: "동탄고",
    password: "4001",
    sports: [sport("육상", 18, 1, 1, 1, 1, 1, 1, 0, 1, 0)],
  },
  {
    region: "부천교육지원청",
    schoolLevel: "중",
    schoolName: "원미중",
    password: "5001",
    sports: [sport("배드민턴", 9, 0, 0, 0, 0, 0, 0)],
  },
];

async function main() {
  console.log("\n🧪 10-scenario simulation @", BASE, "\n");

  // admin
  const login = await fetch(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "관리자", password: "1004" }),
  });
  const loginBody = await j(login);
  assert(login.ok && loginBody.token, "admin login");
  const token = loginBody.token;

  // create 10
  console.log("1) Create 10 submissions (초/중/고/특수)");
  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    const res = await fetch(`${BASE}/api/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    const body = await j(res);
    assert(res.ok, `#${i + 1} ${s.schoolName}(${s.schoolLevel}) status=${res.status} ${body.error || ""}`);
  }

  // special school 3 levels exist
  console.log("2) Special school multi-level");
  for (const level of ["초", "중", "고"]) {
    const res = await fetch(`${BASE}/api/submissions/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region: "고양교육지원청",
        schoolLevel: level,
        schoolName: "에바다학교",
        password: level === "초" ? "2001" : level === "중" ? "2002" : "2003",
      }),
    });
    assert(res.ok, `에바다학교 ${level} login`);
  }

  // regular duplicate
  console.log("3) Regular school duplicate blocked");
  {
    const res = await fetch(`${BASE}/api/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region: "수원교육지원청",
        schoolLevel: "초",
        schoolName: "매탄초등학교",
        password: "9999",
        sports: [sport("축구", 1, 0, 0, 0, 0, 0, 0)],
      }),
    });
    assert(res.status === 409, "매탄초 중복 409");
  }

  // stats
  console.log("4) Admin stats");
  {
    const res = await fetch(`${BASE}/api/admin/stats`, {
      headers: { "x-admin-token": token },
    });
    const body = await j(res);
    assert(res.ok, "stats ok");
    assert(body.data.totalSchools >= 10, `schools>=10 got ${body.data.totalSchools}`);
    const goyang = body.data.byRegion.find((r) => r.region === "고양교육지원청");
    assert(goyang?.countElementary >= 1, "고양 초");
    assert(goyang?.countMiddle >= 1, "고양 중");
    assert(goyang?.countHigh >= 1, "고양 고");
  }

  // full excel 4 sheets
  console.log("5) Full excel 4 tabs");
  {
    const res = await fetch(`${BASE}/api/admin/export`, {
      headers: { "x-admin-token": token },
    });
    assert(res.ok, `export ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync("data/sim-full.xlsx", buf);
    assert(buf[0] === 0x50 && buf[1] === 0x4b, "xlsx zip");

    // parse with dynamic import of exceljs if available via node
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const names = wb.worksheets.map((w) => w.name);
    console.log("   sheets:", names.join(" | "));
    assert(names.includes("초등학교"), "sheet 초");
    assert(names.includes("중학교"), "sheet 중");
    assert(names.includes("고등학교"), "sheet 고");
    assert(names.some((n) => n.includes("통계")), "sheet 통계");

    const elem = wb.getWorksheet("초등학교");
    // row 8 should have data for 매탄 or 신봉 or 에바다
    const schools = [];
    for (let r = 8; r < 30; r++) {
      const name = elem.getCell(r, 6).value;
      if (name) schools.push(String(name));
    }
    console.log("   초 학교행:", schools.join(", "));
    assert(schools.some((s) => s.includes("매탄") || s.includes("신봉") || s.includes("에바다")), "초 데이터 존재");

    // 축구 total in stats for 초 - 매탄 20
    const stats = wb.worksheets.find((w) => w.name.includes("통계"));
    let soccerRow = null;
    for (let r = 9; r <= 63; r++) {
      if (stats.getCell(r, 3).value === "축구") {
        soccerRow = r;
        break;
      }
    }
    assert(soccerRow, "축구 종목 행");
    const soccerElemTotal = Number(stats.getCell(soccerRow, 4).value) || 0;
    assert(soccerElemTotal >= 20, `축구 초 total >=20 got ${soccerElemTotal}`);
  }

  // region excel
  console.log("6) Region excel (수원) 4 tabs");
  {
    const res = await fetch(
      `${BASE}/api/admin/export?region=${encodeURIComponent("수원교육지원청")}`,
      { headers: { "x-admin-token": token } }
    );
    assert(res.ok, "region export");
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync("data/sim-suwon.xlsx", buf);
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    assert(wb.worksheets.length === 4, `4 sheets got ${wb.worksheets.length}`);
    const mid = wb.getWorksheet("중학교");
    let found = false;
    for (let r = 8; r < 20; r++) {
      if (String(mid.getCell(r, 6).value || "").includes("영통")) found = true;
    }
    assert(found, "수원 중 영통 데이터");
  }

  // school update
  console.log("7) School update");
  {
    const loginRes = await fetch(`${BASE}/api/submissions/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region: "부천교육지원청",
        schoolLevel: "중",
        schoolName: "원미중",
        password: "5001",
      }),
    });
    const lb = await j(loginRes);
    assert(loginRes.ok, "원미중 login");
    const res = await fetch(`${BASE}/api/submissions/${lb.data.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "5001",
        sports: [sport("배드민턴", 11, 1, 0, 0, 1, 0, 0)],
      }),
    });
    const body = await j(res);
    assert(res.ok && body.data.sports[0].totalAthletes === 11, "update athletes 11");
  }

  // admin detail get
  console.log("8) Admin get/delete safety (get only)");
  {
    const statsRes = await fetch(
      `${BASE}/api/admin/stats?region=${encodeURIComponent("부천교육지원청")}`,
      { headers: { "x-admin-token": token } }
    );
    const st = await j(statsRes);
    const id = st.data.submissions[0]?.id;
    assert(!!id, "부천 submission id");
    const res = await fetch(`${BASE}/api/admin/submissions/${id}`, {
      headers: { "x-admin-token": token },
    });
    assert(res.ok, "admin get detail");
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Results: ${ok} passed, ${fail} failed`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
