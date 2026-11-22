import type { SQLiteDatabase } from 'expo-sqlite';

import type { DiaryEntry, DiaryInput, MoodLevel } from '@/types/diary';

/**
 * 일기 저장소(Repository).
 * SQL은 전부 이 파일에만 둔다. 화면 코드는 이 함수들만 호출하고 SQL을 직접 몰라도 된다.
 * → 나중에 서버 동기화를 붙일 때도 이 파일만 바꾸면 된다. (Spring의 Repository/DAO 계층과 같은 역할)
 */

/** DB 행 모양 (컬럼명이 snake_case) */
type EntryRow = {
  id: number;
  entry_date: string;
  mood: number;
  title: string;
  content: string;
  photo_uri: string | null;
  created_at: string;
  updated_at: string;
};

/** DB 행 → 앱에서 쓰는 객체(camelCase)로 변환 */
function toEntry(row: EntryRow): DiaryEntry {
  return {
    id: row.id,
    entryDate: row.entry_date,
    mood: row.mood as MoodLevel,
    title: row.title,
    content: row.content,
    photoUri: row.photo_uri,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** 전체 일기 (최신 날짜 순) */
export async function getAllEntries(db: SQLiteDatabase): Promise<DiaryEntry[]> {
  const rows = await db.getAllAsync<EntryRow>(
    'SELECT * FROM entries ORDER BY entry_date DESC, created_at DESC'
  );
  return rows.map(toEntry);
}

/** 제목·본문 검색 */
export async function searchEntries(db: SQLiteDatabase, keyword: string): Promise<DiaryEntry[]> {
  const like = `%${keyword}%`;
  const rows = await db.getAllAsync<EntryRow>(
    `SELECT * FROM entries
     WHERE title LIKE ? OR content LIKE ?
     ORDER BY entry_date DESC, created_at DESC`,
    like,
    like
  );
  return rows.map(toEntry);
}

/** 특정 기간의 일기 (캘린더용). startKey, endKey 모두 포함 */
export async function getEntriesBetween(
  db: SQLiteDatabase,
  startKey: string,
  endKey: string
): Promise<DiaryEntry[]> {
  const rows = await db.getAllAsync<EntryRow>(
    `SELECT * FROM entries
     WHERE entry_date BETWEEN ? AND ?
     ORDER BY entry_date ASC, created_at ASC`,
    startKey,
    endKey
  );
  return rows.map(toEntry);
}

export async function getEntryById(db: SQLiteDatabase, id: number): Promise<DiaryEntry | null> {
  const row = await db.getFirstAsync<EntryRow>('SELECT * FROM entries WHERE id = ?', id);
  return row ? toEntry(row) : null;
}

/** 새 일기 저장. 생성된 id를 돌려준다. */
export async function createEntry(db: SQLiteDatabase, input: DiaryInput): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO entries (entry_date, mood, title, content, photo_uri, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    input.entryDate,
    input.mood,
    input.title,
    input.content,
    input.photoUri,
    now,
    now
  );
  return result.lastInsertRowId;
}

export async function updateEntry(db: SQLiteDatabase, id: number, input: DiaryInput): Promise<void> {
  await db.runAsync(
    `UPDATE entries
     SET entry_date = ?, mood = ?, title = ?, content = ?, photo_uri = ?, updated_at = ?
     WHERE id = ?`,
    input.entryDate,
    input.mood,
    input.title,
    input.content,
    input.photoUri,
    new Date().toISOString(),
    id
  );
}

export async function deleteEntry(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM entries WHERE id = ?', id);
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
