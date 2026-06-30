import express from 'express'
import { hashPin, verifyPin, makeToken, authMiddleware } from './auth.js'
import { computeStreak, weekMinutes } from './stats.js'

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const isPin = (p) => /^\d{4}$/.test(String(p ?? ''))

export function createApp(db) {
  const app = express()
  app.use(express.json({ limit: '2mb' }))

  app.get('/api/health', (_req, res) => res.json({ ok: true }))

  // 사용자 목록(선택 화면용, PIN 없음)
  app.get('/api/users', (_req, res) => {
    const rows = db.prepare('SELECT id, name, avatar FROM users ORDER BY created_at, id').all()
    res.json(rows)
  })

  // 사용자 삭제(관리자 PIN 필요) — 해당 사용자의 글·세션·설정·진행도 함께 삭제
  app.delete('/api/users/:id', (req, res) => {
    const adminPin = req.body?.adminPin ?? req.get('x-admin-pin')
    if (String(adminPin ?? '') !== String(process.env.ADMIN_PIN ?? '0000')) {
      return res.status(401).json({ error: 'wrong admin pin' })
    }
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'bad id' })
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM sessions WHERE user_id=?').run(id)
      db.prepare('DELETE FROM texts WHERE user_id=?').run(id)
      db.prepare('DELETE FROM user_settings WHERE user_id=?').run(id)
      db.prepare('DELETE FROM reading_progress WHERE user_id=?').run(id)
      db.prepare('DELETE FROM users WHERE id=?').run(id)
    })
    tx()
    res.json({ ok: true })
  })

  // 등록(별명+아바타+4자리 PIN)
  app.post('/api/auth/register', (req, res) => {
    const { name, avatar, pin } = req.body || {}
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'name required' })
    if (!isPin(pin)) return res.status(400).json({ error: 'pin must be 4 digits' })
    const { salt, hash } = hashPin(pin)
    const info = db
      .prepare('INSERT INTO users(name, avatar, pin_salt, pin_hash, created_at) VALUES (?,?,?,?,?)')
      .run(String(name).trim(), avatar ?? null, salt, hash, new Date().toISOString())
    const user = { id: Number(info.lastInsertRowid), name: String(name).trim(), avatar: avatar ?? null }
    res.json({ token: makeToken(user.id), user })
  })

  // 로그인(사용자 선택 후 PIN)
  app.post('/api/auth/login', (req, res) => {
    const { userId, pin } = req.body || {}
    const u = db.prepare('SELECT * FROM users WHERE id=?').get(userId)
    if (!u || !verifyPin(pin, u.pin_salt, u.pin_hash)) {
      return res.status(401).json({ error: 'wrong pin' })
    }
    res.json({ token: makeToken(u.id), user: { id: u.id, name: u.name, avatar: u.avatar } })
  })

  // 내 글 목록 / 저장
  app.get('/api/texts', authMiddleware, (req, res) => {
    const rows = db
      .prepare('SELECT id, title, body, category, created_at FROM texts WHERE user_id=? ORDER BY created_at DESC, id DESC')
      .all(req.userId)
    res.json(rows)
  })
  app.post('/api/texts', authMiddleware, (req, res) => {
    const { title, body, category } = req.body || {}
    if (!body || !String(body).trim()) return res.status(400).json({ error: 'body required' })
    const info = db
      .prepare('INSERT INTO texts(user_id, title, body, category, created_at) VALUES (?,?,?,?,?)')
      .run(req.userId, title ?? '', String(body), category ?? null, new Date().toISOString())
    res.json({ id: Number(info.lastInsertRowid) })
  })

  // 세션 업로드
  app.post('/api/sessions', authMiddleware, (req, res) => {
    const { activeMs, charsRead, completed, startedAt } = req.body || {}
    db.prepare(
      'INSERT INTO sessions(user_id, active_ms, chars_read, completed, started_at) VALUES (?,?,?,?,?)',
    ).run(req.userId, activeMs | 0, charsRead | 0, completed ? 1 : 0, startedAt || new Date().toISOString())
    res.json({ ok: true })
  })

  // 내 통계
  app.get('/api/me/stats', authMiddleware, (req, res) => {
    res.json(statsFor(db, req.userId))
  })

  // 내 세션 목록(대시보드 캘린더/연속일 계산용)
  app.get('/api/me/sessions', authMiddleware, (req, res) => {
    const rows = db
      .prepare('SELECT started_at AS startedAt, active_ms AS activeMs FROM sessions WHERE user_id=?')
      .all(req.userId)
    res.json(rows)
  })

  // 설정(서버 기준)
  const DEFAULT_SETTINGS = {
    theme: 'dark',
    fontPt: 24,
    linesPerPage: 4,
    speedMult: 1.0,
    timerMin: 10,
    lineSpacing: 1.6,
  }
  app.get('/api/settings', authMiddleware, (req, res) => {
    const r = db.prepare('SELECT * FROM user_settings WHERE user_id=?').get(req.userId)
    if (!r) return res.json(DEFAULT_SETTINGS)
    res.json({
      theme: r.theme,
      fontPt: r.font_pt,
      linesPerPage: r.lines_per_page,
      speedMult: r.speed_mult,
      timerMin: r.timer_min,
      lineSpacing: r.line_spacing,
    })
  })
  app.put('/api/settings', authMiddleware, (req, res) => {
    const s = { ...DEFAULT_SETTINGS, ...(req.body || {}) }
    db.prepare(
      `INSERT INTO user_settings(user_id, theme, font_pt, lines_per_page, speed_mult, timer_min, line_spacing)
       VALUES (@u, @theme, @fontPt, @linesPerPage, @speedMult, @timerMin, @lineSpacing)
       ON CONFLICT(user_id) DO UPDATE SET
         theme=@theme, font_pt=@fontPt, lines_per_page=@linesPerPage,
         speed_mult=@speedMult, timer_min=@timerMin, line_spacing=@lineSpacing`,
    ).run({ u: req.userId, ...s })
    res.json({ ok: true })
  })

  // 이어서 읽기(진행도) — 사용자별 1건
  app.get('/api/me/progress', authMiddleware, (req, res) => {
    const r = db
      .prepare('SELECT text_id AS textId, chars_read AS charsRead, title FROM reading_progress WHERE user_id=?')
      .get(req.userId)
    res.json(r ?? null)
  })
  app.put('/api/me/progress', authMiddleware, (req, res) => {
    const { textId, charsRead, title } = req.body || {}
    if (textId == null) {
      db.prepare('DELETE FROM reading_progress WHERE user_id=?').run(req.userId) // 완독/초기화
      return res.json({ ok: true })
    }
    db.prepare(
      `INSERT INTO reading_progress(user_id, text_id, chars_read, title, updated_at)
       VALUES (@u, @t, @c, @title, @now)
       ON CONFLICT(user_id) DO UPDATE SET
         text_id=@t, chars_read=@c, title=@title, updated_at=@now`,
    ).run({ u: req.userId, t: textId, c: charsRead | 0, title: title ?? '', now: new Date().toISOString() })
    res.json({ ok: true })
  })

  // 랭킹: 전체 사용자 지표 (연속일·이번주 분·읽은 글자·완독 수)
  app.get('/api/leaderboard', (_req, res) => {
    const users = db.prepare('SELECT id, name, avatar FROM users').all()
    const board = users.map((u) => ({ userId: u.id, name: u.name, avatar: u.avatar, ...statsFor(db, u.id) }))
    res.json(board)
  })

  return app
}

function statsFor(db, userId) {
  const sessions = db
    .prepare('SELECT active_ms, chars_read, completed, started_at FROM sessions WHERE user_id=?')
    .all(userId)
  const tk = todayKey()
  return {
    streak: computeStreak(sessions.map((s) => s.started_at), tk),
    weekMinutes: weekMinutes(sessions, tk),
    totalChars: sessions.reduce((a, s) => a + (s.chars_read || 0), 0),
    completedCount: sessions.reduce((a, s) => a + (s.completed ? 1 : 0), 0),
  }
}
