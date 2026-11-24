import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * DB 스키마 생성·변경(마이그레이션).
 * App 시작 시 SQLiteProvider의 onInit에서 한 번 호출된다.
 *
 * SQLite의 PRAGMA user_version 값에 "현재 스키마 버전"을 저장해 두고,
 * 버전이 낮을 때만 필요한 변경을 순서대로 실행한다.
 * 나중에 컬럼을 추가하려면 DATABASE_VERSION을 올리고 `if (version === N) { ... }` 블록을 추가하면 된다.
 * (Spring 쪽의 Flyway V1__init.sql, V2__... 와 같은 개념. 이미 배포된 블록은 절대 고치지 않는다.)
 */
const DATABASE_VERSION = 2;

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

  if (version === 1) {
    // v2: 사진 여러 장 + 일기 종류(하루/주간/월간)
    // - entry_photos: 일기 1건에 사진 N장 (1:N). 기존 entries.photo_uri 값은 첫 번째 사진으로 옮긴다.
    //   photo_uri 컬럼은 더 이상 쓰지 않지만, 예전 데이터를 안전하게 두기 위해 지우지 않는다.
    // - period: 'day' | 'week' | 'month'. week는 그 주 일요일, month는 그 달 1일을 entry_date에 저장한다.
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS entry_photos (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          entry_id    INTEGER NOT NULL REFERENCES entries (id),
          uri         TEXT    NOT NULL,
          sort_order  INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_entry_photos_entry ON entry_photos (entry_id, sort_order);

        INSERT INTO entry_photos (entry_id, uri, sort_order)
          SELECT id, photo_uri, 0 FROM entries WHERE photo_uri IS NOT NULL;

        ALTER TABLE entries ADD COLUMN period TEXT NOT NULL DEFAULT 'day'
          CHECK (period IN ('day', 'week', 'month'));

        CREATE INDEX IF NOT EXISTS idx_entries_period_date ON entries (period, entry_date);
      `);
    });
    version = 2;
  }

  // PRAGMA 문은 파라미터 바인딩(?)을 쓸 수 없어서 상수 값을 직접 넣는다.
  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
