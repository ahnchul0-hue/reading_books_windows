// better-sqlite3 연결 + 마이그레이션 (Electron main 전용)
import Database from 'better-sqlite3'

export type Db = Database.Database

// 마이그레이션 0001 — DESIGN-SPEC 5-2 스키마 (프로필별 분리, FK CASCADE)
const MIGRATION_0001 = `
CREATE TABLE profiles (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  avatar     TEXT,
  created_at TEXT
);
CREATE TABLE settings (
  profile_id     INTEGER PRIMARY KEY,
  theme          TEXT     DEFAULT 'light',
  font_pt        INTEGER  DEFAULT 24,
  lines_per_page INTEGER  DEFAULT 5,
  speed_mult     REAL     DEFAULT 1.0,
  timer_min      INTEGER  DEFAULT 10,
  FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE TABLE texts (
  id         INTEGER PRIMARY KEY,
  profile_id INTEGER NOT NULL,
  title      TEXT,
  body       TEXT NOT NULL,
  created_at TEXT,
  FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE TABLE sessions (
  id            INTEGER PRIMARY KEY,
  profile_id    INTEGER NOT NULL,
  text_id       INTEGER,
  started_at    TEXT,
  ended_at      TEXT,
  active_ms     INTEGER,
  chars_read    INTEGER,
  page_reached  INTEGER,
  settings_json TEXT,
  FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY(text_id)    REFERENCES texts(id)    ON DELETE SET NULL
);
CREATE TABLE quotes (
  id      INTEGER PRIMARY KEY,
  body    TEXT NOT NULL,
  source  TEXT,
  license TEXT
);
CREATE TABLE quote_history (
  profile_id INTEGER NOT NULL,
  quote_id   INTEGER NOT NULL,
  shown_at   TEXT,
  FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY(quote_id)   REFERENCES quotes(id)   ON DELETE CASCADE
);
`

/** DB를 열고 외래키를 켠 뒤 마이그레이션을 적용한다. 기본은 인메모리(:memory:). */
export function createDb(filename = ':memory:'): Db {
  const db = new Database(filename)
  if (filename !== ':memory:') db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  return db
}

/** user_version으로 누적 마이그레이션. 이미 적용됐으면 건너뛴다(멱등). */
export function migrate(db: Db): void {
  const version = db.pragma('user_version', { simple: true }) as number
  if (version < 1) {
    db.exec(MIGRATION_0001)
    db.pragma('user_version = 1')
  }
}
