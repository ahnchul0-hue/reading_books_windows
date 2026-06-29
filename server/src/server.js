import { createApp } from './app.js'
import { createDb } from './db.js'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const PORT = process.env.PORT || 4000
const DB_FILE = process.env.DB_FILE || 'data/reading.db'

if (DB_FILE !== ':memory:') mkdirSync(dirname(DB_FILE), { recursive: true })
const db = createDb(DB_FILE)
createApp(db).listen(PORT, () => {
  console.log(`[server] reading-trainer-server listening on :${PORT} (db: ${DB_FILE})`)
})
