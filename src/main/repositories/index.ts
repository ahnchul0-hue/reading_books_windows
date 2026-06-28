import type { Db } from '../db'
import { makeProfileRepo } from './profileRepo'
import { makeTextRepo } from './textRepo'
import { makeSessionRepo } from './sessionRepo'
import { makeQuoteRepo } from './quoteRepo'

export function makeRepos(db: Db) {
  return {
    profiles: makeProfileRepo(db),
    texts: makeTextRepo(db),
    sessions: makeSessionRepo(db),
    quotes: makeQuoteRepo(db),
  }
}

export type Repos = ReturnType<typeof makeRepos>
