"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, Info } from "lucide-react";

export default function InputGuide() {
  const [open, setOpen] = useState(false);

  return (
    <section className="card overflow-hidden border-blue-100/80">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 bg-gradient-to-r from-blue-50 to-sky-50/80 px-5 py-4 text-left transition hover:from-blue-50/90"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">
              작성 안내 · 입력 가이드
            </div>
            <div className="text-xs text-slate-500">
              입력 전 작성 안내 및 입력가이드를 반드시 확인해 주세요.
            </div>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-slate-100 px-5 py-5">
          <GuideBlock
            badge="안내"
            badgeClass="badge-blue"
            title="최저학력제 안내"
            items={[
              "적용시기 및 대상: 2026년 1학기, 초4–고3 학생선수 (동호인 선수 등록 학생은 제외)",
              "적용 교과: (초·중) 국어, 사회, 수학, 과학, 영어 / (고) 국어, 영어, 사회 (영어·사회는 수학·과학으로 대체 가능)",
              "최저 학력 기준: 해당 학년 교과별 평균성적 대비 초 50%, 중 40%, 고 30%",
            ]}
            note="예시) 학년 평균 70점 → 초 35점(50%), 중 28점(40%), 고 21점(30%)이 기준"
          />

          <GuideBlock
            badge="구분"
            badgeClass="badge-amber"
            title="기초학력 미도달"
            items={[
              "학교체육진흥법상 최저학력 미도달 학생선수 중, 기초학력 보장법에 따른 기초학력 미도달 학생선수 수를 입력합니다.",
              "이번 조사로 최저학력 미도달과 기초학력 미도달의 상관관계를 확인한 뒤, 통합·연계 방안을 연구·적용할 예정입니다.",
            ]}
          />

          <GuideBlock
            badge="필수"
            badgeClass="badge-green"
            title="작성방법"
            items={[
              "학교 내 2종목 이상의 운동부를 운영할 경우 행을 추가하여 각각 작성합니다. (반드시 준수)",
              "예시) A학교: 축구·배드민턴·골프 개인선수 → 1행 축구, 2행 배드민턴, 3행 골프 현황을 각각 작성",
              "학년별 최저학력기준 미도달: 1과목 이상 미도달 학생선수 수를 학년별로 입력 (없으면 0)",
              "예시) 핸드볼 미도달 3명(4학년 1·6학년 2) → 4학년에 1, 6학년에 2 입력",
              "기초학력프로그램 이수: 미도달 학생 중 프로그램 이수 완료 또는 이수 중인 학생 수",
              "일부 과목 이수·일부 이수 중이면 이수 학생에 포함 / 1과목이라도 미이이면 불포함(출전 제한 등)",
              "예시) 4과목 미도달 중 3과목 이수·1과목 미이수 → 기초학력프로그램 미이수",
            ]}
          />

          <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3.5 py-3 text-xs leading-relaxed text-slate-600">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
            <p>
              종목별 현황의 세 가지 입력 항목 제목(
              <strong className="text-slate-800">미도달 · 이수 · 기초학력 미달</strong>
              )에 커서를 올리면 항목별 입력 방법이 표시됩니다.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function GuideBlock({
  badge,
  badgeClass,
  title,
  items,
  note,
}: {
  badge: string;
  badgeClass: string;
  title: string;
  items: string[];
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className={`badge ${badgeClass}`}>{badge}</span>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>
      <ul className="space-y-1.5 text-xs leading-relaxed text-slate-600">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
      {note && (
        <p className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-500">
          {note}
        </p>
      )}
    </div>
  );
}

/** 3개 지표 카드 제목용 호버 툴팁 본문 */
export const METRIC_TOOLTIPS = {
  fail: {
    title: "학년별 최저학력기준 미도달 학생선수 수",
    lines: [
      "학생선수 중 1과목 이상 최저학력기준에 미도달한 학생선수의 수를 학년별로 입력합니다.",
      "미도달 학생이 없으면 0으로 입력합니다.",
      "예시) 핸드볼 종목에서 미도달 3명(4학년 1명, 6학년 2명) → 4학년에 1, 6학년에 2 입력",
      "최저학력 기준: 해당 학년 교과 평균 대비 초 50% · 중 40% · 고 30%",
    ],
  },
  complete: {
    title: "기초학력프로그램 이수 학생선수 수",
    lines: [
      "학년별 최저학력기준 미도달 학생선수 중, 기초학력프로그램을 이수 완료 또는 이수 중인 학생선수 수를 입력합니다.",
      "2개 과목 이상 미도달 학생이 일부 과목은 이수 완료·일부는 이수 중인 경우 → 이수 학생선수에 포함합니다.",
      "1개 과목이라도 기초학력프로그램을 미이수한 경우 → 이수 학생선수 수에 포함하지 않습니다.",
      "예시) 4과목 미도달 중 3과목 이수·1과목 미이수 → 미이수(이수 수에 불포함), 경기대회 출전 제한 등 조치 대상",
    ],
  },
  basicFail: {
    title: "기초학력 미달 학생선수 수",
    lines: [
      "최저학력(학교체육진흥법) 미도달 학생선수 중, 기초학력 보장법에 따른 기초학력 미도달 학생선수 수를 입력합니다.",
      "금번 조사로 최저학력 미도달과 기초학력 미도달의 상관관계를 확인한 뒤 통합·연계 방안을 연구·적용할 예정입니다.",
      "적용 대상: 2026년 1학기 초4–고3 학생선수 (동호인 선수 제외)",
    ],
  },
} as const;
