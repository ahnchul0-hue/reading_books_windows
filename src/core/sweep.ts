// 스윕 바 타임라인 (순수 로직)
// v2: 한 줄을 "균일한 픽셀/ms"로 부드럽게 이동(공백에서 튀지 않음) + 문장 종결부에서 0.3초 정지.
//  - 한 줄 총 이동시간 = 공백 제외 글자수 × msPerChar (읽기 속도 CPM 보존)
//  - 그 시간 동안 0 → (줄 픽셀폭)을 일정한 속도로 이동
//  - 문장 종결부 글자의 x에 도달하면 300ms 멈췄다가 이어감

export interface LineTimeline {
  totalPx: number // 줄의 픽셀 폭(마지막 글자 우측 끝)
  totalMs: number // 전체 소요(이동 + 멈춤)
  pxPerMs: number // 균일 이동 속도
  stops: number[] // 문장 종결부 x 위치들(오름차순)
}

const SENTENCE_END = /[.?!…]/
const HOLD_MS = 300

export function buildLineTimeline(
  chars: string[],
  glyphX: number[],
  msPerChar: number,
): LineTimeline {
  let countable = 0
  const stops: number[] = []
  for (let i = 0; i < chars.length; i++) {
    if (/\s/.test(chars[i])) continue
    countable++
    if (SENTENCE_END.test(chars[i])) stops.push(glyphX[i])
  }
  const totalPx = glyphX.length ? glyphX[glyphX.length - 1] : 0
  const totalActiveMs = countable * msPerChar
  const pxPerMs = totalActiveMs > 0 ? totalPx / totalActiveMs : 0
  return { totalPx, totalMs: totalActiveMs + HOLD_MS * stops.length, pxPerMs, stops }
}

export function lineDuration(tl: LineTimeline): number {
  return tl.totalMs
}

/** 경과 시간(ms) → 스윕 바 x 픽셀. 균일 이동 + 문장끝 정지. */
export function sweepXAt(tl: LineTimeline, elapsed: number): number {
  if (tl.pxPerMs <= 0) return 0
  let x = 0
  let rem = Math.max(0, elapsed)
  for (const sx of tl.stops) {
    const moveT = (sx - x) / tl.pxPerMs
    if (rem <= moveT) return x + rem * tl.pxPerMs
    rem -= moveT
    x = sx
    if (rem <= HOLD_MS) return x // 문장 끝 정지
    rem -= HOLD_MS
  }
  const moveT = (tl.totalPx - x) / tl.pxPerMs
  if (rem <= moveT) return x + rem * tl.pxPerMs
  return tl.totalPx
}

export interface LinePos {
  pageIndex: number
  lineIndex: number
}
export interface AdvanceResult extends LinePos {
  ended: boolean
}

/** 현재 줄을 다 읽었을 때 다음 위치. 줄 끝→다음 줄, 페이지 끝→다음 페이지, 마지막이면 ended. */
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
