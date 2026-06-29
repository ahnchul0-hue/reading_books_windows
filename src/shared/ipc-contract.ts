// main ↔ renderer IPC 계약 (Architect 소유)
// preload(invoke)와 main(handle)이 같은 채널 문자열·타입을 공유한다.
import type {
  Profile,
  Settings,
  TextItem,
  SessionProgress,
  SessionRecord,
  ReadingState,
  Quote,
} from './types'

/** IPC 채널 이름. preload와 ipc.ts가 함께 참조. */
export const IPC = {
  profilesList: 'profiles:list',
  profilesCreate: 'profiles:create',
  profilesRemove: 'profiles:remove',
  textsList: 'texts:list',
  textsSave: 'texts:save',
  textsImport: 'texts:importTxt',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  sessionStart: 'session:start',
  sessionFinish: 'session:finish',
  sessionRecent: 'session:recent',
  stateGet: 'state:get',
  stateSave: 'state:save',
  stateClear: 'state:clear',
  quotesNext: 'quotes:next',
} as const

/** renderer에서 window.api로 접근하는 안전한 API 표면. */
export interface Api {
  profiles: {
    list(): Promise<Profile[]>
    create(name: string, avatar?: string | null): Promise<Profile>
    remove(id: number): Promise<void>
  }
  texts: {
    list(profileId: number): Promise<TextItem[]>
    save(profileId: number, title: string, body: string): Promise<TextItem>
    importTxt(): Promise<{ title: string; body: string } | null>
  }
  settings: {
    get(profileId: number): Promise<Settings>
    set(profileId: number, s: Settings): Promise<void>
  }
  session: {
    start(profileId: number, textId: number | null, settingsJson: string): Promise<number>
    finish(id: number, progress: SessionProgress): Promise<void>
    recent(profileId: number): Promise<SessionRecord[]>
  }
  state: {
    get(profileId: number): Promise<ReadingState | null>
    save(profileId: number, s: ReadingState): Promise<void>
    clear(profileId: number): Promise<void>
  }
  quotes: {
    next(profileId: number): Promise<Quote>
  }
}
