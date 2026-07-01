import { describe, it, expect, beforeEach } from 'vitest'
import { createDb, type Db } from '../../src/main/db'
import { makeProfileRepo } from '../../src/main/repositories/profileRepo'
import { makeTextRepo } from '../../src/main/repositories/textRepo'
import { makeCategoryRepo, type CategoryRepo } from '../../src/main/repositories/categoryRepo'

let db: Db
let repo: CategoryRepo
beforeEach(() => {
  db = createDb()
  repo = makeCategoryRepo(db)
})

describe('categoryRepo (migration 0003)', () => {
  it('기본 7종이 시드된다(색·이모지 포함)', () => {
    const cats = repo.list()
    expect(cats).toHaveLength(7)
    expect(cats.map((c) => c.name)).toEqual(['동화', '과학', '동물', '역사', '시·노래', '내 글', '정보보안 기사'])
    expect(cats[0].emoji).toBe('📖')
    expect(cats[0].color).toMatch(/^#/)
    expect(cats.every((c) => c.builtin)).toBe(true)
  })

  it('부모가 새 카테고리 추가(builtin=false)', () => {
    const c = repo.add('만화', '📚', '#f87171')
    expect(c.builtin).toBe(false)
    expect(repo.list()).toHaveLength(8)
  })

  it('사용자 카테고리는 삭제, 기본은 보호', () => {
    const c = repo.add('만화', '📚', '#f87171')
    repo.remove(c.id)
    expect(repo.list()).toHaveLength(7)
    repo.remove(1) // 기본(동화) 삭제 시도 → 무시
    expect(repo.list()).toHaveLength(7)
  })
})

describe('textRepo + 카테고리', () => {
  it('저장 시 카테고리 지정 + 목록에 카테고리 join', () => {
    const profiles = makeProfileRepo(db)
    const texts = makeTextRepo(db)
    const pid = profiles.create('민지').id
    const t = texts.save(pid, '공룡', '공룡 이야기', 3) // 동물
    expect(t.categoryId).toBe(3)
    expect(t.category?.name).toBe('동물')
    expect(t.category?.emoji).toBe('🐾')
  })

  it('카테고리 미지정 시 기본 내 글', () => {
    const pid = makeProfileRepo(db).create('민지').id
    const t = makeTextRepo(db).save(pid, '메모', '내용')
    expect(t.category?.name).toBe('내 글')
  })

  it('카테고리 삭제 시 글의 category는 SET NULL', () => {
    const pid = makeProfileRepo(db).create('민지').id
    const texts = makeTextRepo(db)
    const c = repo.add('만화', '📚', '#f87171')
    const t = texts.save(pid, '글', '내용', c.id)
    repo.remove(c.id)
    expect(texts.get(t.id)?.category).toBeNull()
  })
})
