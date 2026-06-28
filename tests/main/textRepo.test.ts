import { describe, it, expect, beforeEach } from 'vitest'
import { createDb, type Db } from '../../src/main/db'
import { makeProfileRepo } from '../../src/main/repositories/profileRepo'
import { makeTextRepo, type TextRepo } from '../../src/main/repositories/textRepo'

let db: Db
let texts: TextRepo
let pid: number
let other: number
beforeEach(() => {
  db = createDb()
  const profiles = makeProfileRepo(db)
  pid = profiles.create('민지').id
  other = profiles.create('동생').id
  texts = makeTextRepo(db)
})

describe('textRepo', () => {
  it('save는 본문을 정규화해서 저장한다', () => {
    const t = texts.save(pid, '제목', '가\r\n나\t다  ')
    expect(t.body).toBe('가\n나 다')
    expect(t.id).toBeGreaterThan(0)
    expect(t.profileId).toBe(pid)
  })

  it('list는 해당 프로필의 글만 최신순으로 반환', () => {
    texts.save(pid, '첫째', 'a')
    texts.save(pid, '둘째', 'b')
    texts.save(other, '남의글', 'c')
    const titles = texts.list(pid).map((t) => t.title)
    expect(titles).toEqual(['둘째', '첫째']) // 최신순
    expect(texts.list(other).map((t) => t.title)).toEqual(['남의글'])
  })

  it('get은 글/없으면 null', () => {
    const t = texts.save(pid, '글', '내용')
    expect(texts.get(t.id)?.body).toBe('내용')
    expect(texts.get(9999)).toBeNull()
  })

  it('프로필 삭제 시 글도 CASCADE 삭제', () => {
    texts.save(pid, '글', '내용')
    makeProfileRepo(db).remove(pid)
    expect(texts.list(pid)).toHaveLength(0)
  })
})
