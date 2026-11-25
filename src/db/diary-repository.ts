import type { SQLiteDatabase } from 'expo-sqlite';

import type { DiaryEntry, DiaryInput, DiaryPeriod, MoodLevel } from '@/types/diary';

/**
 * 일기 저장소(Repository).
 * SQL은 전부 이 파일에만 둔다. 화면 코드는 이 함수들만 호출하고 SQL을 직접 몰라도 된다.
 * → 나중에 서버 동기화를 붙일 때도 이 파일만 바꾸면 된다. (Spring의 Repository/DAO 계층과 같은 역할)
 *
 * 테이블
 * - entries        : 일기 본문
 * - entry_photos   : 일기에 붙은 사진 (1:N)
 * - entry_emotions : 일기에 고른 감정 단어 (1:N)
 * - entry_tags     : 일기와 이유 태그 연결 (N:M, 태그 자체는 tag-repository.ts)
 * JPA라면 연관관계로 자동 로딩되겠지만, 여기서는 attachRelations()가 그 역할을 직접 한다.
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
type EmotionRow = { entry_id: number; emotion: string };
type TagRow = { entry_id: number; id: number; name: string };

/** 정렬 기준: 날짜 최신순 → 같은 날이면 나중에 쓴 순 */
const ORDER_BY = 'ORDER BY entry_date DESC, created_at DESC';

/**
 * ids 를 500개씩 나눠 "WHERE entry_id IN (?, ?, ...)" 쿼리를 실행하고 결과를 합친다.
 * SQLite는 한 쿼리에 넣을 수 있는 ? 개수에 한도가 있어서 나눈다.
 */
async function selectByEntryIds<T>(db: SQLiteDatabase, ids: number[], sql: (placeholders: string) => string): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    out.push(...(await db.getAllAsync<T>(sql(chunk.map(() => '?').join(', ')), ...chunk)));
  }
  return out;
}

function groupBy<R extends { entry_id: number }, V>(rows: R[], pick: (row: R) => V): Map<number, V[]> {
  const map = new Map<number, V[]>();
  for (const r of rows) {
    const list = map.get(r.entry_id) ?? [];
    list.push(pick(r));
    map.set(r.entry_id, list);
  }
  return map;
}

/**
 * 일기 행들에 사진·감정·태그를 붙여서 DiaryEntry로 만든다.
 * N+1 쿼리(일기마다 따로 조회)를 피하려고 종류별로 IN (...) 한 번씩만 조회한다.
 * (JPA의 fetch join / @BatchSize 를 손으로 하는 것과 같다)
 */
