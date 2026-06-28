import type { Db } from '../db'
import { pickQuote, type Quote } from '../../core/quotes'

export interface QuoteSeed {
  body: string
  source?: string | null
  license?: string | null
}

function rowToQuote(r: any): Quote {
  return { id: r.id, body: r.body, source: r.source ?? '', license: r.license ?? '' }
}

export function makeQuoteRepo(db: Db) {
  const count = (): number =>
    (db.prepare('SELECT count(*) AS c FROM quotes').get() as { c: number }).c

  function allQuotes(): Quote[] {
    return db.prepare('SELECT * FROM quotes ORDER BY id').all().map(rowToQuote)
  }

  /** 시드 적재. 이미 데이터가 있으면 건너뛴다(중복 적재 방지). 같은 본문은 1회만. */
  function seed(rows: QuoteSeed[]): void {
    if (count() > 0) return
    const seen = new Set<string>()
    const insert = db.prepare('INSERT INTO quotes(body, source, license) VALUES (?,?,?)')
    const tx = db.transaction((items: QuoteSeed[]) => {
      for (const it of items) {
        if (seen.has(it.body)) continue
        seen.add(it.body)
        insert.run(it.body, it.source ?? null, it.license ?? null)
      }
    })
    tx(rows)
  }

  /** 최근 표시한 quote id들(최근순). */
  function recentIds(profileId: number, limit = 20): number[] {
    return db
      .prepare(
        'SELECT quote_id FROM quote_history WHERE profile_id=? ORDER BY shown_at DESC, rowid DESC LIMIT ?',
      )
      .all(profileId, limit)
      .map((r: any) => r.quote_id)
  }

  function recordShown(profileId: number, quoteId: number): void {
    db.prepare('INSERT INTO quote_history(profile_id, quote_id, shown_at) VALUES (?,?,?)').run(
      profileId,
      quoteId,
      new Date().toISOString(),
    )
  }

  /** 최근 제외 후 무작위 명언을 뽑아 이력에 기록하고 반환(core.pickQuote 연동). */
  function next(profileId: number, rng: () => number = Math.random, recentLimit = 20): Quote {
    const q = pickQuote(allQuotes(), recentIds(profileId, recentLimit), rng)
    recordShown(profileId, q.id)
    return q
  }

  return { seed, count, allQuotes, recentIds, recordShown, next }
}

export type QuoteRepo = ReturnType<typeof makeQuoteRepo>
