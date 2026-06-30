// 고정 카테고리 — 데스크톱 categories 시드(migration 0003)와 동일하게 유지.
export type Cat = { name: string; emoji: string; color: string }

export const CATEGORIES: Cat[] = [
  { name: '동화', emoji: '📖', color: '#a78bfa' },
  { name: '과학', emoji: '🔬', color: '#34d399' },
  { name: '동물', emoji: '🐾', color: '#fb923c' },
  { name: '역사', emoji: '🏰', color: '#d4a373' },
  { name: '시·노래', emoji: '🎵', color: '#f472b6' },
  { name: '내 글', emoji: '✏️', color: '#60a5fa' },
]

export const UNCATEGORIZED: Cat = { name: '기타', emoji: '✨', color: '#9ca3af' }

export function catFor(name: string | null | undefined): Cat {
  return CATEGORIES.find((c) => c.name === name) ?? UNCATEGORIZED
}
