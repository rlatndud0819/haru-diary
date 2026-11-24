import type { SQLiteDatabase } from 'expo-sqlite';

import type { Tag } from '@/types/diary';

/**
 * 이유 태그 저장소. (일·운동·가족 ... 처럼 그날 기분의 이유를 붙이는 꼬리표)
 * 일기와 태그는 다대다 관계라서 연결은 entry_tags 테이블이 맡는다. (diary-repository.ts 참고)
 */

export async function listTags(db: SQLiteDatabase): Promise<Tag[]> {
  return db.getAllAsync<Tag>('SELECT id, name FROM tags ORDER BY sort_order, id');
}

/**
 * 새 태그 추가. 같은 이름이 이미 있으면 그 태그를 돌려준다.
 * @returns 추가되었거나 이미 있던 태그. 이름이 비어 있으면 null
 */
export async function createTag(db: SQLiteDatabase, rawName: string): Promise<Tag | null> {
  const name = rawName.trim();
  if (!name) return null;
  const existing = await db.getFirstAsync<Tag>('SELECT id, name FROM tags WHERE name = ?', name);
  if (existing) return existing;
  const max = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM tags');
  const result = await db.runAsync(
    'INSERT INTO tags (name, sort_order, created_at) VALUES (?, ?, ?)',
    name,
    (max?.m ?? -1) + 1,
    new Date().toISOString()
  );
  return { id: result.lastInsertRowId, name };
}

/** 태그 삭제. 이 태그를 붙였던 일기에서도 함께 빠진다. (일기 자체는 지워지지 않음) */
export async function deleteTag(db: SQLiteDatabase, id: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM entry_tags WHERE tag_id = ?', id);
    await db.runAsync('DELETE FROM tags WHERE id = ?', id);
  });
}
