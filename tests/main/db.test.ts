import { describe, it, expect } from 'vitest'
import { createDb, migrate } from '../../src/main/db'

describe('db — 마이그레이션 & 무결성', () => {
  it('6개 테이블을 생성한다', () => {
    const db = createDb()
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r: any) => r.name)
    for (const t of ['profiles', 'settings', 'texts', 'sessions', 'quotes', 'quote_history']) {
      expect(tables).toContain(t)
    }
    db.close()
  })

  it('외래키가 켜져 있다', () => {
    const db = createDb()
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1)
    db.close()
  })

  it('user_version=2, migrate 재호출은 멱등', () => {
    const db = createDb()
    expect(db.pragma('user_version', { simple: true })).toBe(2)
    migrate(db) // 재호출해도 에러/중복 없음
    expect(db.pragma('user_version', { simple: true })).toBe(2)
    db.close()
  })

  it('프로필 삭제 시 settings/texts가 CASCADE 삭제된다', () => {
    const db = createDb()
    const { lastInsertRowid: pid } = db
      .prepare('INSERT INTO profiles(name, created_at) VALUES (?, ?)')
      .run('민지', '2026-06-28T00:00:00Z')
    db.prepare('INSERT INTO settings(profile_id) VALUES (?)').run(pid)
    db.prepare('INSERT INTO texts(profile_id, title, body) VALUES (?,?,?)').run(pid, '글', '내용')

    db.prepare('DELETE FROM profiles WHERE id = ?').run(pid)

    expect(db.prepare('SELECT count(*) c FROM settings WHERE profile_id=?').get(pid)).toMatchObject({ c: 0 })
    expect(db.prepare('SELECT count(*) c FROM texts WHERE profile_id=?').get(pid)).toMatchObject({ c: 0 })
    db.close()
  })
})
