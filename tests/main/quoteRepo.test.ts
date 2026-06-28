import { describe, it, expect, beforeEach } from 'vitest'
import { createDb, type Db } from '../../src/main/db'
import { makeProfileRepo } from '../../src/main/repositories/profileRepo'
import { makeQuoteRepo, type QuoteRepo } from '../../src/main/repositories/quoteRepo'

let db: Db
let quotes: QuoteRepo
let pid: number
beforeEach(() => {
  db = createDb()
  pid = makeProfileRepo(db).create('민지').id
  quotes = makeQuoteRepo(db)
})

const seedRows = [
  { body: '명언 하나', source: '속담', license: 'public-domain' },
  { body: '명언 둘', source: '속담', license: 'public-domain' },
  { body: '명언 셋', source: '속담', license: 'public-domain' },
]

describe('quoteRepo', () => {
  it('seed는 명언을 적재한다', () => {
    quotes.seed(seedRows)
    expect(quotes.count()).toBe(3)
  })

  it('seed는 이미 데이터가 있으면 건너뛴다(중복 적재 방지)', () => {
    quotes.seed(seedRows)
    quotes.seed([{ body: '추가' }]) // 무시되어야 함
    expect(quotes.count()).toBe(3)
  })

  it('seed는 같은 본문을 한 번만 넣는다', () => {
    quotes.seed([{ body: '같다' }, { body: '같다' }, { body: '다르다' }])
    expect(quotes.count()).toBe(2)
  })

  it('recentIds는 초기에 비어 있다', () => {
    quotes.seed(seedRows)
    expect(quotes.recentIds(pid)).toEqual([])
  })

  it('next는 명언을 뽑고 이력에 기록한다', () => {
    quotes.seed(seedRows)
    const q = quotes.next(pid, () => 0)
    expect(q.id).toBe(1)
    expect(quotes.recentIds(pid)).toContain(1)
  })

  it('next는 최근 표시한 명언을 제외한다', () => {
    quotes.seed([{ body: 'A' }, { body: 'B' }])
    const first = quotes.next(pid, () => 0) // pool=[1,2] → 1
    const second = quotes.next(pid, () => 0) // recent=[1], pool=[2] → 2
    expect(first.id).toBe(1)
    expect(second.id).toBe(2)
  })

  it('recordShown 순서: 최근이 앞', () => {
    quotes.seed(seedRows)
    quotes.recordShown(pid, 1)
    quotes.recordShown(pid, 2)
    quotes.recordShown(pid, 3)
    expect(quotes.recentIds(pid, 2)).toEqual([3, 2])
  })

  it('프로필 삭제 시 이력은 CASCADE, 명언 본문은 유지', () => {
    quotes.seed(seedRows)
    quotes.recordShown(pid, 1)
    makeProfileRepo(db).remove(pid)
    expect(quotes.recentIds(pid)).toEqual([])
    expect(quotes.count()).toBe(3) // 전역 명언은 유지
  })
})
