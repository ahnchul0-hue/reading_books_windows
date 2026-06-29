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
