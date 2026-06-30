// ipcMain 핸들러 — preload 계약(IPC 채널)을 service/파일열기에 연결.
import { ipcMain, dialog } from 'electron'
import { readFileSync } from 'node:fs'
import { IPC } from '../shared/ipc-contract'
import type { Settings, SessionProgress, ReadingState } from '../shared/types'
import type { Service } from './service'
import type { CloudSession, ReadingProgress } from '../shared/types'
import { parseTxt } from './importTxt'
import { cloud } from './cloud'

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

  // 클라우드(서버) 연동
  ipcMain.handle(IPC.cloudStatus, () => cloud.status())
  ipcMain.handle(IPC.cloudUrlGet, () => cloud.getUrl())
  ipcMain.handle(IPC.cloudUrlSet, (_e, url: string) => cloud.setUrl(url))
  ipcMain.handle(IPC.cloudUsers, () => cloud.usersList())
  ipcMain.handle(IPC.cloudRegister, (_e, name: string, avatar: string | null, pin: string) =>
    cloud.register(name, avatar, pin),
  )
  ipcMain.handle(IPC.cloudLogin, (_e, userId: number, pin: string) => cloud.login(userId, pin))
  ipcMain.handle(IPC.cloudLogout, () => cloud.logout())
  ipcMain.handle(IPC.cloudTexts, () => cloud.textsList())
  ipcMain.handle(IPC.cloudSaveText, (_e, title: string, body: string, category: string | null) =>
    cloud.textsSave(title, body, category),
  )
  ipcMain.handle(IPC.cloudUploadSession, (_e, s: CloudSession) => cloud.sessionUpload(s))
  ipcMain.handle(IPC.cloudMeSessions, () => cloud.meSessions())
  ipcMain.handle(IPC.cloudSettingsGet, () => cloud.settingsGet())
  ipcMain.handle(IPC.cloudSettingsSet, (_e, s: Settings) => cloud.settingsSave(s))
  ipcMain.handle(IPC.cloudLeaderboard, () => cloud.leaderboard())
  ipcMain.handle(IPC.cloudDeleteUser, (_e, id: number, adminPin: string) => cloud.deleteUser(id, adminPin))
  ipcMain.handle(IPC.cloudProgressGet, () => cloud.progressGet())
  ipcMain.handle(IPC.cloudProgressSet, (_e, p: ReadingProgress | { textId: null }) => cloud.progressSave(p))
}
