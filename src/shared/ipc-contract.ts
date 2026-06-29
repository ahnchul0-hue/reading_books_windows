// main ↔ renderer IPC 계약 (Architect 소유)
// preload(invoke)와 main(handle)이 같은 채널 문자열·타입을 공유한다.
import type {
  Profile,
  Settings,
  TextItem,
  Category,
  SessionProgress,
  SessionRecord,
  ReadingState,
  Quote,
  CloudUser,
  CloudAuth,
  CloudSession,
  LeaderRow,
} from './types'

/** IPC 채널 이름. preload와 ipc.ts가 함께 참조. */
export const IPC = {
  profilesList: 'profiles:list',
  profilesCreate: 'profiles:create',
  profilesRemove: 'profiles:remove',
  textsList: 'texts:list',
  textsSave: 'texts:save',
  textsImport: 'texts:importTxt',
  categoriesList: 'categories:list',
  categoriesAdd: 'categories:add',
  categoriesRemove: 'categories:remove',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  sessionStart: 'session:start',
  sessionFinish: 'session:finish',
  sessionRecent: 'session:recent',
  stateGet: 'state:get',
  stateSave: 'state:save',
  stateClear: 'state:clear',
  quotesNext: 'quotes:next',
  cloudStatus: 'cloud:status',
  cloudUrlGet: 'cloud:url:get',
  cloudUrlSet: 'cloud:url:set',
  cloudUsers: 'cloud:users',
  cloudRegister: 'cloud:register',
  cloudLogin: 'cloud:login',
  cloudLogout: 'cloud:logout',
  cloudSaveText: 'cloud:texts:save',
  cloudUploadSession: 'cloud:sessions:upload',
  cloudLeaderboard: 'cloud:leaderboard',
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
    save(profileId: number, title: string, body: string, categoryId?: number): Promise<TextItem>
    importTxt(): Promise<{ title: string; body: string } | null>
  }
  categories: {
    list(): Promise<Category[]>
    add(name: string, emoji: string, color: string): Promise<Category>
    remove(id: number): Promise<void>
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
  cloud: {
    status(): Promise<boolean>
    getUrl(): Promise<string>
    setUrl(url: string): Promise<void>
    users(): Promise<CloudUser[]>
    register(name: string, avatar: string | null, pin: string): Promise<CloudAuth>
    login(userId: number, pin: string): Promise<CloudAuth>
    logout(): Promise<void>
    saveText(title: string, body: string, category: string | null): Promise<{ id: number }>
    uploadSession(s: CloudSession): Promise<{ ok: boolean }>
    leaderboard(): Promise<LeaderRow[]>
  }
}
