// main ↔ renderer 공유 도메인 타입. (Architect 소유 — IPC 계약의 기반)

export type Theme = 'light' | 'dark'
export type LinesPerPage = 3 | 4 | 5
export type SpeedMult = 0.5 | 1.0 | 1.5 | 2.0
export type TimerMin = 5 | 10 | 15 | 20

export interface Profile {
  id: number
  name: string // 별명 (실명 비수집 — D10)
  avatar: string | null // 아바타 식별자
  createdAt: string // ISO8601
}

export interface Settings {
  theme: Theme
  fontPt: number // 24pt↑
  linesPerPage: LinesPerPage
  speedMult: SpeedMult
  timerMin: TimerMin
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark', // v2: 기본 어둡게
  fontPt: 24,
  linesPerPage: 4, // v2: 기본 4줄
  speedMult: 1.0,
  timerMin: 10,
}

export interface TextItem {
  id: number
  profileId: number
  title: string
  body: string // 줄바꿈 정규화된 본문(\n)
  createdAt: string
}

export interface SessionRecord {
  id?: number
  profileId: number
  textId: number | null
  startedAt: string
  endedAt: string | null
  activeMs: number
  charsRead: number
  pageReached: number
  settingsJson: string
}

export interface SessionProgress {
  activeMs: number
  charsRead: number
  pageReached: number
}

// 이어읽기용 재개 지점 (레이아웃 비의존: 읽은 글자수 기준)
export interface ReadingState {
  textId: number | null
  charsRead: number // 현재 글에서 읽은 공백제외 글자수
  finished: boolean
}

// 명언 타입은 순수 코어(core/quotes)에서 정의한 것을 재사용한다.
export type { Quote } from '../core/quotes'
