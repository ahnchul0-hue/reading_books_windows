import type { Db } from '../db'
import type { TextItem } from '../../shared/types'
import { normalizeText } from '../../core/text'

function rowToText(r: any): TextItem {
  return { id: r.id, profileId: r.profile_id, title: r.title, body: r.body, createdAt: r.created_at }
}

export function makeTextRepo(db: Db) {
  return {
    /** 글 저장. 본문은 정규화(붙여넣기/.txt 동일 형식)해서 프로필에 보관. */
    save(profileId: number, title: string, body: string): TextItem {
      const createdAt = new Date().toISOString()
      const normalized = normalizeText(body)
      const info = db
        .prepare('INSERT INTO texts(profile_id, title, body, created_at) VALUES (?,?,?,?)')
        .run(profileId, title, normalized, createdAt)
      return { id: Number(info.lastInsertRowid), profileId, title, body: normalized, createdAt }
    },

    /** 프로필의 글 목록(최신순). */
    list(profileId: number): TextItem[] {
      return db
        .prepare('SELECT * FROM texts WHERE profile_id=? ORDER BY created_at DESC, id DESC')
        .all(profileId)
        .map(rowToText)
    },

    get(id: number): TextItem | null {
      const r = db.prepare('SELECT * FROM texts WHERE id=?').get(id)
      return r ? rowToText(r) : null
    },
  }
}

export type TextRepo = ReturnType<typeof makeTextRepo>
