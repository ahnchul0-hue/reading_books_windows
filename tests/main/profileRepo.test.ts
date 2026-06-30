import { describe, it, expect, beforeEach } from 'vitest'
import { createDb, type Db } from '../../src/main/db'
import { makeProfileRepo, type ProfileRepo } from '../../src/main/repositories/profileRepo'
import { DEFAULT_SETTINGS, type Settings } from '../../src/shared/types'

let db: Db
let repo: ProfileRepo
beforeEach(() => {
  db = createDb()
  repo = makeProfileRepo(db)
})

describe('profileRepo', () => {
  it('create는 별명+아바타로 프로필을 만든다', () => {
    const p = repo.create('민지', 'rabbit')
    expect(p.id).toBeGreaterThan(0)
    expect(p.name).toBe('민지')
    expect(p.avatar).toBe('rabbit')
    expect(p.createdAt).toMatch(/\d{4}-\d{2}-\d{2}T/)
  })

  it('list는 생성한 프로필들을 생성순으로 반환', () => {
    repo.create('가')
    repo.create('나')
    const names = repo.list().map((p) => p.name)
    expect(names).toEqual(['가', '나'])
  })

  it('get은 존재하면 프로필, 없으면 null', () => {
    const p = repo.create('민지')
    expect(repo.get(p.id)?.name).toBe('민지')
    expect(repo.get(9999)).toBeNull()
  })

  it('remove는 프로필을 삭제한다', () => {
    const p = repo.create('민지')
    repo.remove(p.id)
    expect(repo.get(p.id)).toBeNull()
    expect(repo.list()).toHaveLength(0)
  })

  it('getSettings는 설정이 없으면 기본값을 반환', () => {
    const p = repo.create('민지')
    expect(repo.getSettings(p.id)).toEqual(DEFAULT_SETTINGS)
  })

  it('setSettings 후 getSettings 라운드트립', () => {
    const p = repo.create('민지')
    const s: Settings = { theme: 'dark', fontPt: 32, linesPerPage: 4, speedMult: 1.5, timerMin: 20, lineSpacing: 1.8, soundOn: false, hapticOn: true }
    repo.setSettings(p.id, s)
    expect(repo.getSettings(p.id)).toEqual(s)
  })

  it('setSettings는 upsert로 기존 설정을 갱신', () => {
    const p = repo.create('민지')
    repo.setSettings(p.id, { theme: 'light', fontPt: 24, linesPerPage: 3, speedMult: 0.5, timerMin: 5, lineSpacing: 1.4, soundOn: true, hapticOn: false })
    repo.setSettings(p.id, { theme: 'dark', fontPt: 28, linesPerPage: 5, speedMult: 2.0, timerMin: 15, lineSpacing: 2.0, soundOn: false, hapticOn: false })
    const got = repo.getSettings(p.id)
    expect(got.theme).toBe('dark')
    expect(got.fontPt).toBe(28)
    expect(got.timerMin).toBe(15)
    // 행이 중복되지 않고 하나만 유지
    expect(db.prepare('SELECT count(*) c FROM settings WHERE profile_id=?').get(p.id)).toMatchObject({ c: 1 })
  })

  it('프로필 삭제 시 설정도 CASCADE 삭제', () => {
    const p = repo.create('민지')
    repo.setSettings(p.id, DEFAULT_SETTINGS)
    repo.remove(p.id)
    expect(db.prepare('SELECT count(*) c FROM settings WHERE profile_id=?').get(p.id)).toMatchObject({ c: 0 })
  })
})
