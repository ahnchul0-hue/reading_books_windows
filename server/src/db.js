import Database from 'better-sqlite3'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  pin_salt TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  created_at TEXT
);
CREATE TABLE IF NOT EXISTS texts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  category TEXT,
  created_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  active_ms INTEGER DEFAULT 0,
  chars_read INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  started_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS user_settings (
  user_id INTEGER PRIMARY KEY,
  theme TEXT DEFAULT 'dark',
  font_pt INTEGER DEFAULT 24,
  lines_per_page INTEGER DEFAULT 4,
  speed_mult REAL DEFAULT 1.0,
  timer_min INTEGER DEFAULT 10,
  line_spacing REAL DEFAULT 1.6,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`

export function createDb(file = ':memory:') {
  const db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA)
  return db
}
