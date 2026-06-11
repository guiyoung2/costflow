/**
 * 날짜 문자열(YYYY-MM-DD)을 한국어 포맷("2026년 6월 12일")으로 변환한다.
 * 유효하지 않은 입력은 그대로 반환한다.
 */
export function getDateLabel(dateStr: string): string {
  if (!dateStr) return dateStr

  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return dateStr

  const year = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)
  const day = parseInt(match[3], 10)

  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr

  return `${year}년 ${month}월 ${day}일`
}

/**
 * 세션 제목을 결정한다.
 * - customTitle이 있으면 customTitle 반환
 * - customTitle이 null이고 firstPrompt가 있으면 최대 60자로 truncate
 * - 둘 다 null이면 "(제목 없음)" 반환
 */
export function getSessionTitle(
  customTitle: string | null,
  firstPrompt: string | null,
): string {
  if (customTitle !== null) return customTitle

  if (firstPrompt !== null) {
    return firstPrompt.length > 60
      ? firstPrompt.slice(0, 60) + '…'
      : firstPrompt
  }

  return '(제목 없음)'
}

/**
 * 항목 배열을 날짜 키(YYYY-MM-DD)로 그룹핑한다.
 * 날짜 키는 내림차순 정렬, 같은 날짜 내 순서는 입력 순서를 유지한다.
 */
export function groupByDate<T>(
  items: T[],
  getDate: (item: T) => string,
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {}

  for (const item of items) {
    const date = getDate(item)
    if (!grouped[date]) {
      grouped[date] = []
    }
    grouped[date].push(item)
  }

  const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  const result: Record<string, T[]> = {}
  for (const key of sortedKeys) {
    result[key] = grouped[key]
  }

  return result
}
