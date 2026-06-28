import { describe, it, expect } from 'vitest'
import {
  buildLineTimeline,
  sweepXAt,
  lineDuration,
  advanceLine,
} from '../../src/core/sweep'

describe('sweep — 스윕 바 타임라인', () => {
  const chars = [...'가나.다'] // '.' 는 문장 종결부
  const glyphX = [10, 20, 25, 35] // 각 글자 우측 끝 px
  const tl = buildLineTimeline(chars, glyphX, 150)

  it('글자당 150ms, 문장 종결부는 +300ms 정지', () => {
    // 가(150) 나(150) .(150 + hold 300) 다(150) => 활성 600 + hold 300 = 900
    expect(lineDuration(tl)).toBe(900)
  })

  it('x는 0에서 시작해 마지막 glyphX에서 끝난다', () => {
    expect(sweepXAt(tl, 0)).toBeCloseTo(0, 1)
    expect(sweepXAt(tl, 900)).toBeCloseTo(35, 1)
  })

  it('문장 끝 0.3초 동안 x가 고정된다', () => {
    const xAtPauseStart = sweepXAt(tl, 450) // '.' 이동 끝
    const xMidPause = sweepXAt(tl, 600) // 정지 구간 중간
    expect(xMidPause).toBeCloseTo(xAtPauseStart, 1)
    expect(xAtPauseStart).toBeCloseTo(25, 1)
  })

  it('x는 시간에 따라 단조 비감소(뒤로 가지 않음)', () => {
    let prev = -Infinity
    for (let t = 0; t <= lineDuration(tl); t += 25) {
      const x = sweepXAt(tl, t)
      expect(x).toBeGreaterThanOrEqual(prev - 1e-6)
      prev = x
    }
  })

  it('공백은 시간 0이고 폭은 다음 글자가 흡수한다(텔레포트 없음)', () => {
    const c = [...'가 나'] // 가, 공백, 나
    const gx = [10, 15, 25] // 공백 폭(10~15)은 '나' 세그먼트가 흡수
    const t = buildLineTimeline(c, gx, 100)
    // 공백은 시간 0 → 활성 글자 2개 = 200ms
    expect(lineDuration(t)).toBe(200)
    // '나' 세그먼트는 startX=10(가의 끝)에서 endX=25까지 → 공백폭 흡수
    expect(sweepXAt(t, 100)).toBeCloseTo(10, 1) // '가' 끝
    expect(sweepXAt(t, 200)).toBeCloseTo(25, 1) // '나' 끝
  })

  it('빈 줄은 duration 0, x 0', () => {
    const t = buildLineTimeline([], [], 150)
    expect(lineDuration(t)).toBe(0)
    expect(sweepXAt(t, 0)).toBe(0)
  })
})

describe('sweep — 줄/페이지 전환(advanceLine)', () => {
  const pages = [
    ['1줄', '2줄'],
    ['3줄'],
  ]

  it('줄 끝이면 같은 페이지의 다음 줄로', () => {
    expect(advanceLine({ pageIndex: 0, lineIndex: 0 }, pages)).toEqual({
      pageIndex: 0,
      lineIndex: 1,
      ended: false,
    })
  })

  it('페이지 마지막 줄이면 다음 페이지 첫 줄로', () => {
    expect(advanceLine({ pageIndex: 0, lineIndex: 1 }, pages)).toEqual({
      pageIndex: 1,
      lineIndex: 0,
      ended: false,
    })
  })

  it('마지막 페이지 마지막 줄이면 ended=true (글 끝)', () => {
    expect(advanceLine({ pageIndex: 1, lineIndex: 0 }, pages)).toEqual({
      pageIndex: 1,
      lineIndex: 0,
      ended: true,
    })
  })
})
