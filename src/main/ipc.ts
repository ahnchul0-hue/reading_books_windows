// ipcMain 핸들러 — preload 계약(IPC 채널)을 service/파일열기에 연결.
import { ipcMain, dialog } from 'electron'
import { readFileSync } from 'node:fs'
import { IPC } from '../shared/ipc-contract'
import type { Settings, SessionProgress, ReadingState } from '../shared/types'
import type { Service } from './service'
import { parseTxt } from './importTxt'

export function registerIpc(service: Service): void {
  ipcMain.handle(IPC.profilesList, () => service.profiles.list())
  ipcMain.handle(IPC.profilesCreate, (_e, name: string, avatar: string | null) =>
    service.profiles.create(name, avatar),
  )
  ipcMain.handle(IPC.profilesRemove, (_e, id: number) => service.profiles.remove(id))

  ipcMain.handle(IPC.textsList, (_e, profileId: number) => service.texts.list(profileId))
  ipcMain.handle(
    IPC.textsSave,
    (_e, profileId: number, title: string, body: string, categoryId?: number) =>
      service.texts.save(profileId, title, body, categoryId),
  )
  ipcMain.handle(IPC.categoriesList, () => service.categories.list())
  ipcMain.handle(IPC.categoriesAdd, (_e, name: string, emoji: string, color: string) =>
    service.categories.add(name, emoji, color),
  )
  ipcMain.handle(IPC.categoriesRemove, (_e, id: number) => service.categories.remove(id))
  ipcMain.handle(IPC.textsImport, async () => {
    const r = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: '텍스트 파일', extensions: ['txt'] }],
    })
    if (r.canceled || r.filePaths.length === 0) return null
    const p = r.filePaths[0]
    return parseTxt(p, readFileSync(p, 'utf8'))
  })

  ipcMain.handle(IPC.settingsGet, (_e, profileId: number) => service.settings.get(profileId))
  ipcMain.handle(IPC.settingsSet, (_e, profileId: number, s: Settings) =>
    service.settings.set(profileId, s),
  )

  ipcMain.handle(IPC.sessionStart, (_e, profileId: number, textId: number | null, sj: string) =>
    service.session.start(profileId, textId, sj),
  )
  ipcMain.handle(IPC.sessionFinish, (_e, id: number, p: SessionProgress) =>
    service.session.finish(id, p),
  )
  ipcMain.handle(IPC.sessionRecent, (_e, profileId: number) => service.session.recent(profileId))

  ipcMain.handle(IPC.stateGet, (_e, profileId: number) => service.state.get(profileId))
  ipcMain.handle(IPC.stateSave, (_e, profileId: number, s: ReadingState) =>
    service.state.save(profileId, s),
  )
  ipcMain.handle(IPC.stateClear, (_e, profileId: number) => service.state.clear(profileId))

  ipcMain.handle(IPC.quotesNext, (_e, profileId: number) => service.quotes.next(profileId))
}
