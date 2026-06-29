import { describe, it, expect } from 'vitest'
import { buildLineTimeline, sweepXAt, lineDuration, advanceLine } from '../../src/core/sweep'

describe('sweep — 균일 이동 + 문장끝 멈춤', () => {
  const chars = [...'가나.다'] // '.' 는 문장 종결부
  const glyphX = [10, 20, 25, 35]
  const tl = buildLineTimeline(chars, glyphX, 150)

  it('총시간 = 글자수×150 + 문장끝 300ms', () => {
    // 활성 4글자 = 600ms, 문장끝 1회 = +300 → 900
    expect(lineDuration(tl)).toBe(900)
  })

  it('0에서 시작, 마지막 glyphX에서 끝', () => {
    expect(sweepXAt(tl, 0)).toBeCloseTo(0, 1)
    expect(sweepXAt(tl, 900)).toBeCloseTo(35, 1)
  })

  it('문장 끝(x=25)에서 0.3초 멈춘다', () => {
    const a = sweepXAt(tl, 450)
    const b = sweepXAt(tl, 600)
    expect(a).toBeCloseTo(25, 1)
    expect(b).toBeCloseTo(25, 1)
  })

  it('x는 단조 비감소', () => {
    let prev = -Infinity
    for (let t = 0; t <= 900; t += 25) {
      const x = sweepXAt(tl, t)
      expect(x).toBeGreaterThanOrEqual(prev - 1e-6)
      prev = x
    }
  })

  it('멈춤 없는 줄은 완전히 균일한 속도(공백에서도 튀지 않음)', () => {
    const t = buildLineTimeline([...'가 나'], [10, 15, 25], 100) // 공백 포함
    expect(lineDuration(t)).toBe(200) // 활성 2글자
    // 균일: 절반 시간 → 절반 픽셀
    expect(sweepXAt(t, 100)).toBeCloseTo(12.5, 1)
    expect(sweepXAt(t, 200)).toBeCloseTo(25, 1)
    // 같은 시간 간격 = 같은 이동량
    const d1 = sweepXAt(t, 100) - sweepXAt(t, 50)
    const d2 = sweepXAt(t, 150) - sweepXAt(t, 100)
    expect(d1).toBeCloseTo(d2, 5)
  })

  it('빈 줄은 duration 0, x 0', () => {
    const t = buildLineTimeline([], [], 150)
    expect(lineDuration(t)).toBe(0)
    expect(sweepXAt(t, 0)).toBe(0)
  })
})

describe('sweep — 줄/페이지 전환(advanceLine)', () => {
  const pages = [['1줄', '2줄'], ['3줄']]
  it('줄 끝이면 같은 페이지 다음 줄', () => {
    expect(advanceLine({ pageIndex: 0, lineIndex: 0 }, pages)).toEqual({ pageIndex: 0, lineIndex: 1, ended: false })
  })
  it('페이지 끝이면 다음 페이지 첫 줄', () => {
    expect(advanceLine({ pageIndex: 0, lineIndex: 1 }, pages)).toEqual({ pageIndex: 1, lineIndex: 0, ended: false })
  })
  it('마지막이면 ended', () => {
    expect(advanceLine({ pageIndex: 1, lineIndex: 0 }, pages)).toEqual({ pageIndex: 1, lineIndex: 0, ended: true })
  })
})
