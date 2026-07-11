import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "flashcard.db");

declare global {
  // eslint-disable-next-line no-var
  var __flashcardDb: Database.Database | undefined;
}

function createDb(): Database.Database {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_index INTEGER NOT NULL UNIQUE,
      word TEXT NOT NULL,
      part_of_speech TEXT NOT NULL DEFAULT '',
      meaning TEXT NOT NULL,
      category TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_words_order ON words(order_index);
    CREATE INDEX IF NOT EXISTS idx_words_pos ON words(part_of_speech);

    CREATE TABLE IF NOT EXISTS word_stats (
      word_id INTEGER PRIMARY KEY REFERENCES words(id) ON DELETE CASCADE,
      correct_count INTEGER NOT NULL DEFAULT 0,
      wrong_count INTEGER NOT NULL DEFAULT 0,
      box INTEGER NOT NULL DEFAULT 1,
      last_reviewed_at TEXT,
      next_review_at TEXT
    );

    CREATE TABLE IF NOT EXISTS review_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
      mode TEXT NOT NULL,
      correct INTEGER NOT NULL,
      reviewed_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_review_log_date ON review_log(reviewed_at);

    CREATE TABLE IF NOT EXISTS daily_picks (
      pick_date TEXT PRIMARY KEY,
      word_ids TEXT NOT NULL,
      ranges TEXT,
      count INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  return db;
}

// Reuse the connection across hot reloads in dev.
export function getDb(): Database.Database {
  if (!globalThis.__flashcardDb) {
    globalThis.__flashcardDb = createDb();
  }
  return globalThis.__flashcardDb;
}

export function getSetting(key: string): string | null {
  const row = getDb()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
  getDb()
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .run(key, value);
}
