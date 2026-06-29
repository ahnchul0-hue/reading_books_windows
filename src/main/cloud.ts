// 서버(클라우드) 통신 — main 프로세스 전용. 토큰을 메모리에 보관(렌더러 비노출).
import { app } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'
import type {
  CloudAuth,
  CloudSession,
  CloudUser,
  CloudTextRow,
  CloudDaySession,
  LeaderRow,
  Settings,
} from '../shared/types'

const DEFAULT_URL = 'https://reading.metabiz.kr'

function configPath(): string {
  return join(app.getPath('userData'), 'cloud-config.json')
}
function getUrl(): string {
  try {
    return (JSON.parse(readFileSync(configPath(), 'utf8')) as { serverUrl: string }).serverUrl
  } catch {
    return DEFAULT_URL
  }
}
function setUrl(url: string): void {
  writeFileSync(configPath(), JSON.stringify({ serverUrl: url }))
}

let token: string | null = null

interface CallOpts {
  method?: string
  body?: unknown
  auth?: boolean
}
async function call<T>(path: string, opts: CallOpts = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (opts.auth && token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(getUrl() + path, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

export const cloud = {
  getUrl,
  setUrl,
  async status(): Promise<boolean> {
    try {
      await call('/api/health')
      return true
    } catch {
      return false
    }
  },
  usersList: () => call<CloudUser[]>('/api/users'),
  async register(name: string, avatar: string | null, pin: string): Promise<CloudAuth> {
    const r = await call<CloudAuth>('/api/auth/register', { method: 'POST', body: { name, avatar, pin } })
    token = r.token
    return r
  },
  async login(userId: number, pin: string): Promise<CloudAuth> {
    const r = await call<CloudAuth>('/api/auth/login', { method: 'POST', body: { userId, pin } })
    token = r.token
    return r
  },
  logout(): void {
    token = null
  },
  textsList: () => call<CloudTextRow[]>('/api/texts', { auth: true }),
  textsSave: (title: string, body: string, category: string | null) =>
    call<{ id: number }>('/api/texts', { method: 'POST', auth: true, body: { title, body, category } }),
  sessionUpload: (s: CloudSession) =>
    call<{ ok: boolean }>('/api/sessions', { method: 'POST', auth: true, body: s }),
  meSessions: () => call<CloudDaySession[]>('/api/me/sessions', { auth: true }),
  settingsGet: () => call<Settings>('/api/settings', { auth: true }),
  settingsSave: (s: Settings) => call<{ ok: boolean }>('/api/settings', { method: 'PUT', auth: true, body: s }),
  leaderboard: () => call<LeaderRow[]>('/api/leaderboard'),
}
