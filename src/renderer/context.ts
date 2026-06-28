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
  settings?: Settings
  text?: SelectedText
  lastSummary?: SessionSummary
}

export interface Nav {
  toProfile(): void
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
