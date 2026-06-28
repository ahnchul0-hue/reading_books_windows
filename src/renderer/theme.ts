import type { Theme } from '../shared/types'

// 테마별 색. 스윕 바: 라이트=연한 노랑 / 다크=앰버(#F0C674). 폭 1.5배·투명도 50%는 ReadingScreen에서 적용.
const THEMES: Record<Theme, Record<string, string>> = {
  light: {
    '--bg': '#fbfbf7',
    '--fg': '#1f2430',
    '--panel': '#ffffff',
    '--accent': '#3b82f6',
    '--muted': '#6b7280',
    '--sweep': '255, 241, 118', // 연한 노랑 (rgb)
  },
  dark: {
    '--bg': '#1f2430',
    '--fg': '#f3f4f6',
    '--panel': '#2a3040',
    '--accent': '#60a5fa',
    '--muted': '#9ca3af',
    '--sweep': '240, 198, 116', // 앰버 #F0C674 (rgb)
  },
}

export function applyTheme(theme: Theme): void {
  const vars = THEMES[theme]
  const r = document.documentElement
  for (const [k, v] of Object.entries(vars)) r.style.setProperty(k, v)
  r.dataset.theme = theme
}
