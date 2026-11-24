import type { SQLiteDatabase } from 'expo-sqlite';

import type { DiaryEntry, DiaryInput, DiaryPeriod, MoodLevel } from '@/types/diary';

/**
 * 일기 저장소(Repository).
 * SQL은 전부 이 파일에만 둔다. 화면 코드는 이 함수들만 호출하고 SQL을 직접 몰라도 된다.
 * → 나중에 서버 동기화를 붙일 때도 이 파일만 바꾸면 된다. (Spring의 Repository/DAO 계층과 같은 역할)
 *
 * 테이블 2개
 * - entries      : 일기 본문 (1)
 * - entry_photos : 일기에 붙은 사진 (N)
 * JPA라면 @OneToMany 로 자동 로딩되겠지만, 여기서는 attachPhotos()가 그 역할을 직접 한다.
 */

/** DB 행 모양 (컬럼명이 snake_case) */
type EntryRow = {
  id: number;
  period: DiaryPeriod;
  entry_date: string;
  mood: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

type PhotoRow = { entry_id: number; uri: string };

/** 정렬 기준: 날짜 최신순 → 같은 날이면 나중에 쓴 순 */
const ORDER_BY = 'ORDER BY entry_date DESC, created_at DESC';

/**
 * 일기 행들에 사진 목록을 붙여서 DiaryEntry로 만든다.
 * N+1 쿼리(일기마다 사진 조회)를 피하려고 IN (...) 한 번으로 모든 사진을 가져온다.
 */
async function attachPhotos(db: SQLiteDatabase, rows: EntryRow[]): Promise<DiaryEntry[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const photos: PhotoRow[] = [];
  // SQLite는 한 쿼리에 넣을 수 있는 ? 개수에 한도가 있어서 500개씩 나눠 조회한다.
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const placeholders = chunk.map(() => '?').join(', ');
    photos.push(
      ...(await db.getAllAsync<PhotoRow>(
        `SELECT entry_id, uri FROM entry_photos
         WHERE entry_id IN (${placeholders})
         ORDER BY entry_id, sort_order`,
        ...chunk
      ))
    );
  }

  const byEntry = new Map<number, string[]>();
  for (const p of photos) {
    const list = byEntry.get(p.entry_id) ?? [];
    list.push(p.uri);
    byEntry.set(p.entry_id, list);
  }

  return rows.map((row) => ({
    id: row.id,
    period: row.period,
    entryDate: row.entry_date,
    mood: row.mood as MoodLevel,
    title: row.title,
    content: row.content,
    photoUris: byEntry.get(row.id) ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * 목록 조회. 조건은 모두 선택 사항이다.
 * - keyword : 제목·본문 검색
 * - period  : 일기 종류 필터 (없으면 전체)
 * (MyBatis의 동적 SQL <where><if> 와 같은 방식으로 조건을 조립한다.)
 */
export async function listEntries(
  db: SQLiteDatabase,
  filter: { keyword?: string; period?: DiaryPeriod } = {}
): Promise<DiaryEntry[]> {
  const where: string[] = [];
  const params: string[] = [];
  if (filter.keyword) {
    where.push('(title LIKE ? OR content LIKE ?)');
    params.push(`%${filter.keyword}%`, `%${filter.keyword}%`);
  }
  if (filter.period) {
    where.push('period = ?');
    params.push(filter.period);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await db.getAllAsync<EntryRow>(`SELECT * FROM entries ${whereSql} ${ORDER_BY}`, ...params);
  return attachPhotos(db, rows);
}

/** 특정 기간의 일기 (캘린더·주간/월간 모아보기용). startKey, endKey 모두 포함. 기본은 하루 일기만. */
export async function getEntriesBetween(
  db: SQLiteDatabase,
  startKey: string,
  endKey: string,
  period: DiaryPeriod = 'day'
): Promise<DiaryEntry[]> {
  const rows = await db.getAllAsync<EntryRow>(
    `SELECT * FROM entries
     WHERE period = ? AND entry_date BETWEEN ? AND ?
     ORDER BY entry_date ASC, created_at ASC`,
    period,
    startKey,
    endKey
  );
  return attachPhotos(db, rows);
}

/** 해당 기간(주·월)의 회고 일기. startKey는 그 기간의 시작일 */
export async function getEntriesForPeriod(
  db: SQLiteDatabase,
  period: DiaryPeriod,
  startKey: string
): Promise<DiaryEntry[]> {
  const rows = await db.getAllAsync<EntryRow>(
    `SELECT * FROM entries WHERE period = ? AND entry_date = ? ${ORDER_BY}`,
    period,
    startKey
  );
  return attachPhotos(db, rows);
}

export async function getEntryById(db: SQLiteDatabase, id: number): Promise<DiaryEntry | null> {
  const row = await db.getFirstAsync<EntryRow>('SELECT * FROM entries WHERE id = ?', id);
  if (!row) return null;
  const [entry] = await attachPhotos(db, [row]);
  return entry;
}

/** 사진 목록을 통째로 교체한다. (지우고 다시 넣기: 순서 변경까지 한 번에 처리돼서 가장 단순하다) */
async function replacePhotos(db: SQLiteDatabase, entryId: number, uris: string[]): Promise<void> {
  await db.runAsync('DELETE FROM entry_photos WHERE entry_id = ?', entryId);
  for (let i = 0; i < uris.length; i++) {
    await db.runAsync('INSERT INTO entry_photos (entry_id, uri, sort_order) VALUES (?, ?, ?)', entryId, uris[i], i);
  }
}

/**
 * 새 일기 저장. 생성된 id를 돌려준다.
 * withTransactionAsync = Spring의 @Transactional. 사진 저장 중 실패하면 일기 INSERT도 함께 롤백된다.
 */
export async function createEntry(db: SQLiteDatabase, input: DiaryInput): Promise<number> {
  const now = new Date().toISOString();
  let id = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO entries (period, entry_date, mood, title, content, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      input.period,
      input.entryDate,
      input.mood,
      input.title,
      input.content,
      now,
      now
    );
    id = result.lastInsertRowId;
    await replacePhotos(db, id, input.photoUris);
  });
  return id;
}

export async function updateEntry(db: SQLiteDatabase, id: number, input: DiaryInput): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE entries
       SET period = ?, entry_date = ?, mood = ?, title = ?, content = ?, updated_at = ?
       WHERE id = ?`,
      input.period,
      input.entryDate,
      input.mood,
      input.title,
      input.content,
      new Date().toISOString(),
      id
    );
    await replacePhotos(db, id, input.photoUris);
  });
}

export async function deleteEntry(db: SQLiteDatabase, id: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM entry_photos WHERE entry_id = ?', id);
    await db.runAsync('DELETE FROM entries WHERE id = ?', id);
  });
}

/** 통계: 전체 개수와 기분별 개수 */
export async function getMoodStats(
  db: SQLiteDatabase
): Promise<{ total: number; byMood: Record<MoodLevel, number> }> {
  const rows = await db.getAllAsync<{ mood: number; count: number }>(
    'SELECT mood, COUNT(*) AS count FROM entries GROUP BY mood'
  );
  const byMood: Record<MoodLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  for (const row of rows) {
    byMood[row.mood as MoodLevel] = row.count;
    total += row.count;
  }
  return { total, byMood };
}
