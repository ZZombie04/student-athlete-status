# 학생선수 기초학력프로그램 이수 현황 시스템

경기도교육청 **2026학년도 1학기 학생선수 최저학력 기준 기초학력프로그램 이수 현황**을 학교에서 웹으로 입력·제출하고, 교육지원청·도교육청 관리자가 **엑셀 서식 탭4 `(지역명) 통계`와 동일한 형식**으로 취합 데이터를 다운로드하는 시스템입니다.

## 주요 기능

### 학교 (사용자)
1. **25개 교육지원청** 선택 → **학교급**(초/중/고) 선택 → **학교명** 입력  
   - `이솔초` → `이솔초등학교`, `미달중` → `미달중학교` 자동 변환  
   - 특수학교(`에바다학교` 등)는 그대로 유지
2. **종목 55개**(기타 포함, 가나다순) 선택, **줄 추가/삭제**로 복수 종목 입력
3. 학년별 **미도달 / 이수 / 기초학력 미달** 정수 입력 (초: 4–6학년, 중·고: 1–3학년)
4. **임시비밀번호 4자리** 설정 후 저장 → 확인 모달 → 제출
5. **입력 내용 확인하기**: 지역·학교급·학교명·비밀번호로 조회·수정
6. **동일 학교명 중복 제출 차단** → 관리자(장학사) 문의 안내

### 관리자
- 아이디: `관리자` / 비밀번호: `1004` (하드코딩)
- 대시보드: 지원청별 제출 현황, 그래프, 최근 제출 목록
- 지원청별 상세 + **탭4 형식 엑셀** 다운로드
- **25개 지원청 전체 취합 엑셀** 다운로드

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, Pretendard |
| Backend | Next.js Route Handlers |
| DB | SQLite (로컬) / **PostgreSQL (Railway)** 자동 전환 |
| Excel | ExcelJS + 원본 서식 템플릿 (`templates/template.xlsx`) |
| Charts | Recharts |
| Toast | Sonner |

`DATABASE_URL`이 `postgres://` 또는 `postgresql://`로 시작하면 PostgreSQL, 그 외(기본 `file:./data/dev.db`)면 SQLite를 사용합니다.

## 로컬 실행

```bash
# 의존성
npm install

# 개발 서버
npm run dev
# → http://localhost:3000

# API 시나리오 테스트 (서버 실행 중)
npm run test:api
```

## Railway 배포

1. [Railway](https://railway.app) 새 프로젝트 생성
2. **GitHub 저장소 연결** (이 레포)
3. **PostgreSQL** 플러그인 추가  
   - Railway가 `DATABASE_URL`을 앱 서비스에 연결(Variable Reference)
4. 환경 변수 확인
   - `DATABASE_URL` = Postgres 연결 문자열
   - `NODE_ENV=production`
5. Deploy → 빌드 후 `npm run start`

### railway.toml
- 빌드: `npm install && npm run build`
- 시작: `npm run start`

### 참고 문서
- [Deploy Next.js with Postgres | Railway](https://docs.railway.com/guides/nextjs)

## 프로젝트 구조

```
src/
  app/
    page.tsx              # 홈
    submit/               # 신규 제출
    view/                 # 입력 확인·수정
    admin/                # 관리자 대시보드
    admin/region/[region] # 지원청 상세
    api/                  # REST API
  components/             # UI
  lib/
    constants.ts          # 25 지원청, 55 종목
    db.ts                 # SQLite/Postgres 듀얼 DB
    excel.ts              # 탭4 형식 엑셀 생성
    school-name.ts        # 학교명 자동완성
templates/
  template.xlsx           # 원본 서식
```

## 관리자 계정

| 항목 | 값 |
|------|-----|
| 아이디 | `관리자` |
| 비밀번호 | `1004` |

> 운영 환경에서는 환경 변수 기반으로 변경하는 것을 권장합니다.

## 라이선스

내부 업무용 (경기도교육청 관련 업무)
