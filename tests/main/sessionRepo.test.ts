import { describe, it, expect, beforeEach } from 'vitest'
import { createDb, type Db } from '../../src/main/db'
import { makeProfileRepo } from '../../src/main/repositories/profileRepo'
import { makeTextRepo } from '../../src/main/repositories/textRepo'
import { makeSessionRepo, type SessionRepo } from '../../src/main/repositories/sessionRepo'

let db: Db
let sessions: SessionRepo
let pid: number
let tid: number
beforeEach(() => {
  db = createDb()
  pid = makeProfileRepo(db).create('민지').id
  tid = makeTextRepo(db).save(pid, '글', '내용').id
  sessions = makeSessionRepo(db)
})

describe('sessionRepo', () => {
  it('start는 진도 0으로 세션을 만들고 endedAt은 null', () => {
    const id = sessions.start(pid, tid, '{"speedMult":1}')
    const s = sessions.get(id)!
    expect(s.profileId).toBe(pid)
    expect(s.textId).toBe(tid)
    expect(s.endedAt).toBeNull()
    expect(s.activeMs).toBe(0)
    expect(s.charsRead).toBe(0)
    expect(s.pageReached).toBe(0)
  })

  it('finish는 종료시각과 진도를 저장', () => {
    const id = sessions.start(pid, tid, '{}')
    sessions.finish(id, { activeMs: 600000, charsRead: 1234, pageReached: 7 })
    const s = sessions.get(id)!
    expect(s.endedAt).toMatch(/\d{4}-\d{2}-\d{2}T/)
    expect(s.activeMs).toBe(600000)
    expect(s.charsRead).toBe(1234)
    expect(s.pageReached).toBe(7)
  })

  it('listByProfile은 해당 프로필 세션을 최신순으로', () => {
    const a = sessions.start(pid, tid, '{}')
    const b = sessions.start(pid, tid, '{}')
    const ids = sessions.listByProfile(pid).map((s) => s.id)
    expect(ids).toEqual([b, a])
  })

  it('글 삭제 시 세션의 textId는 SET NULL(세션은 유지)', () => {
    const id = sessions.start(pid, tid, '{}')
    db.prepare('DELETE FROM texts WHERE id=?').run(tid)
    const s = sessions.get(id)
    expect(s).not.toBeNull()
    expect(s!.textId).toBeNull()
  })

  it('프로필 삭제 시 세션은 CASCADE 삭제', () => {
    sessions.start(pid, tid, '{}')
    makeProfileRepo(db).remove(pid)
    expect(sessions.listByProfile(pid)).toHaveLength(0)
  })
})
