import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * DB 스키마 생성·변경(마이그레이션).
 * App 시작 시 SQLiteProvider의 onInit에서 한 번 호출된다.
 *
 * SQLite의 PRAGMA user_version 값에 "현재 스키마 버전"을 저장해 두고,
 * 버전이 낮을 때만 필요한 변경을 순서대로 실행한다.
 * 나중에 컬럼을 추가하려면 DATABASE_VERSION을 올리고 `if (version === 1) { ... }` 블록을 추가하면 된다.
 */
const DATABASE_VERSION = 1;

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  if (version >= DATABASE_VERSION) {
    return;
  }

  if (version === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS entries (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_date  TEXT    NOT NULL,
        mood        INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 5),
        title       TEXT    NOT NULL DEFAULT '',
        content     TEXT    NOT NULL DEFAULT '',
        photo_uri   TEXT,
        created_at  TEXT    NOT NULL,
        updated_at  TEXT    NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_entries_date ON entries (entry_date);

      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    version = 1;
  }

  // PRAGMA 문은 파라미터 바인딩(?)을 쓸 수 없어서 상수 값을 직접 넣는다.
  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
