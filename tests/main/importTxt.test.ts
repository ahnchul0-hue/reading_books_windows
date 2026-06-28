import { describe, it, expect } from 'vitest'
import { parseTxt } from '../../src/main/importTxt'

describe('parseTxt — .txt 파싱', () => {
  it('파일명을 제목으로(확장자 제거), 본문은 정규화', () => {
    const r = parseTxt('docs/동화.txt', '옛날\r\n옛적에\t끝  ')
    expect(r.title).toBe('동화')
    expect(r.body).toBe('옛날\n옛적에 끝')
  })

  it('경로가 깊어도 파일명만', () => {
    const r = parseTxt('a/b/c/이야기.txt', '내용')
    expect(r.title).toBe('이야기')
  })
})
