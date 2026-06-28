// 휴식 스케줄 (순수 로직)
// 활성 읽기 시간 5분(300000ms)마다 20초(20000ms) 강제 휴식. 스킵 불가 — 시간 경과로만 종료.

export const BREAK_INTERVAL_MS = 300000 // 5분
export const BREAK_MS = 20000 // 20초

/**
 * 마지막 휴식 이후 누적된 활성 시간이 휴식 간격에 도달했는지.
 * @param activeMsSinceBreak 마지막 휴식 이후 활성 읽기 시간(ms)
 */
export function shouldBreak(activeMsSinceBreak: number): boolean {
  return activeMsSinceBreak >= BREAK_INTERVAL_MS
}

export interface BreakState {
  elapsedMs: number // 휴식 시작 후 흐른 시간
}

export function createBreak(): BreakState {
  return { elapsedMs: 0 }
}

/** 휴식 카운트다운 진행. (스킵 불가: 이 함수로 시간을 흘리는 것 외에 종료 수단 없음.) */
export function tickBreak(b: BreakState, dtMs: number): BreakState {
  return { elapsedMs: Math.min(BREAK_MS, b.elapsedMs + dtMs) }
}

export function isBreakOver(b: BreakState): boolean {
  return b.elapsedMs >= BREAK_MS
}

export function breakRemainingMs(b: BreakState): number {
  return Math.max(0, BREAK_MS - b.elapsedMs)
}
