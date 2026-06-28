import { describe, it, expect } from 'vitest'
import {
  createClock,
  tick,
  pause,
  resume,
  isEnded,
  remainingMs,
} from '../../src/core/sessionClock'

describe('sessionClock — 활성 시간 기준 타이머', () => {
  it('새 시계는 활성 0, 종료 아님, 남은 시간 = 전체', () => {
    const c = createClock(600000) // 10분
    expect(c.activeMs).toBe(0)
    expect(isEnded(c)).toBe(false)
    expect(remainingMs(c)).toBe(600000)
  })

  it('실행 중 tick은 활성 시간을 누적한다', () => {
    let c = createClock(1000)
    c = tick(c, 300)
    c = tick(c, 200)
    expect(c.activeMs).toBe(500)
    expect(remainingMs(c)).toBe(500)
  })

  it('일시정지 중 tick은 누적되지 않고, 재개하면 다시 누적된다', () => {
    let c = createClock(1000)
    c = tick(c, 200) // 200
    c = pause(c)
    c = tick(c, 500) // 무시
    expect(c.activeMs).toBe(200)
    c = resume(c)
    c = tick(c, 300) // 500
    expect(c.activeMs).toBe(500)
  })

  it('totalMs 도달 시 종료(타이머 우선), 남은 시간 0', () => {
    let c = createClock(1000)
    c = tick(c, 1000)
    expect(isEnded(c)).toBe(true)
    expect(remainingMs(c)).toBe(0)
  })

  it('총시간을 넘겨도 활성 시간은 totalMs로 캡(음수 없음)', () => {
    let c = createClock(1000)
    c = tick(c, 5000)
    expect(c.activeMs).toBe(1000)
    expect(remainingMs(c)).toBe(0)
  })

  it('종료 후에는 tick/resume 해도 더 진행하지 않는다', () => {
    let c = createClock(1000)
    c = tick(c, 1000)
    c = resume(c)
    c = tick(c, 500)
    expect(c.activeMs).toBe(1000)
    expect(isEnded(c)).toBe(true)
  })
})
