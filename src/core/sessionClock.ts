// 세션 시계 (순수 상태머신)
// 활성 읽기 시간만 누적한다(일시정지·휴식 중 정지). totalMs 도달 시 종료 — 타이머 우선(D3).
// 상태는 불변(immutable): 각 함수는 새 상태를 반환한다.

export interface ClockState {
  totalMs: number
  activeMs: number // 누적된 활성 읽기 시간
  running: boolean // 실제 읽는 중이면 true (일시정지·휴식이면 false)
}

export function createClock(totalMs: number): ClockState {
  return { totalMs, activeMs: 0, running: true }
}

export function isEnded(s: ClockState): boolean {
  return s.activeMs >= s.totalMs
}

export function remainingMs(s: ClockState): number {
  return Math.max(0, s.totalMs - s.activeMs)
}

/** 활성 상태일 때만 dtMs만큼 누적. totalMs를 넘지 않게 캡. */
export function tick(s: ClockState, dtMs: number): ClockState {
  if (!s.running || isEnded(s)) return s
  return { ...s, activeMs: Math.min(s.totalMs, s.activeMs + dtMs) }
}

export function pause(s: ClockState): ClockState {
  return { ...s, running: false }
}

/** 재개. 단, 이미 종료된 세션은 다시 켜지 않는다. */
export function resume(s: ClockState): ClockState {
  if (isEnded(s)) return s
  return { ...s, running: true }
}
