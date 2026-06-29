import type { Db } from '../db'
import { DEFAULT_CATEGORY_ID } from '../db'
import type { Category, TextItem } from '../../shared/types'
import { normalizeText } from '../../core/text'

function rowToText(r: any): TextItem {
  const category: Category | null = r.cat_id
    ? { id: r.cat_id, name: r.cat_name, emoji: r.cat_emoji ?? '', color: r.cat_color ?? '', builtin: !!r.cat_builtin }
    : null
  return {
    id: r.id,
    profileId: r.profile_id,
    title: r.title,
    body: r.body,
    createdAt: r.created_at,
    categoryId: r.category_id ?? null,
    category,
  }
}

const SELECT = `
  SELECT t.*, c.id AS cat_id, c.name AS cat_name, c.emoji AS cat_emoji,
         c.color AS cat_color, c.builtin AS cat_builtin
  FROM texts t LEFT JOIN categories c ON c.id = t.category_id`

export function makeTextRepo(db: Db) {
  return {
    /** 글 저장(본문 정규화 + 카테고리). 카테고리 미지정 시 기본 '내 글'. */
    save(
      profileId: number,
      title: string,
      body: string,
      categoryId: number = DEFAULT_CATEGORY_ID,
    ): TextItem {
      const createdAt = new Date().toISOString()
      const normalized = normalizeText(body)
      const info = db
        .prepare('INSERT INTO texts(profile_id, title, body, created_at, category_id) VALUES (?,?,?,?,?)')
        .run(profileId, title, normalized, createdAt, categoryId)
      return this.get(Number(info.lastInsertRowid))!
    },

    list(profileId: number): TextItem[] {
      return db
        .prepare(`${SELECT} WHERE t.profile_id=? ORDER BY t.created_at DESC, t.id DESC`)
        .all(profileId)
        .map(rowToText)
    },

    get(id: number): TextItem | null {
      const r = db.prepare(`${SELECT} WHERE t.id=?`).get(id)
      return r ? rowToText(r) : null
    },
  }
}

export type TextRepo = ReturnType<typeof makeTextRepo>
