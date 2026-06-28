import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import type { QuoteSeed } from './repositories/quoteRepo'

/** 명언 시드(JSON)를 로드한다. 패키지/개발 양쪽 경로를 시도. 실패 시 빈 배열. */
export function loadSeedQuotes(): QuoteSeed[] {
  const candidates = [
    join(process.resourcesPath ?? '', 'data', 'quotes.seed.json'), // 패키지(extraResources)
    join(app.getAppPath(), 'data', 'quotes.seed.json'), // 개발
  ]
  for (const p of candidates) {
    try {
      return JSON.parse(readFileSync(p, 'utf8')) as QuoteSeed[]
    } catch {
      // 다음 후보 시도
    }
  }
  return []
}
