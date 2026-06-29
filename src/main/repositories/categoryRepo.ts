import type { Db } from '../db'
import type { Category } from '../../shared/types'

function rowToCat(r: any): Category {
  return { id: r.id, name: r.name, emoji: r.emoji ?? '', color: r.color ?? '', builtin: !!r.builtin }
}

export function makeCategoryRepo(db: Db) {
  return {
    list(): Category[] {
      return db.prepare('SELECT * FROM categories ORDER BY sort, id').all().map(rowToCat)
    },

    /** 부모가 새 카테고리 추가 (builtin=0). */
    add(name: string, emoji: string, color: string): Category {
      const sort = (
        db.prepare('SELECT COALESCE(MAX(sort),0)+1 AS s FROM categories').get() as { s: number }
      ).s
      const info = db
        .prepare('INSERT INTO categories(name, emoji, color, builtin, sort) VALUES (?,?,?,0,?)')
        .run(name, emoji, color, sort)
      return { id: Number(info.lastInsertRowid), name, emoji, color, builtin: false }
    },

    /** 사용자 추가 카테고리만 삭제(기본 6종은 보호). 글의 category는 SET NULL. */
    remove(id: number): void {
      db.prepare('DELETE FROM categories WHERE id=? AND builtin=0').run(id)
    },
  }
}

export type CategoryRepo = ReturnType<typeof makeCategoryRepo>
