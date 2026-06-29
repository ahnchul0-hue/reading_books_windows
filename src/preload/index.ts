// contextIsolation 하에서 안전한 API만 노출 (nodeIntegration OFF).
import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type Api } from '../shared/ipc-contract'
import type { Settings, SessionProgress, ReadingState } from '../shared/types'

const api: Api = {
  profiles: {
    list: () => ipcRenderer.invoke(IPC.profilesList),
    create: (name: string, avatar: string | null = null) =>
      ipcRenderer.invoke(IPC.profilesCreate, name, avatar),
    remove: (id: number) => ipcRenderer.invoke(IPC.profilesRemove, id),
  },
  texts: {
    list: (profileId: number) => ipcRenderer.invoke(IPC.textsList, profileId),
    save: (profileId: number, title: string, body: string) =>
      ipcRenderer.invoke(IPC.textsSave, profileId, title, body),
    importTxt: () => ipcRenderer.invoke(IPC.textsImport),
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
}

contextBridge.exposeInMainWorld('api', api)
