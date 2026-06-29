import AsyncStorage from '@react-native-async-storage/async-storage'

// 기본 서버 주소(공개 도메인). 설정 화면에서 바꿀 수 있음.
const DEFAULT_URL = 'https://reading.metabiz.kr'
const KEY = 'serverUrl'
let token: string | null = null

export type CloudUser = { id: number; name: string; avatar: string | null }
export type LeaderRow = {
  userId: number
  name: string
  avatar: string | null
  streak: number
  weekMinutes: number
  totalChars: number
  completedCount: number
}
export type TextRow = { id: number; title: string; body: string; category: string | null }

export async function getUrl(): Promise<string> {
  return (await AsyncStorage.getItem(KEY)) || DEFAULT_URL
}
export async function setUrl(u: string): Promise<void> {
  await AsyncStorage.setItem(KEY, u)
}

type Opts = { method?: string; body?: unknown; auth?: boolean }
async function call<T>(path: string, opts: Opts = {}): Promise<T> {
  const base = await getUrl()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (opts.auth && token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(base + path, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return (await res.json()) as T
}

export const api = {
  getUrl,
  setUrl,
  isAuthed: () => !!token,
  logout: () => {
    token = null
  },
  health: () => call<{ ok: boolean }>('/api/health'),
  users: () => call<CloudUser[]>('/api/users'),
  async register(name: string, avatar: string | null, pin: string) {
    const r = await call<{ token: string; user: CloudUser }>('/api/auth/register', {
      method: 'POST',
      body: { name, avatar, pin },
    })
    token = r.token
    return r
  },
  async login(userId: number, pin: string) {
    const r = await call<{ token: string; user: CloudUser }>('/api/auth/login', {
      method: 'POST',
      body: { userId, pin },
    })
    token = r.token
    return r
  },
  texts: () => call<TextRow[]>('/api/texts', { auth: true }),
  saveText: (title: string, body: string, category: string | null) =>
    call('/api/texts', { method: 'POST', auth: true, body: { title, body, category } }),
  uploadSession: (s: { activeMs: number; charsRead: number; completed: boolean; startedAt: string }) =>
    call('/api/sessions', { method: 'POST', auth: true, body: s }),
  leaderboard: () => call<LeaderRow[]>('/api/leaderboard'),
}

export const COLORS = {
  bg: '#1f2430',
  panel: '#2a3040',
  fg: '#f3f4f6',
  muted: '#9ca3af',
  accent: '#60a5fa',
  amber: '#F0C674',
}
