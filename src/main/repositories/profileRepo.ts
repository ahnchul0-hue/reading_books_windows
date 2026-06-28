import type { Db } from '../db'
import {
  DEFAULT_SETTINGS,
  type LinesPerPage,
  type Profile,
  type Settings,
  type SpeedMult,
  type Theme,
  type TimerMin,
} from '../../shared/types'

function rowToProfile(r: any): Profile {
  return { id: r.id, name: r.name, avatar: r.avatar ?? null, createdAt: r.created_at }
}

export function makeProfileRepo(db: Db) {
  return {
    create(name: string, avatar: string | null = null): Profile {
      const createdAt = new Date().toISOString()
      const info = db
        .prepare('INSERT INTO profiles(name, avatar, created_at) VALUES (?,?,?)')
        .run(name, avatar, createdAt)
      return { id: Number(info.lastInsertRowid), name, avatar, createdAt }
    },

    list(): Profile[] {
      return db
        .prepare('SELECT * FROM profiles ORDER BY created_at ASC, id ASC')
        .all()
        .map(rowToProfile)
    },

    get(id: number): Profile | null {
      const r = db.prepare('SELECT * FROM profiles WHERE id=?').get(id)
      return r ? rowToProfile(r) : null
    },

    remove(id: number): void {
      db.prepare('DELETE FROM profiles WHERE id=?').run(id) // settings/texts/sessions CASCADE
    },

    /** 설정 조회. 없으면 기본값을 반환(저장하지는 않음). */
    getSettings(profileId: number): Settings {
      const r: any = db.prepare('SELECT * FROM settings WHERE profile_id=?').get(profileId)
      if (!r) return { ...DEFAULT_SETTINGS }
      return {
        theme: r.theme as Theme,
        fontPt: r.font_pt,
        linesPerPage: r.lines_per_page as LinesPerPage,
        speedMult: r.speed_mult as SpeedMult,
        timerMin: r.timer_min as TimerMin,
      }
    },

    /** 설정 저장(upsert, 프로필당 1행). */
    setSettings(profileId: number, s: Settings): void {
      db.prepare(
        `INSERT INTO settings(profile_id, theme, font_pt, lines_per_page, speed_mult, timer_min)
         VALUES (@profileId, @theme, @fontPt, @linesPerPage, @speedMult, @timerMin)
         ON CONFLICT(profile_id) DO UPDATE SET
           theme=@theme, font_pt=@fontPt, lines_per_page=@linesPerPage,
           speed_mult=@speedMult, timer_min=@timerMin`,
      ).run({ profileId, ...s })
    },
  }
}

export type ProfileRepo = ReturnType<typeof makeProfileRepo>
