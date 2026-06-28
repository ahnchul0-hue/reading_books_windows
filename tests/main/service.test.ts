import { describe, it, expect, beforeEach } from 'vitest'
import { createDb, type Db } from '../../src/main/db'
import { makeRepos, type Repos } from '../../src/main/repositories'
import { makeService, type Service } from '../../src/main/service'
import { DEFAULT_SETTINGS } from '../../src/shared/types'

let db: Db
let repos: Repos
let service: Service
beforeEach(() => {
  db = createDb()
  repos = makeRepos(db)
  service = makeService(repos)
})

describe('service — IPC 핸들러가 호출할 데이터 계층 라운드트립', () => {
  it('profiles: create/list/remove', () => {
    const p = service.profiles.create('민지', 'rabbit')
    expect(service.profiles.list().map((x) => x.id)).toContain(p.id)
    service.profiles.remove(p.id)
    expect(service.profiles.list()).toHaveLength(0)
  })

  it('texts: save(정규화)/list', () => {
    const p = service.profiles.create('민지')
    const t = service.texts.save(p.id, '글', '가\r\n나')
    expect(t.body).toBe('가\n나')
    expect(service.texts.list(p.id).map((x) => x.id)).toContain(t.id)
  })

  it('settings: 기본값 get + set 라운드트립', () => {
    const p = service.profiles.create('민지')
    expect(service.settings.get(p.id)).toEqual(DEFAULT_SETTINGS)
    service.settings.set(p.id, { ...DEFAULT_SETTINGS, theme: 'dark', timerMin: 20 })
    expect(service.settings.get(p.id).theme).toBe('dark')
    expect(service.settings.get(p.id).timerMin).toBe(20)
  })

  it('session: start → finish 후 진도가 기록된다', () => {
    const p = service.profiles.create('민지')
    const t = service.texts.save(p.id, '글', '내용')
    const id = service.session.start(p.id, t.id, '{"speedMult":1}')
    expect(typeof id).toBe('number')
    service.session.finish(id, { activeMs: 1000, charsRead: 10, pageReached: 2 })
    const saved = repos.sessions.get(id)!
    expect(saved.endedAt).not.toBeNull()
    expect(saved.charsRead).toBe(10)
    expect(saved.pageReached).toBe(2)
  })

  it('quotes: next는 명언을 뽑아 이력에 남긴다', () => {
    const p = service.profiles.create('민지')
    repos.quotes.seed([{ body: 'A' }, { body: 'B' }])
    const q = service.quotes.next(p.id)
    expect(['A', 'B']).toContain(q.body)
    expect(repos.quotes.recentIds(p.id)).toContain(q.id)
  })
})
