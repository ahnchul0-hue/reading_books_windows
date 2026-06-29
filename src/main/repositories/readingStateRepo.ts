import type { Db } from '../db'
import type { ReadingState } from '../../shared/types'

export function makeReadingStateRepo(db: Db) {
  return {
    get(profileId: number): ReadingState | null {
      const r: any = db.prepare('SELECT * FROM reading_state WHERE profile_id=?').get(profileId)
      if (!r) return null
      return { textId: r.text_id ?? null, charsRead: r.chars_read, finished: !!r.finished }
    },

    save(profileId: number, s: ReadingState): void {
      db.prepare(
        `INSERT INTO reading_state(profile_id, text_id, chars_read, finished, updated_at)
         VALUES (@p, @t, @c, @f, @u)
         ON CONFLICT(profile_id) DO UPDATE SET text_id=@t, chars_read=@c, finished=@f, updated_at=@u`,
      ).run({ p: profileId, t: s.textId, c: s.charsRead, f: s.finished ? 1 : 0, u: new Date().toISOString() })
    },

    clear(profileId: number): void {
      db.prepare('DELETE FROM reading_state WHERE profile_id=?').run(profileId)
    },
  }
}

export type ReadingStateRepo = ReturnType<typeof makeReadingStateRepo>
