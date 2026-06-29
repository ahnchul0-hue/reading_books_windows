import { describe, it, expect, beforeEach } from 'vitest'
import { createDb, type Db } from '../../src/main/db'
import { makeProfileRepo } from '../../src/main/repositories/profileRepo'
import { makeTextRepo } from '../../src/main/repositories/textRepo'
import { makeReadingStateRepo, type ReadingStateRepo } from '../../src/main/repositories/readingStateRepo'

let db: Db
let repo: ReadingStateRepo
let pid: number
let tid: number
beforeEach(() => {
  db = createDb()
  pid = makeProfileRepo(db).create('민지').id
  tid = makeTextRepo(db).save(pid, '글', '내용').id
  repo = makeReadingStateRepo(db)
})

describe('readingStateRepo (migration 0002)', () => {
  it('reading_state 테이블이 존재', () => {
    const t = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reading_state'").get()
    expect(t).toBeTruthy()
  })

  it('초기엔 null', () => {
    expect(repo.get(pid)).toBeNull()
  })

  it('save 후 get 라운드트립 (upsert)', () => {
    repo.save(pid, { textId: tid, charsRead: 42, finished: false })
    expect(repo.get(pid)).toEqual({ textId: tid, charsRead: 42, finished: false })
    repo.save(pid, { textId: tid, charsRead: 100, finished: true })
    expect(repo.get(pid)).toEqual({ textId: tid, charsRead: 100, finished: true })
  })

  it('clear', () => {
    repo.save(pid, { textId: tid, charsRead: 10, finished: false })
    repo.clear(pid)
    expect(repo.get(pid)).toBeNull()
  })

  it('글 삭제 시 textId는 SET NULL', () => {
    repo.save(pid, { textId: tid, charsRead: 10, finished: false })
    db.prepare('DELETE FROM texts WHERE id=?').run(tid)
    expect(repo.get(pid)?.textId).toBeNull()
  })

  it('프로필 삭제 시 CASCADE', () => {
    repo.save(pid, { textId: tid, charsRead: 10, finished: false })
    makeProfileRepo(db).remove(pid)
    expect(repo.get(pid)).toBeNull()
  })
})
