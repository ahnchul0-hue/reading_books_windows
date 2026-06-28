import { describe, it, expect } from 'vitest'
import {
  toLocalDateKey,
  activeDateSet,
  computeStreak,
  monthlyCalendar,
  lastNDaysMinutes,
} from '../../src/core/stats'

describe('stats — toLocalDateKey / activeDateSet', () => {
  it('ISO를 로컬 날짜 키로', () => {
    expect(toLocalDateKey('2026-06-15T10:30:00')).toBe('2026-06-15')
  })
  it('중복 날짜는 집합으로', () => {
    const s = activeDateSet(['2026-06-15T09:00:00', '2026-06-15T20:00:00', '2026-06-16T08:00:00'])
    expect(s.size).toBe(2)
    expect(s.has('2026-06-15')).toBe(true)
  })
})

describe('stats — computeStreak', () => {
  it('오늘 포함 연속', () => {
    const a = new Set(['2026-06-27', '2026-06-28', '2026-06-29'])
    expect(computeStreak(a, '2026-06-29')).toBe(3)
  })
  it('오늘 안 했어도 어제까지 연속이면 유지', () => {
    const a = new Set(['2026-06-27', '2026-06-28'])
    expect(computeStreak(a, '2026-06-29')).toBe(2)
  })
  it('중간에 빈 날이면 끊김', () => {
    const a = new Set(['2026-06-25', '2026-06-28', '2026-06-29'])
    expect(computeStreak(a, '2026-06-29')).toBe(2)
  })
  it('최근 이틀 모두 안 했으면 0', () => {
    const a = new Set(['2026-06-20'])
    expect(computeStreak(a, '2026-06-29')).toBe(0)
  })
  it('기록 없으면 0', () => {
    expect(computeStreak(new Set(), '2026-06-29')).toBe(0)
  })
})

describe('stats — monthlyCalendar', () => {
  // 2026년 6월: 1일은 월요일(getDay=1), 30일까지
  const cal = monthlyCalendar(2026, 5, new Set(['2026-06-15', '2026-06-29']), '2026-06-29')

  it('7칸짜리 주들로 구성', () => {
    cal.forEach((w) => expect(w).toHaveLength(7))
  })
  it('첫 주는 일요일 자리 1칸이 비고 1일은 월요일 칸', () => {
    expect(cal[0][0]).toBeNull() // 일요일 빈칸
    expect(cal[0][1]?.day).toBe(1) // 월요일=1일
  })
  it('활동한 날 active=true, 오늘 표시', () => {
    const all = cal.flat().filter(Boolean) as { day: number; active: boolean; isToday: boolean }[]
    expect(all.find((c) => c.day === 15)!.active).toBe(true)
    expect(all.find((c) => c.day === 29)!.isToday).toBe(true)
    expect(all.find((c) => c.day === 10)!.active).toBe(false)
  })
  it('모든 날(1~30)이 포함된다', () => {
    const days = (cal.flat().filter(Boolean) as { day: number }[]).map((c) => c.day)
    expect(days).toEqual(Array.from({ length: 30 }, (_, i) => i + 1))
  })
})

describe('stats — lastNDaysMinutes', () => {
  it('최근 N일 분(分) 집계, 오래된→최신', () => {
    const sessions = [
      { startedAt: '2026-06-29T09:00:00', activeMs: 600000 }, // 10분
      { startedAt: '2026-06-29T10:00:00', activeMs: 300000 }, // 5분
      { startedAt: '2026-06-27T09:00:00', activeMs: 600000 }, // 10분
    ]
    const r = lastNDaysMinutes(sessions, '2026-06-29', 3)
    expect(r.map((x) => x.dateKey)).toEqual(['2026-06-27', '2026-06-28', '2026-06-29'])
    expect(r.map((x) => x.minutes)).toEqual([10, 0, 15])
  })
})
