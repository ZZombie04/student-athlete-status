import type { SchoolLevel } from "./constants";

/**
 * 학교명 자동 정규화
 * - 이솔초 → 이솔초등학교
 * - 미달중 → 미달중학교
 * - 에바다학교 등 특수학교는 그대로
 */
export function normalizeSchoolName(
  raw: string,
  schoolLevel: SchoolLevel
): string {
  const name = raw.trim().replace(/\s+/g, "");
  if (!name) return "";

  // 이미 정식 명칭
  if (/초등학교$/.test(name) || /중학교$/.test(name) || /고등학교$/.test(name)) {
    return name;
  }

  // 특수학교 등: "~학교"로 끝나면 그대로 (에바다학교 등)
  if (/학교$/.test(name)) {
    return name;
  }

  // 약칭 접미사
  if (name.endsWith("초")) {
    return name.slice(0, -1) + "초등학교";
  }
  if (name.endsWith("중")) {
    return name.slice(0, -1) + "중학교";
  }
  if (name.endsWith("고")) {
    return name.slice(0, -1) + "고등학교";
  }

  // 접미사 없이 입력한 경우 학교급 기준 자동 부여
  const suffixMap: Record<SchoolLevel, string> = {
    초: "초등학교",
    중: "중학교",
    고: "고등학교",
  };
  return name + suffixMap[schoolLevel];
}

export function schoolLevelLabel(level: SchoolLevel): string {
  const map: Record<SchoolLevel, string> = {
    초: "초등학교",
    중: "중학교",
    고: "고등학교",
  };
  return map[level];
}
