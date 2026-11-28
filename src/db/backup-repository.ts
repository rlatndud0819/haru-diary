import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * 백업·복원용 DB 접근.
 * 일기 관련 테이블 5개를 "행 그대로" 꺼내고, 복원할 때는 통째로 바꿔 넣는다.
 * (Spring으로 치면 mysqldump로 덤프를 뜨고 다시 import 하는 것과 같다. 파일 만들기·읽기는 services/backup.ts 담당)
 *
 * - id를 그대로 보존해서 일기 ↔ 사진·감정·태그 연결이 깨지지 않게 한다.
 * - 사진은 DB에 "파일 이름"만 담는다. 기기마다 앱 폴더 경로가 달라서, 복원할 때 새 기기 경로로 다시 붙인다.
 * - settings(앱 잠금 등)는 기기마다 달라야 하므로 백업하지 않는다.
 */

export type BackupEntryRow = {
  id: number;
  period: string;
  entry_date: string;
  mood: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};
export type BackupPhotoRow = { entry_id: number; file: string; sort_order: number };
export type BackupEmotionRow = { entry_id: number; emotion: string };
export type BackupTagRow = { id: number; name: string; sort_order: number; created_at: string };
export type BackupEntryTagRow = { entry_id: number; tag_id: number };

export type BackupTables = {
  entries: BackupEntryRow[];
  photos: BackupPhotoRow[];
  emotions: BackupEmotionRow[];
  tags: BackupTagRow[];
  entryTags: BackupEntryTagRow[];
};

/** 사진 행은 원래 경로(uri) 그대로 꺼낸다. 파일 이름으로 바꾸는 건 사진 파일을 읽는 services/backup.ts에서 한다. */
export type StoredPhotoRow = { entry_id: number; uri: string; sort_order: number };

export async function readAllForBackup(
  db: SQLiteDatabase
): Promise<Omit<BackupTables, 'photos'> & { photos: StoredPhotoRow[] }> {
  const [entries, photos, emotions, tags, entryTags] = await Promise.all([
    db.getAllAsync<BackupEntryRow>(
      `SELECT id, period, entry_date, mood, title, content, created_at, updated_at FROM entries ORDER BY id`
    ),
    db.getAllAsync<StoredPhotoRow>(`SELECT entry_id, uri, sort_order FROM entry_photos ORDER BY entry_id, sort_order`),
    db.getAllAsync<BackupEmotionRow>(`SELECT entry_id, emotion FROM entry_emotions ORDER BY entry_id`),
    db.getAllAsync<BackupTagRow>(`SELECT id, name, sort_order, created_at FROM tags ORDER BY id`),
    db.getAllAsync<BackupEntryTagRow>(`SELECT entry_id, tag_id FROM entry_tags ORDER BY entry_id`),
  ]);
  return { entries, photos, emotions, tags, entryTags };
}

/** 지금 DB에 있는 모든 사진 경로 (복원 뒤 안 쓰는 옛 사진 파일을 지울 때 쓴다) */
export async function getAllPhotoUris(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ uri: string }>('SELECT uri FROM entry_photos');
  return rows.map((r) => r.uri);
}

/**
 * 일기 데이터 전체를 백업 내용으로 바꾼다. 하나의 트랜잭션이라 중간에 실패하면 원래 상태로 돌아간다.
 * photoUri: 백업 속 파일 이름 → 이 기기에서의 사진 경로
 */
export async function replaceAllFromBackup(
  db: SQLiteDatabase,
  data: BackupTables,
  photoUri: (file: string) => string
): Promise<void> {
  await db.withTransactionAsync(async () => {
    // 자식 테이블부터 지운다 (외래 키 방향)
    await db.execAsync(`
      DELETE FROM entry_tags;
      DELETE FROM entry_emotions;
      DELETE FROM entry_photos;
      DELETE FROM entries;
      DELETE FROM tags;
    `);

    // 같은 SQL을 수백 번 실행하므로 미리 준비해 둔 문장(PreparedStatement)을 재사용한다.
    const insertTag = await db.prepareAsync('INSERT INTO tags (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)');
    const insertEntry = await db.prepareAsync(
      `INSERT INTO entries (id, period, entry_date, mood, title, content, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertPhoto = await db.prepareAsync('INSERT INTO entry_photos (entry_id, uri, sort_order) VALUES (?, ?, ?)');
    const insertEmotion = await db.prepareAsync('INSERT OR IGNORE INTO entry_emotions (entry_id, emotion) VALUES (?, ?)');
    const insertEntryTag = await db.prepareAsync('INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)');
    try {
      for (const t of data.tags) await insertTag.executeAsync(t.id, t.name, t.sort_order, t.created_at);
      for (const e of data.entries) {
        await insertEntry.executeAsync(e.id, e.period, e.entry_date, e.mood, e.title, e.content, e.created_at, e.updated_at);
      }
      for (const p of data.photos) await insertPhoto.executeAsync(p.entry_id, photoUri(p.file), p.sort_order);
      for (const em of data.emotions) await insertEmotion.executeAsync(em.entry_id, em.emotion);
      for (const et of data.entryTags) await insertEntryTag.executeAsync(et.entry_id, et.tag_id);
    } finally {
      await Promise.all([
        insertTag.finalizeAsync(),
        insertEntry.finalizeAsync(),
        insertPhoto.finalizeAsync(),
        insertEmotion.finalizeAsync(),
        insertEntryTag.finalizeAsync(),
      ]);
    }
  });
}
