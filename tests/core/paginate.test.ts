import { describe, it, expect } from 'vitest'
import { paginate } from '../../src/core/paginate'
import { countableLength } from '../../src/core/cpm'

describe('paginate — 페이지 분할(1차, 글자수 기준)', () => {
  it('N줄/페이지로 나누고 어절 경계에서 줄바꿈한다', () => {
    const pages = paginate('가 나 다 라 마 바', 2, 5) // 한 줄 5자, 2줄/페이지
    expect(pages.length).toBeGreaterThan(0)
    pages.forEach((p) => expect(p.length).toBeLessThanOrEqual(2))
    // 첫 줄은 5자까지 채워짐
    expect(pages[0][0]).toBe('가 나 다 라 마')
    expect(pages[0][1]).toBe('바')
  })

  it('각 줄의 글자수(공백 제외)가 maxCharsPerLine 이하다 (단어 하나가 넘는 경우 제외)', () => {
    const pages = paginate('하나 두울 세엣 네엣 다섯 여섯 일곱', 3, 6)
    for (const page of pages) {
      for (const line of page) {
        expect(countableLength(line)).toBeLessThanOrEqual(6)
      }
    }
  })

  it('linesPerPage마다 새 페이지로 묶는다', () => {
    const pages = paginate('가 나 다 라 마 바 사 아', 1, 1) // 줄당 1자, 페이지당 1줄
    expect(pages.length).toBe(8)
    pages.forEach((p) => expect(p.length).toBe(1))
  })

  it('명시적 줄바꿈(\\n)은 강제 줄 분리로 취급한다', () => {
    const pages = paginate('가나\n다라', 5, 10)
    expect(pages).toEqual([['가나', '다라']])
  })

  it('빈 문자열은 빈 배열을 반환한다', () => {
    expect(paginate('', 3, 10)).toEqual([])
    expect(paginate('   \n  ', 3, 10)).toEqual([])
  })

  it('maxCharsPerLine보다 긴 단어 하나는 그 자체로 한 줄이 된다(오버플로 허용)', () => {
    const pages = paginate('가나다라마바사', 2, 3)
    expect(pages).toEqual([['가나다라마바사']])
  })
})
