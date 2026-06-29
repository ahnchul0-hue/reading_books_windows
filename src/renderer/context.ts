import type { Api } from '../shared/ipc-contract'
import type { Profile, Settings } from '../shared/types'

export interface SelectedText {
  id?: number // 저장된 글이면 id
  title: string
  body: string
}

export interface SessionSummary {
  charsRead: number
  activeMs: number
  pageReached: number
  speedMult: number
}

export interface AppState {
  profile?: Profile
  cloudUserId?: number // 로그인된 서버 사용자 id (랭킹의 '나' 식별)
  settings?: Settings
  text?: SelectedText
  queue?: SelectedText[] // 시간 남으면 이어 읽을 다음 글들
  resumeChars?: number // 이어읽기 시작 글자수(현재 글)
  lastSummary?: SessionSummary
}

export interface Nav {
  toProfile(): void // 홈(사용자 선택)
  toDashboard(): void // 사용자 대시보드
  toSettings(): void // 기본 설정
  toStart(): void
  toReading(): void
  toEnd(): void
}

export interface AppContext {
  root: HTMLElement
  api: Api
  state: AppState
  nav: Nav
}
