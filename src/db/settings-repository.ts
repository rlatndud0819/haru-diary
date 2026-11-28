import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * 앱 설정 저장소. settings 테이블에 key-value 형태로 저장한다.
 * 예: ('lock_enabled', 'true')
 */

export const SettingKeys = {
  lockEnabled: 'lock_enabled',
  /** 마지막으로 백업 파일을 만든 시각 (ISO 문자열) */
  lastBackupAt: 'last_backup_at',
} as const;

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

/** INSERT ... ON CONFLICT: 키가 없으면 추가, 있으면 값만 갱신 (UPSERT) */
export async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value
  );
}

export async function isLockEnabled(db: SQLiteDatabase): Promise<boolean> {
  return (await getSetting(db, SettingKeys.lockEnabled)) === 'true';
}

export async function getLastBackupAt(db: SQLiteDatabase): Promise<string | null> {
  return getSetting(db, SettingKeys.lastBackupAt);
}

export async function setLastBackupAt(db: SQLiteDatabase, iso: string): Promise<void> {
  await setSetting(db, SettingKeys.lastBackupAt, iso);
}

export async function setLockEnabled(db: SQLiteDatabase, enabled: boolean): Promise<void> {
  await setSetting(db, SettingKeys.lockEnabled, enabled ? 'true' : 'false');
}
