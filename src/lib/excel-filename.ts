/**
 * 엑셀 다운로드 파일명 규칙
 * - 학교: 2026년 1학기 학생선수 최저학력 기준 기초학력프로그램 이수 현황(학교명).xlsx
 * - 지역청: 2026년 1학기 학생선수 최저학력 기준 기초학력프로그램 이수 현황(지역교육청명).xlsx
 * - 전체: 2026년 1학기 학생선수 최저학력 기준 기초학력프로그램 이수 현황(경기도교육청).xlsx
 */

const PREFIX =
  "2026년 1학기 학생선수 최저학력 기준 기초학력프로그램 이수 현황";

/** Windows 파일명 불가 문자 제거 */
function sanitize(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function excelFilenameForSchool(schoolName: string): string {
  return `${PREFIX}(${sanitize(schoolName)}).xlsx`;
}

export function excelFilenameForRegion(regionName: string): string {
  return `${PREFIX}(${sanitize(regionName)}).xlsx`;
}

export function excelFilenameForProvince(): string {
  return `${PREFIX}(경기도교육청).xlsx`;
}

export function contentDispositionAttachment(filename: string): string {
  return `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/** Content-Disposition 헤더에서 파일명 추출 */
export function parseFilenameFromContentDisposition(
  header: string | null,
  fallback: string
): string {
  if (!header) return fallback;
  const m = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (m?.[1]) {
    try {
      return decodeURIComponent(m[1].trim());
    } catch {
      /* ignore */
    }
  }
  const m2 = header.match(/filename="?([^";]+)"?/i);
  if (m2?.[1]) return m2[1].trim();
  return fallback;
}
