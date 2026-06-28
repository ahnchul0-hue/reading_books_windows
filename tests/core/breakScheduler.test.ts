import { describe, it, expect } from 'vitest'
import {
  BREAK_INTERVAL_MS,
  BREAK_MS,
  shouldBreak,
  createBreak,
  tickBreak,
  isBreakOver,
  breakRemainingMs,
} from '../../src/core/breakScheduler'

describe('breakScheduler — 5분마다 20초 강제 휴식', () => {
  it('상수: 휴식 간격 5분, 휴식 길이 20초', () => {
    expect(BREAK_INTERVAL_MS).toBe(300000)
    expect(BREAK_MS).toBe(20000)
  })

  it('마지막 휴식 이후 활성시간이 5분 이상이면 휴식 트리거', () => {
    expect(shouldBreak(299999)).toBe(false)
    expect(shouldBreak(300000)).toBe(true)
    expect(shouldBreak(450000)).toBe(true)
  })

  it('휴식은 20초 카운트다운, 다 채우기 전엔 끝나지 않음', () => {
    let b = createBreak()
    expect(breakRemainingMs(b)).toBe(20000)
    expect(isBreakOver(b)).toBe(false)
    b = tickBreak(b, 5000)
    expect(breakRemainingMs(b)).toBe(15000)
    expect(isBreakOver(b)).toBe(false)
  })

  it('20초를 모두 채우면 휴식 종료(스킵 불가 — 시간으로만 종료)', () => {
    let b = createBreak()
    b = tickBreak(b, 20000)
    expect(isBreakOver(b)).toBe(true)
    expect(breakRemainingMs(b)).toBe(0)
  })

  it('남은 시간은 음수가 되지 않는다', () => {
    let b = createBreak()
    b = tickBreak(b, 99999)
    expect(breakRemainingMs(b)).toBe(0)
    expect(isBreakOver(b)).toBe(true)
  })

  it('스킵용 강제 종료 API가 존재하지 않는다(시간 경과로만 종료)', async () => {
    const mod = await import('../../src/core/breakScheduler')
    expect((mod as Record<string, unknown>).skipBreak).toBeUndefined()
  })
})
