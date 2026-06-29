// contextIsolation 하에서 안전한 API만 노출 (nodeIntegration OFF).
import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type Api } from '../shared/ipc-contract'
import type { Settings, SessionProgress, ReadingState, CloudSession } from '../shared/types'

const api: Api = {
  profiles: {
    list: () => ipcRenderer.invoke(IPC.profilesList),
    create: (name: string, avatar: string | null = null) =>
      ipcRenderer.invoke(IPC.profilesCreate, name, avatar),
    remove: (id: number) => ipcRenderer.invoke(IPC.profilesRemove, id),
  },
  texts: {
    list: (profileId: number) => ipcRenderer.invoke(IPC.textsList, profileId),
    save: (profileId: number, title: string, body: string, categoryId?: number) =>
      ipcRenderer.invoke(IPC.textsSave, profileId, title, body, categoryId),
    importTxt: () => ipcRenderer.invoke(IPC.textsImport),
  },
  categories: {
    list: () => ipcRenderer.invoke(IPC.categoriesList),
    add: (name: string, emoji: string, color: string) =>
      ipcRenderer.invoke(IPC.categoriesAdd, name, emoji, color),
    remove: (id: number) => ipcRenderer.invoke(IPC.categoriesRemove, id),
  },
  settings: {
    get: (profileId: number) => ipcRenderer.invoke(IPC.settingsGet, profileId),
    set: (profileId: number, s: Settings) => ipcRenderer.invoke(IPC.settingsSet, profileId, s),
  },
  session: {
    start: (profileId: number, textId: number | null, settingsJson: string) =>
      ipcRenderer.invoke(IPC.sessionStart, profileId, textId, settingsJson),
    finish: (id: number, progress: SessionProgress) =>
      ipcRenderer.invoke(IPC.sessionFinish, id, progress),
    recent: (profileId: number) => ipcRenderer.invoke(IPC.sessionRecent, profileId),
  },
  state: {
    get: (profileId: number) => ipcRenderer.invoke(IPC.stateGet, profileId),
    save: (profileId: number, s: ReadingState) => ipcRenderer.invoke(IPC.stateSave, profileId, s),
    clear: (profileId: number) => ipcRenderer.invoke(IPC.stateClear, profileId),
  },
  quotes: {
    next: (profileId: number) => ipcRenderer.invoke(IPC.quotesNext, profileId),
  },
  cloud: {
    status: () => ipcRenderer.invoke(IPC.cloudStatus),
    getUrl: () => ipcRenderer.invoke(IPC.cloudUrlGet),
    setUrl: (url: string) => ipcRenderer.invoke(IPC.cloudUrlSet, url),
    users: () => ipcRenderer.invoke(IPC.cloudUsers),
    register: (name: string, avatar: string | null, pin: string) =>
      ipcRenderer.invoke(IPC.cloudRegister, name, avatar, pin),
    login: (userId: number, pin: string) => ipcRenderer.invoke(IPC.cloudLogin, userId, pin),
    logout: () => ipcRenderer.invoke(IPC.cloudLogout),
    textsList: () => ipcRenderer.invoke(IPC.cloudTexts),
    saveText: (title: string, body: string, category: string | null) =>
      ipcRenderer.invoke(IPC.cloudSaveText, title, body, category),
    uploadSession: (s: CloudSession) => ipcRenderer.invoke(IPC.cloudUploadSession, s),
    meSessions: () => ipcRenderer.invoke(IPC.cloudMeSessions),
    settingsGet: () => ipcRenderer.invoke(IPC.cloudSettingsGet),
    settingsSave: (s: Settings) => ipcRenderer.invoke(IPC.cloudSettingsSet, s),
    leaderboard: () => ipcRenderer.invoke(IPC.cloudLeaderboard),
  },
}

contextBridge.exposeInMainWorld('api', api)
