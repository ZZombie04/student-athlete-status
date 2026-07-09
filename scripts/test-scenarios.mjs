/**
 * End-to-end API scenario tests
 * Usage: node scripts/test-scenarios.mjs [baseUrl]
 */
const BASE = process.argv[2] || "http://localhost:3000";

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ ${msg}`);
    failed++;
  }
}

async function json(res) {
  const t = await res.text();
  try {
    return JSON.parse(t);
  } catch {
    return { raw: t };
  }
}

async function main() {
  console.log(`\n🧪 Testing against ${BASE}\n`);

  // 1. Admin login fail
  console.log("1. Admin login invalid");
  {
    const res = await fetch(`${BASE}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "관리자", password: "0000" }),
    });
    assert(res.status === 401, "wrong password → 401");
  }

  // 2. Admin login ok
  console.log("2. Admin login valid");
  let adminToken = "";
  {
    const res = await fetch(`${BASE}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "관리자", password: "1004" }),
    });
    const body = await json(res);
    assert(res.ok && body.token, "admin login success");
    adminToken = body.token;
  }

  // 3. Create elementary school submission
  console.log("3. Create submission (초) 이솔초 → 이솔초등학교");
  {
    const res = await fetch(`${BASE}/api/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region: "수원교육지원청",
        schoolLevel: "초",
        schoolName: "이솔초",
        password: "1234",
        sports: [
          {
            sport: "축구",
            totalAthletes: 30,
            failG1: 1,
            failG2: 0,
            failG3: 2,
            completeG1: 1,
            completeG2: 0,
            completeG3: 2,
            basicFailG1: 0,
            basicFailG2: 0,
            basicFailG3: 1,
            note: "",
          },
          {
            sport: "배드민턴",
            totalAthletes: 10,
            failG1: 0,
            failG2: 1,
            failG3: 0,
            completeG1: 0,
            completeG2: 1,
            completeG3: 0,
            basicFailG1: 0,
            basicFailG2: 0,
            basicFailG3: 0,
            note: "",
          },
        ],
      }),
    });
    const body = await json(res);
    assert(res.ok, `create ok status=${res.status}`);
    assert(body.data?.schoolName === "이솔초등학교", `normalized name: ${body.data?.schoolName}`);
  }

  // 4. Duplicate school
  console.log("4. Duplicate school name blocked");
  {
    const res = await fetch(`${BASE}/api/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region: "성남교육지원청",
        schoolLevel: "초",
        schoolName: "이솔초등학교",
        password: "9999",
        sports: [
          {
            sport: "축구",
            totalAthletes: 1,
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
          },
        ],
      }),
    });
    const body = await json(res);
    assert(res.status === 409, "duplicate → 409");
    assert(body.code === "DUPLICATE_SCHOOL", "code DUPLICATE_SCHOOL");
    assert(
      String(body.error).includes("관리자"),
      "error mentions 관리자/장학사"
    );
  }

  // 5. School login wrong password
  console.log("5. School login wrong password");
  {
    const res = await fetch(`${BASE}/api/submissions/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region: "수원교육지원청",
        schoolLevel: "초",
        schoolName: "이솔초",
        password: "0000",
      }),
    });
    assert(res.status === 401, "wrong pw → 401");
  }

  // 6. School login ok + update
  console.log("6. School login + update");
  let subId = "";
  {
    const res = await fetch(`${BASE}/api/submissions/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region: "수원교육지원청",
        schoolLevel: "초",
        schoolName: "이솔초등학교",
        password: "1234",
      }),
    });
    const body = await json(res);
    assert(res.ok, "login ok");
    assert(body.data?.sports?.length === 2, "2 sports loaded");
    subId = body.data.id;

    const res2 = await fetch(`${BASE}/api/submissions/${subId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "1234",
        sports: [
          {
            sport: "축구",
            totalAthletes: 35,
            failG1: 2,
            failG2: 1,
            failG3: 2,
            completeG1: 2,
            completeG2: 1,
            completeG3: 2,
            basicFailG1: 0,
            basicFailG2: 0,
            basicFailG3: 1,
            note: "수정됨",
          },
        ],
      }),
    });
    const body2 = await json(res2);
    assert(res2.ok, "update ok");
    assert(body2.data?.sports?.[0]?.totalAthletes === 35, "athletes updated to 35");
  }

  // 7. Middle school + special school name
  console.log("7. Middle school + special school name");
  {
    const res = await fetch(`${BASE}/api/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region: "용인교육지원청",
        schoolLevel: "중",
        schoolName: "미달중",
        password: "5678",
        sports: [
          {
            sport: "태권도",
            totalAthletes: 12,
            failG1: 1,
            failG2: 0,
            failG3: 1,
            completeG1: 1,
            completeG2: 0,
            completeG3: 1,
            basicFailG1: 0,
            basicFailG2: 0,
            basicFailG3: 0,
            note: "",
          },
        ],
      }),
    });
    const body = await json(res);
    assert(body.data?.schoolName === "미달중학교", `중 정규화: ${body.data?.schoolName}`);

    // 특수학교: 초/중/고 각각 입력 가능
    for (const level of ["초", "중", "고"]) {
      const res2 = await fetch(`${BASE}/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: "고양교육지원청",
          schoolLevel: level,
          schoolName: "에바다학교",
          password: "1111",
          sports: [
            {
              sport: "기타",
              totalAthletes: 5,
              failG1: 0,
              failG2: 1,
              failG3: 0,
              completeG1: 0,
              completeG2: 1,
              completeG3: 0,
              basicFailG1: 0,
              basicFailG2: 0,
              basicFailG3: 0,
              note: "특수학교",
            },
          ],
        }),
      });
      const body2 = await json(res2);
      assert(res2.ok, `특수학교 ${level} 입력 ok`);
      assert(body2.data?.schoolName === "에바다학교", `특수학교 유지: ${body2.data?.schoolName}`);
    }
    // 특수학교 동일 학교급 중복 차단
    const resDup = await fetch(`${BASE}/api/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region: "고양교육지원청",
        schoolLevel: "초",
        schoolName: "에바다학교",
        password: "2222",
        sports: [
          {
            sport: "기타",
            totalAthletes: 1,
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
          },
        ],
      }),
    });
    assert(resDup.status === 409, "특수학교 동일 학교급 중복 차단");
  }

  // 8. High school another region
  console.log("8. High school 성남");
  {
    const res = await fetch(`${BASE}/api/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region: "성남교육지원청",
        schoolLevel: "고",
        schoolName: "분당고",
        password: "4321",
        sports: [
          {
            sport: "농구",
            totalAthletes: 20,
            failG1: 2,
            failG2: 2,
            failG3: 1,
            completeG1: 2,
            completeG2: 2,
            completeG3: 1,
            basicFailG1: 1,
            basicFailG2: 0,
            basicFailG3: 0,
            note: "",
          },
          {
            sport: "핸드볼",
            totalAthletes: 8,
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
          },
        ],
      }),
    });
    const body = await json(res);
    assert(body.data?.schoolName === "분당고등학교", `고 정규화: ${body.data?.schoolName}`);
  }

  // 9. Admin stats
  console.log("9. Admin stats aggregation");
  {
    const res = await fetch(`${BASE}/api/admin/stats`, {
      headers: { "x-admin-token": adminToken },
    });
    const body = await json(res);
    assert(res.ok, "stats ok");
    assert(body.data.totalSchools >= 4, `schools >= 4: ${body.data.totalSchools}`);
    assert(body.data.totalAthletes > 0, `athletes > 0: ${body.data.totalAthletes}`);
    const suwon = body.data.byRegion.find((r) => r.region === "수원교육지원청");
    assert(suwon?.submissionCount >= 1, "수원 has submissions");
  }

  // 10. Region export excel
  console.log("10. Region excel export (tab4)");
  {
    const res = await fetch(
      `${BASE}/api/admin/export?region=${encodeURIComponent("수원교육지원청")}`,
      { headers: { "x-admin-token": adminToken } }
    );
    assert(res.ok, `export status ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    assert(buf.length > 1000, `xlsx size ${buf.length}`);
    // xlsx magic: PK
    assert(buf[0] === 0x50 && buf[1] === 0x4b, "is zip/xlsx");
  }

  // 11. Full export
  console.log("11. Full province excel export");
  {
    const res = await fetch(`${BASE}/api/admin/export`, {
      headers: { "x-admin-token": adminToken },
    });
    assert(res.ok, `full export status ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    assert(buf.length > 1000, `xlsx size ${buf.length}`);
  }

  // 12. Invalid sport rejected
  console.log("12. Invalid sport rejected");
  {
    const res = await fetch(`${BASE}/api/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region: "파주교육지원청",
        schoolLevel: "초",
        schoolName: "테스트초등학교",
        password: "2222",
        sports: [
          {
            sport: "없는종목",
            totalAthletes: 1,
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
          },
        ],
      }),
    });
    assert(res.status === 400, "invalid sport → 400");
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
