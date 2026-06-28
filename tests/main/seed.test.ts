import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createDb } from '../../src/main/db'
import { makeProfileRepo } from '../../src/main/repositories/profileRepo'
import { makeQuoteRepo } from '../../src/main/repositories/quoteRepo'

interface SeedQuote {
  id: number
  body: string
  source: string
  license: string
}

const seed: SeedQuote[] = JSON.parse(readFileSync('data/quotes.seed.json', 'utf8'))

describe('quotes.seed.json — 데이터셋 품질', () => {
  it('정확히 1000개', () => {
    expect(seed).toHaveLength(1000)
  })

  it('본문 중복 0', () => {
    expect(new Set(seed.map((q) => q.body)).size).toBe(1000)
  })

  it('모든 항목에 본문·출처·라이선스가 있다', () => {
    for (const q of seed) {
      expect(q.body.trim().length).toBeGreaterThan(0)
      expect(q.source.length).toBeGreaterThan(0)
      expect(q.license.length).toBeGreaterThan(0)
    }
  })

  it('10세 가독성: 문장이 너무 길지 않다(<= 45자)', () => {
    const tooLong = seed.filter((q) => q.body.length > 45)
    expect(tooLong).toEqual([])
  })

  it('문장 종결부로 끝난다', () => {
    const bad = seed.filter((q) => !/[.?!…]$/.test(q.body.trim()))
    expect(bad).toEqual([])
  })
})

describe('quotes.seed.json — repo 통합', () => {
  it('seed 후 1000개, next는 최근을 잘 피한다', () => {
    const db = createDb()
    const pid = makeProfileRepo(db).create('민지').id
    const quotes = makeQuoteRepo(db)
    quotes.seed(seed)
    expect(quotes.count()).toBe(1000)

    // 연속 20회: 직전 표시는 바로 다음에 다시 나오지 않는다
    let prev = -1
    for (let i = 0; i < 20; i++) {
      const q = quotes.next(pid)
      expect(q.id).not.toBe(prev)
      prev = q.id
    }
  })
})
