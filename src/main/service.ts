// 데이터 서비스 계층 (Electron 비의존 — Node에서 단위 테스트 가능)
// repository를 묶어 IPC 핸들러가 호출할 동기 메서드를 제공한다.
// 파일 열기(importTxt)는 Electron 의존이라 ipc.ts에서 직접 처리한다.
import type { Repos } from './repositories'
import type { Settings, SessionProgress, ReadingState } from '../shared/types'

export function makeService(repos: Repos) {
  return {
    profiles: {
      list: () => repos.profiles.list(),
      create: (name: string, avatar: string | null = null) => repos.profiles.create(name, avatar),
      remove: (id: number) => repos.profiles.remove(id),
    },
    texts: {
      list: (profileId: number) => repos.texts.list(profileId),
      save: (profileId: number, title: string, body: string, categoryId?: number) =>
        repos.texts.save(profileId, title, body, categoryId),
    },
    categories: {
      list: () => repos.categories.list(),
      add: (name: string, emoji: string, color: string) => repos.categories.add(name, emoji, color),
      remove: (id: number) => repos.categories.remove(id),
    },
    settings: {
      get: (profileId: number) => repos.profiles.getSettings(profileId),
      set: (profileId: number, s: Settings) => repos.profiles.setSettings(profileId, s),
    },
    session: {
      start: (profileId: number, textId: number | null, settingsJson: string) =>
        repos.sessions.start(profileId, textId, settingsJson),
      finish: (id: number, progress: SessionProgress) => repos.sessions.finish(id, progress),
      recent: (profileId: number) => repos.sessions.listByProfile(profileId),
    },
    state: {
      get: (profileId: number) => repos.readingState.get(profileId),
      save: (profileId: number, s: ReadingState) => repos.readingState.save(profileId, s),
      clear: (profileId: number) => repos.readingState.clear(profileId),
    },
    quotes: {
      next: (profileId: number) => repos.quotes.next(profileId),
    },
  }
}

export type Service = ReturnType<typeof makeService>
