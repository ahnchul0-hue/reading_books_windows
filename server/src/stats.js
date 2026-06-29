// 서버용 순수 통계 (세션 타임스탬프 기반). 클라이언트 core/stats와 동일 규칙.

function dateKey(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function addDays(key, delta) {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + delta)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export function computeStreak(startedAts, todayKey) {
  const active = new Set(startedAts.map(dateKey))
  let cursor = active.has(todayKey) ? todayKey : addDays(todayKey, -1)
  if (!active.has(cursor)) return 0
  let n = 0
  while (active.has(cursor)) {
    n++
    cursor = addDays(cursor, -1)
  }
  return n
}

export function weekMinutes(sessions, todayKey) {
  const keys = new Set()
  for (let i = 0; i < 7; i++) keys.add(addDays(todayKey, -i))
  let ms = 0
  for (const s of sessions) if (keys.has(dateKey(s.started_at))) ms += s.active_ms || 0
  return Math.round(ms / 60000)
}

export { dateKey }
