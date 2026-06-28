import type { Db } from '../db'
import type { SessionRecord } from '../../shared/types'

function rowToSession(r: any): SessionRecord {
  return {
    id: r.id,
    profileId: r.profile_id,
    textId: r.text_id ?? null,
    startedAt: r.started_at,
    endedAt: r.ended_at ?? null,
    activeMs: r.active_ms,
    charsRead: r.chars_read,
    pageReached: r.page_reached,
    settingsJson: r.settings_json,
  }
}

export interface SessionProgress {
  activeMs: number
  charsRead: number
  pageReached: number
}

export function makeSessionRepo(db: Db) {
  return {
    /** 세션 시작 행 생성. 진도는 0으로 초기화. 세션 id 반환. */
    start(profileId: number, textId: number | null, settingsJson: string): number {
      const startedAt = new Date().toISOString()
      const info = db
        .prepare(
          `INSERT INTO sessions(profile_id, text_id, started_at, ended_at, active_ms, chars_read, page_reached, settings_json)
           VALUES (?, ?, ?, NULL, 0, 0, 0, ?)`,
        )
        .run(profileId, textId, startedAt, settingsJson)
      return Number(info.lastInsertRowid)
    },

    /** 세션 종료: 종료시각 + 진도(활성시간·읽은 글자수·도달 페이지) 확정 저장. */
    finish(id: number, p: SessionProgress): void {
      const endedAt = new Date().toISOString()
      db.prepare(
        'UPDATE sessions SET ended_at=?, active_ms=?, chars_read=?, page_reached=? WHERE id=?',
      ).run(endedAt, p.activeMs, p.charsRead, p.pageReached, id)
    },

    get(id: number): SessionRecord | null {
      const r = db.prepare('SELECT * FROM sessions WHERE id=?').get(id)
      return r ? rowToSession(r) : null
    },

    /** 프로필의 세션 기록(최신순). */
    listByProfile(profileId: number): SessionRecord[] {
      return db
        .prepare('SELECT * FROM sessions WHERE profile_id=? ORDER BY started_at DESC, id DESC')
        .all(profileId)
        .map(rowToSession)
    },
  }
}

export type SessionRepo = ReturnType<typeof makeSessionRepo>
