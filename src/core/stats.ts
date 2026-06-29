// 대시보드용 순수 통계 (날짜 기반). Electron/DOM 비의존, 결정론적(입력으로 today 주입).

/** ISO 시각 → 로컬 날짜 키 'YYYY-MM-DD'. */
export function toLocalDateKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function activeDateSet(startedAts: string[]): Set<string> {
  return new Set(startedAts.map(toLocalDateKey))
}

function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + delta)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
    dt.getDate(),
  ).padStart(2, '0')}`
}

/** 오늘(또는 오늘 안 했으면 어제)부터 거슬러 올라간 연속 읽기 일수. */
export function computeStreak(active: Set<string>, todayKey: string): number {
  let cursor = active.has(todayKey) ? todayKey : addDays(todayKey, -1)
  if (!active.has(cursor)) return 0
  let count = 0
  while (active.has(cursor)) {
    count++
    cursor = addDays(cursor, -1)
  }
  return count
}

export interface DayCell {
  day: number
  dateKey: string
  active: boolean
  isToday: boolean
}

/** 월별 캘린더(주 단위 7칸, 일요일 시작). 달력 밖 칸은 null. */
export function monthlyCalendar(
  year: number,
  month0: number,
  active: Set<string>,
  todayKey: string,
): (DayCell | null)[][] {
  const startWeekday = new Date(year, month0, 1).getDay() // 0=일
  const daysInMonth = new Date(year, month0 + 1, 0).getDate()
  const cells: (DayCell | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, dateKey: key, active: active.has(key), isToday: key === todayKey })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (DayCell | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/** 최근 N일 일별 읽은 분(分). 오래된→최신 순. */
export function lastNDaysMinutes(
  sessions: { startedAt: string; activeMs: number }[],
  todayKey: string,
  n: number,
): { dateKey: string; minutes: number }[] {
  const byDate = new Map<string, number>()
  for (const s of sessions) {
    const k = toLocalDateKey(s.startedAt)
    byDate.set(k, (byDate.get(k) ?? 0) + s.activeMs)
  }
  const out: { dateKey: string; minutes: number }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const k = addDays(todayKey, -i)
    out.push({ dateKey: k, minutes: Math.round((byDate.get(k) ?? 0) / 60000) })
  }
  return out
}
