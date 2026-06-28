import { describe, it, expect } from 'vitest'
import { countableLength, cpmFor, msPerChar } from '../../src/core/cpm'

describe('cpm — 속도 계산', () => {
  it('한글+문장부호만 세고 공백/줄바꿈은 제외한다', () => {
    expect(countableLength('안녕, 세상!\n끝.')).toBe(8) // 안녕,세상!끝. = 8
    expect(countableLength('   ')).toBe(0)
    expect(countableLength('가\t나 다\r\n라')).toBe(4)
    expect(countableLength('')).toBe(0)
  })

  it('배율을 CPM으로 매핑한다 (기준 1.0배 = 400 CPM)', () => {
    expect(cpmFor(0.5)).toBe(200)
    expect(cpmFor(1.0)).toBe(400)
    expect(cpmFor(1.5)).toBe(600)
    expect(cpmFor(2.0)).toBe(800)
  })

  it('1글자당 시간(ms): 1.0배=150, 0.5배=300, 1.5배=100, 2.0배=75', () => {
    expect(msPerChar(1.0)).toBe(150)
    expect(msPerChar(0.5)).toBe(300)
    expect(msPerChar(1.5)).toBeCloseTo(100, 5)
    expect(msPerChar(2.0)).toBe(75)
  })
})
