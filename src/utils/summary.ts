import type { DiaryEntry, Tag } from '@/types/diary';

/**
 * 여러 일기를 모아 "많이 나온 순"으로 세는 함수들. (주간·월간 회고의 요약에 쓴다)
 * DB를 다시 조회하지 않고 이미 불러온 목록으로 계산하는 순수 함수라서 테스트하기 쉽다.
 */

export type Counted<T> = { item: T; count: number };

function countBy<T>(lists: T[][], key: (item: T) => string | number): Counted<T>[] {
  const map = new Map<string | number, Counted<T>>();
  for (const list of lists) {
    for (const item of list) {
      const k = key(item);
      const found = map.get(k);
      if (found) found.count += 1;
      else map.set(k, { item, count: 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

/** 감정 id 별 횟수 (많은 순) */
export function countEmotions(entries: DiaryEntry[]): Counted<string>[] {
  return countBy(
    entries.map((e) => e.emotions),
    (id) => id
  );
}

/** 태그별 횟수 (많은 순) */
export function countTags(entries: DiaryEntry[]): Counted<Tag>[] {
  return countBy(
    entries.map((e) => e.tags),
    (t) => t.id
  );
}

/** 평균 기분 (일기가 없으면 null) */
export function averageMood(entries: DiaryEntry[]): number | null {
  if (entries.length === 0) return null;
  return entries.reduce((sum, e) => sum + e.mood, 0) / entries.length;
}
