// 명언 선택 (순수 로직)
// 최근 표시한 것은 제외하고 무작위 선택(중복 방지). rng 주입으로 결정론적 테스트 가능.

export interface Quote {
  id: number
  body: string
  source: string
  license: string
}

/**
 * 최근 제외 후 무작위 명언 선택.
 * @param all       전체 명언
 * @param recentIds 최근 표시한 id들(최근순: [0]이 가장 최근)
 * @param rng       0~1 난수 생성기(기본 Math.random)
 */
export function pickQuote(
  all: Quote[],
  recentIds: number[],
  rng: () => number = Math.random,
): Quote {
  if (all.length === 0) throw new Error('pickQuote: 명언 데이터가 비어 있습니다')

  const recent = new Set(recentIds)
  const pool = all.filter((q) => !recent.has(q.id))
  if (pool.length > 0) {
    return pool[Math.floor(rng() * pool.length)]
  }

  // 모두 최근에 보여줬다면 가장 오래 전에 본 것(recentIds의 마지막)을 허용한다.
  const oldestId = recentIds[recentIds.length - 1]
  return all.find((q) => q.id === oldestId) ?? all[0]
}
