import { describe, it, expect } from 'vitest'
import { getDateLabel, getSessionTitle, groupByDate } from '../session-utils'

describe('getDateLabel', () => {
  it('유효한 날짜 문자열을 한국어 포맷으로 변환한다', () => {
    expect(getDateLabel('2026-06-12')).toBe('2026년 6월 12일')
  })

  it('월과 일이 한 자리일 때도 올바르게 변환한다', () => {
    expect(getDateLabel('2026-01-05')).toBe('2026년 1월 5일')
  })

  it('빈 문자열은 그대로 반환한다', () => {
    expect(getDateLabel('')).toBe('')
  })

  it('잘못된 날짜 형식은 그대로 반환한다', () => {
    expect(getDateLabel('not-a-date')).toBe('not-a-date')
  })
})

describe('getSessionTitle', () => {
  it('customTitle이 있으면 customTitle을 반환한다', () => {
    expect(getSessionTitle('내 세션', '첫 번째 프롬프트')).toBe('내 세션')
  })

  it('customTitle이 null이고 firstPrompt가 있으면 firstPrompt를 반환한다', () => {
    expect(getSessionTitle(null, '첫 번째 프롬프트')).toBe('첫 번째 프롬프트')
  })

  it('firstPrompt가 60자 이하이면 그대로 반환한다', () => {
    const prompt = 'a'.repeat(60)
    expect(getSessionTitle(null, prompt)).toBe(prompt)
  })

  it('firstPrompt가 60자 초과이면 60자로 truncate하고 "…"를 붙인다', () => {
    const prompt = 'a'.repeat(61)
    expect(getSessionTitle(null, prompt)).toBe('a'.repeat(60) + '…')
  })

  it('customTitle과 firstPrompt 둘 다 null이면 "(제목 없음)"을 반환한다', () => {
    expect(getSessionTitle(null, null)).toBe('(제목 없음)')
  })
})

describe('groupByDate', () => {
  it('날짜 키로 항목을 그룹핑한다', () => {
    const items = [
      { date: '2026-06-12', id: 1 },
      { date: '2026-06-12', id: 2 },
      { date: '2026-06-10', id: 3 },
    ]
    const result = groupByDate(items, (item) => item.date)
    expect(result['2026-06-12']).toHaveLength(2)
    expect(result['2026-06-10']).toHaveLength(1)
  })

  it('날짜 키를 내림차순으로 정렬한다 (최신 날짜 먼저)', () => {
    const items = [
      { date: '2026-06-10', id: 1 },
      { date: '2026-06-12', id: 2 },
      { date: '2026-06-11', id: 3 },
    ]
    const result = groupByDate(items, (item) => item.date)
    const keys = Object.keys(result)
    expect(keys).toEqual(['2026-06-12', '2026-06-11', '2026-06-10'])
  })

  it('같은 날짜 내 항목 순서는 입력 순서를 유지한다', () => {
    const items = [
      { date: '2026-06-12', id: 1 },
      { date: '2026-06-12', id: 2 },
      { date: '2026-06-12', id: 3 },
    ]
    const result = groupByDate(items, (item) => item.date)
    expect(result['2026-06-12'].map((i) => i.id)).toEqual([1, 2, 3])
  })

  it('빈 배열을 넘기면 빈 객체를 반환한다', () => {
    const result = groupByDate([], (item: { date: string }) => item.date)
    expect(result).toEqual({})
  })
})
