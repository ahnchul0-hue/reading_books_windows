// 페이지 분할 (1차, 글자수 기준 — 순수 로직)
// Frontend가 실제 글꼴 픽셀 폭으로 재측정·보정한다(D1). 여기서는 공백 제외 글자수로 1차 분할.
import { countableLength } from './cpm'

/**
 * 글 → 페이지 배열(각 페이지는 줄 문자열 배열).
 * - 어절(공백) 경계로 maxCharsPerLine(공백 제외)를 넘기지 않게 줄바꿈.
 * - 명시적 줄바꿈(\n)은 강제 줄 분리.
 * - linesPerPage마다 새 페이지.
 */
export function paginate(
  text: string,
  linesPerPage: number,
  maxCharsPerLine: number,
): string[][] {
  const lines: string[] = []

  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter((w) => w.length > 0)
    if (words.length === 0) continue // 빈 줄(문단 구분)은 1차 분할에서 무시

    let current: string[] = []
    let count = 0
    for (const word of words) {
      const wLen = countableLength(word)
      // 현재 줄에 단어가 있고, 이 단어를 넣으면 한도 초과 → 줄 마감
      if (current.length > 0 && count + wLen > maxCharsPerLine) {
        lines.push(current.join(' '))
        current = []
        count = 0
      }
      current.push(word) // 빈 줄에는 한도를 넘더라도 최소 한 단어는 넣는다(오버플로 허용)
      count += wLen
    }
    if (current.length > 0) lines.push(current.join(' '))
  }

  const pages: string[][] = []
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage))
  }
  return pages
}
