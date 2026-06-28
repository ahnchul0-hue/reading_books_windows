import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { createDb } from './db'
import { makeRepos } from './repositories'
import { makeService } from './service'
import { registerIpc } from './ipc'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1024,
    height: 720,
    title: 'Reading Trainer',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.loadFile(join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(() => {
  // 프로필·글·세션·명언을 사용자 데이터 폴더의 SQLite에 보관(완전 로컬 — D10).
  const db = createDb(join(app.getPath('userData'), 'reading-trainer.db'))
  const service = makeService(makeRepos(db))
  registerIpc(service)
  console.log('[reading-trainer] db ready, ipc registered')

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
