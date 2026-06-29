import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { createDb } from '../src/db.js'

let app
beforeEach(() => {
  app = createApp(createDb(':memory:'))
})

async function register(name, pin = '1234') {
  const r = await request(app).post('/api/auth/register').send({ name, avatar: '🐰', pin })
  return r.body
}

describe('server API', () => {
  it('health', async () => {
    const r = await request(app).get('/api/health')
    expect(r.status).toBe(200)
    expect(r.body.ok).toBe(true)
  })

  it('register → token + user, appears in users list', async () => {
    const { token, user } = await register('민지')
    expect(token).toMatch(/\.\w+/)
    expect(user.name).toBe('민지')
    const list = await request(app).get('/api/users')
    expect(list.body.map((u) => u.name)).toContain('민지')
  })

  it('register rejects non-4-digit pin', async () => {
    const r = await request(app).post('/api/auth/register').send({ name: 'x', pin: '12' })
    expect(r.status).toBe(400)
  })

  it('login: wrong pin 401, right pin ok', async () => {
    const { user } = await register('민지', '4321')
    const bad = await request(app).post('/api/auth/login').send({ userId: user.id, pin: '0000' })
    expect(bad.status).toBe(401)
    const ok = await request(app).post('/api/auth/login').send({ userId: user.id, pin: '4321' })
    expect(ok.status).toBe(200)
    expect(ok.body.token).toBeTruthy()
  })

  it('texts: auth required, save + list', async () => {
    const { token } = await register('민지')
    const noauth = await request(app).get('/api/texts')
    expect(noauth.status).toBe(401)
    await request(app)
      .post('/api/texts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '강아지', body: '우리집 강아지', category: '동물' })
    const list = await request(app).get('/api/texts').set('Authorization', `Bearer ${token}`)
    expect(list.body).toHaveLength(1)
    expect(list.body[0].title).toBe('강아지')
  })

  it('sessions + leaderboard metrics', async () => {
    const { token, user } = await register('민지')
    await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ activeMs: 600000, charsRead: 500, completed: 1, startedAt: new Date().toISOString() })
    const board = await request(app).get('/api/leaderboard')
    const me = board.body.find((b) => b.userId === user.id)
    expect(me).toBeTruthy()
    expect(me.totalChars).toBe(500)
    expect(me.completedCount).toBe(1)
    expect(me.streak).toBeGreaterThanOrEqual(1)
    expect(me.weekMinutes).toBe(10)
  })
})
