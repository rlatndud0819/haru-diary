import type { MoodLevel } from '@/types/diary';

export type MoodInfo = {
  level: MoodLevel;
  emoji: string;
  label: string;
};

/**
 * 기분 5단계 정의. 화면(이모지·라벨)과 DB 값(level)을 연결한다.
 * 색은 라이트/다크 모드마다 다르므로 theme.mood[level] 에 있다. (constants/theme.ts)
 */
export const MOODS: readonly MoodInfo[] = [
  { level: 1, emoji: '😢', label: '최악' },
  { level: 2, emoji: '😕', label: '별로' },
  { level: 3, emoji: '😐', label: '보통' },
  { level: 4, emoji: '🙂', label: '좋음' },
  { level: 5, emoji: '😄', label: '최고' },
];

export const DEFAULT_MOOD: MoodLevel = 3;

export function getMood(level: MoodLevel): MoodInfo {
  return MOODS.find((m) => m.level === level) ?? MOODS[2];
}
