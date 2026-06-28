// 스윕 바 타임라인 (순수 로직 — 가장 어려운 로직)
// 핵심: "시간 축"과 "픽셀 축"을 분리해 한 줄을 세그먼트(글자 1개=1세그먼트) 타임라인으로.
//  - 각 세그먼트: 진행 시간(msPerChar) + 화면 위치(startX→endX), 문장 종결부면 끝에서 holdMs 정지.
//  - 공백은 시간 0이되, 그 픽셀 폭은 다음 글자 세그먼트의 시작 x로 흡수해 텔레포트를 막는다.

export interface Segment {
  startMs: number
  endMs: number
  startX: number
  endX: number
  holdMs: number
}

const SENTENCE_END = /[.?!…]/ // 문장 종결부 → 0.3초(300ms) 정지
const HOLD_MS = 300

/**
 * 한 줄의 타임라인을 만든다.
 * @param chars  줄의 글자 배열
 * @param glyphX 각 글자 우측 끝의 픽셀 x (Frontend가 글꼴 로드 후 측정해 주입)
 * @param msPerChar 1글자당 진행 시간(ms) — cpm.msPerChar()
 */
export function buildLineTimeline(
  chars: string[],
  glyphX: number[],
  msPerChar: number,
): Segment[] {
  const segs: Segment[] = []
  let t = 0
  let prevX = 0
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    const xEnd = glyphX[i]
    if (/\s/.test(ch)) {
      prevX = xEnd // 공백: 시간 0, 폭은 다음 글자 세그먼트가 흡수
      continue
    }
    const hold = SENTENCE_END.test(ch) ? HOLD_MS : 0
    segs.push({ startMs: t, endMs: t + msPerChar, startX: prevX, endX: xEnd, holdMs: hold })
    t += msPerChar + hold
    prevX = xEnd
  }
  return segs
}

/** 한 줄의 총 진행 시간(ms) = 마지막 세그먼트 종료 + 그 정지시간. */
export function lineDuration(tl: Segment[]): number {
  if (!tl.length) return 0
  const last = tl[tl.length - 1]
  return last.endMs + last.holdMs
}

/** 경과 시간(ms) → 스윕 바의 x 픽셀 위치. */
export function sweepXAt(tl: Segment[], elapsed: number): number {
  if (!tl.length) return 0
  for (const s of tl) {
    if (elapsed <= s.endMs) {
      // 이동 구간: 선형 보간
      const r = (elapsed - s.startMs) / (s.endMs - s.startMs)
      return s.startX + (s.endX - s.startX) * Math.max(0, Math.min(1, r))
    }
    if (elapsed <= s.endMs + s.holdMs) {
      return s.endX // 문장 끝 정지: x 고정
    }
  }
  return tl[tl.length - 1].endX
}

export interface LinePos {
  pageIndex: number
  lineIndex: number
}

export interface AdvanceResult extends LinePos {
  ended: boolean
}

/**
 * 현재 줄을 다 읽었을 때 다음 위치를 계산한다.
 *  - 줄 끝 → 같은 페이지 다음 줄
 *  - 페이지 끝 → 다음 페이지 첫 줄
 *  - 마지막 페이지 끝 → ended=true (글 끝; 호출자가 D4 반복 또는 종료 결정)
 */
export function advanceLine(pos: LinePos, pages: string[][]): AdvanceResult {
  const { pageIndex, lineIndex } = pos
  if (lineIndex + 1 < pages[pageIndex].length) {
    return { pageIndex, lineIndex: lineIndex + 1, ended: false }
  }
  if (pageIndex + 1 < pages.length) {
    return { pageIndex: pageIndex + 1, lineIndex: 0, ended: false }
  }
  return { pageIndex, lineIndex, ended: true }
}
