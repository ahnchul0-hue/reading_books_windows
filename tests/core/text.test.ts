import { describe, it, expect } from 'vitest'
import { normalizeText } from '../../src/core/text'

describe('text — 정규화', () => {
  it('줄바꿈을 \\n으로 통일', () => {
    expect(normalizeText('가\r\n나\r다\n라')).toBe('가\n나\n다\n라')
  })
  it('탭을 공백으로', () => {
    expect(normalizeText('가\t나')).toBe('가 나')
  })
  it('줄 끝 공백 제거, 앞뒤 여백 제거', () => {
    expect(normalizeText('  앞뒤  ')).toBe('앞뒤')
    expect(normalizeText('a   \nb')).toBe('a\nb')
  })
  it('내부 빈 줄(문단 구분)은 보존', () => {
    expect(normalizeText('가\n\n나')).toBe('가\n\n나')
  })
})
