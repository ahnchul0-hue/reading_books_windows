import { describe, it, expect } from 'vitest'
import { pickQuote, type Quote } from '../../src/core/quotes'

const make = (id: number): Quote => ({
  id,
  body: `명언 ${id}`,
  source: '테스트',
  license: 'public-domain',
})
const all = [1, 2, 3, 4, 5].map(make)

describe('quotes — 최근 제외 무작위 선택', () => {
  it('recentIds에 든 id는 뽑지 않는다', () => {
    const recent = [1, 2] // 최근순(1이 가장 최근)
    const picked = pickQuote(all, recent, () => 0)
    expect(recent).not.toContain(picked.id)
    expect(picked.id).toBe(3) // pool=[3,4,5], rng=0 → 첫 번째
  })

  it('rng 주입으로 결정론적 선택', () => {
    expect(pickQuote(all, [], () => 0).id).toBe(1) // 첫 번째
    expect(pickQuote(all, [], () => 0.999).id).toBe(5) // 마지막
    expect(pickQuote(all, [], () => 0.5).id).toBe(3) // 중간 (floor(0.5*5)=2)
  })

  it('모두 최근이면 가장 오래 전에 본 것을 허용한다(recentIds는 최근순)', () => {
    const recent = [3, 2, 1] // 3이 가장 최근, 1이 가장 오래됨
    const picked = pickQuote([make(1), make(2), make(3)], recent, () => 0)
    expect(picked.id).toBe(1)
  })

  it('recent가 비어 있으면 전체에서 뽑는다', () => {
    const picked = pickQuote(all, [], () => 0.6)
    expect(picked.id).toBe(4) // floor(0.6*5)=3
  })

  it('명언이 하나뿐이면 그것을 반환한다', () => {
    expect(pickQuote([make(7)], [7], () => 0).id).toBe(7)
  })

  it('명언이 없으면 예외', () => {
    expect(() => pickQuote([], [], () => 0)).toThrow()
  })
})
