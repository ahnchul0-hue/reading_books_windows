import { createContext, useContext } from 'react'

export type Colors = {
  bg: string
  panel: string
  fg: string
  muted: string
  accent: string
  amber: string
}

export const DARK: Colors = {
  bg: '#1f2430',
  panel: '#2a3040',
  fg: '#f3f4f6',
  muted: '#9ca3af',
  accent: '#60a5fa',
  amber: '#F0C674',
}

export const LIGHT: Colors = {
  bg: '#f4f6fb',
  panel: '#ffffff',
  fg: '#1f2430',
  muted: '#6b7280',
  accent: '#2563eb',
  amber: '#d98e00',
}

export const colorsFor = (theme: string): Colors => (theme === 'light' ? LIGHT : DARK)

export const ThemeCtx = createContext<Colors>(DARK)
export const useColors = (): Colors => useContext(ThemeCtx)