async function attachRelations(db: SQLiteDatabase, rows: EntryRow[]): Promise<DiaryEntry[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [photos, emotions, tags] = await Promise.all([
    selectByEntryIds<PhotoRow>(
      db,
      ids,
      (ph) => `SELECT entry_id, uri FROM entry_photos WHERE entry_id IN (${ph}) ORDER BY entry_id, sort_order`
    ),
    selectByEntryIds<EmotionRow>(
      db,
      ids,
      (ph) => `SELECT entry_id, emotion FROM entry_emotions WHERE entry_id IN (${ph}) ORDER BY entry_id, rowid`
    ),
    selectByEntryIds<TagRow>(
      db,
      ids,
      (ph) => `SELECT et.entry_id, t.id, t.name FROM entry_tags et JOIN tags t ON t.id = et.tag_id
               WHERE et.entry_id IN (${ph}) ORDER BY et.entry_id, t.sort_order, t.id`
    ),
  ]);
  const photosBy = groupBy(photos, (r) => r.uri);
  const emotionsBy = groupBy(emotions, (r) => r.emotion);
  const tagsBy = groupBy(tags, (r) => ({ id: r.id, name: r.name }));

  return rows.map((row) => ({
    id: row.id,
    period: row.period,
    entryDate: row.entry_date,
    mood: row.mood as MoodLevel,
    title: row.title,
    content: row.content,
    photoUris: photosBy.get(row.id) ?? [],
    emotions: emotionsBy.get(row.id) ?? [],
    tags: tagsBy.get(row.id) ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * 목록 조회. 조건은 모두 선택 사항이다.
 * - keyword : 제목·본문·태그 이름 검색
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
    // 제목·본문 또는 태그 이름으로 검색
    where.push(`(title LIKE ? OR content LIKE ? OR id IN (
      SELECT et.entry_id FROM entry_tags et JOIN tags t ON t.id = et.tag_id WHERE t.name LIKE ?))`);
    const like = `%${filter.keyword}%`;
    params.push(like, like, like);
  }
  if (filter.period) {
    where.push('period = ?');
    params.push(filter.period);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await db.getAllAsync<EntryRow>(`SELECT * FROM entries ${whereSql} ${ORDER_BY}`, ...params);
  return attachRelations(db, rows);
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
  return attachRelations(db, rows);
}

/** 날짜별 기분 한 칸 (연간 보기용) */
export type DailyMood = { entryDate: string; mood: MoodLevel; entryId: number };

/**
 * 기간 안의 하루 일기 기분만 가볍게 조회한다. (사진·감정·태그는 붙이지 않는다)
 * 같은 날 일기가 여러 개면 가장 나중에 쓴 일기를 쓴다. 캘린더와 같은 규칙이다.
 */
export async function getDailyMoods(db: SQLiteDatabase, startKey: string, endKey: string): Promise<DailyMood[]> {
  const rows = await db.getAllAsync<{ id: number; entry_date: string; mood: number }>(
    `SELECT id, entry_date, mood FROM entries
     WHERE period = 'day' AND entry_date BETWEEN ? AND ?
     ORDER BY entry_date ASC, created_at ASC`,
    startKey,
    endKey
  );
  const byDate = new Map<string, DailyMood>();
  for (const r of rows) byDate.set(r.entry_date, { entryDate: r.entry_date, mood: r.mood as MoodLevel, entryId: r.id });
  return [...byDate.values()];
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
  return attachRelations(db, rows);
}

export async function getEntryById(db: SQLiteDatabase, id: number): Promise<DiaryEntry | null> {
  const row = await db.getFirstAsync<EntryRow>('SELECT * FROM entries WHERE id = ?', id);
  if (!row) return null;
  const [entry] = await attachRelations(db, [row]);
  return entry;
}

/**
 * 사진·감정·태그를 통째로 교체한다.
 * (지우고 다시 넣기: 추가·삭제·순서 변경을 한 번에 처리할 수 있어서 가장 단순하다)
 */
async function replaceRelations(db: SQLiteDatabase, entryId: number, input: DiaryInput): Promise<void> {
  await db.runAsync('DELETE FROM entry_photos WHERE entry_id = ?', entryId);
  await db.runAsync('DELETE FROM entry_emotions WHERE entry_id = ?', entryId);
  await db.runAsync('DELETE FROM entry_tags WHERE entry_id = ?', entryId);
  for (let i = 0; i < input.photoUris.length; i++) {
    await db.runAsync(
      'INSERT INTO entry_photos (entry_id, uri, sort_order) VALUES (?, ?, ?)',
      entryId,
      input.photoUris[i],
      i
    );
  }
  for (const emotion of new Set(input.emotions)) {
    await db.runAsync('INSERT INTO entry_emotions (entry_id, emotion) VALUES (?, ?)', entryId, emotion);
  }
  for (const tagId of new Set(input.tagIds)) {
    await db.runAsync('INSERT INTO entry_tags (entry_id, tag_id) VALUES (?, ?)', entryId, tagId);
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
    await replaceRelations(db, id, input);
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
    await replaceRelations(db, id, input);
  });
}

export async function deleteEntry(db: SQLiteDatabase, id: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM entry_photos WHERE entry_id = ?', id);
    await db.runAsync('DELETE FROM entry_emotions WHERE entry_id = ?', id);
    await db.runAsync('DELETE FROM entry_tags WHERE entry_id = ?', id);
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

/** 통계: 많이 고른 감정 단어 (많은 순) */
export async function getEmotionCounts(db: SQLiteDatabase): Promise<{ emotion: string; count: number }[]> {
  return db.getAllAsync<{ emotion: string; count: number }>(
    'SELECT emotion, COUNT(*) AS count FROM entry_emotions GROUP BY emotion ORDER BY count DESC, emotion'
  );
}

export type TagMoodImpact = {
  tagId: number;
  name: string;
  /** 이 태그를 붙인 하루 일기 수 */
  count: number;
  /** 이 태그를 붙인 날의 평균 기분 (1~5) */
  avgMood: number;
  /** 전체 하루 일기 평균과의 차이. 양수면 이 태그가 있는 날 기분이 더 좋았다 */
  diff: number;
};

/**
 * 통계: 태그별 기분 영향.
 * "운동을 붙인 날 평균 기분 4.3, 전체 평균보다 +0.6" 처럼 비교한다.
 * 하루 일기만 대상으로 하고, minCount 번 이상 쓰인 태그만 계산한다. (한두 번으로는 의미가 없어서)
 */
export async function getTagMoodImpact(db: SQLiteDatabase, minCount = 2): Promise<TagMoodImpact[]> {
  const overall = await db.getFirstAsync<{ avg: number | null }>(
    "SELECT AVG(mood) AS avg FROM entries WHERE period = 'day'"
  );
  const avg = overall?.avg;
  if (avg == null) return [];
  const rows = await db.getAllAsync<{ tagId: number; name: string; count: number; avgMood: number }>(
    `SELECT t.id AS tagId, t.name AS name, COUNT(*) AS count, AVG(e.mood) AS avgMood
     FROM entry_tags et
     JOIN entries e ON e.id = et.entry_id
     JOIN tags t ON t.id = et.tag_id
     WHERE e.period = 'day'
     GROUP BY t.id
     HAVING COUNT(*) >= ?`,
    minCount
  );
  return rows
    .map((r) => ({ ...r, diff: r.avgMood - avg }))
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}
