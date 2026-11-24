import type { DiaryPeriod } from '@/types/diary';

/** 일기 종류별 화면 문구. 화면 곳곳에서 같은 문구를 쓰도록 한 곳에 모았다. */
export type PeriodInfo = {
  period: DiaryPeriod;
  /** 탭·칩에 쓰는 짧은 이름 */
  label: string;
  /** 기분 섹션 제목 */
  moodLabel: string;
  titlePlaceholder: string;
  contentPlaceholder: string;
  /** 날짜 이동 화살표의 접근성 이름 */
  prevLabel: string;
  nextLabel: string;
};

export const PERIODS: readonly PeriodInfo[] = [
  {
    period: 'day',
    label: '하루',
    moodLabel: '오늘의 기분',
    titlePlaceholder: '오늘을 한 줄로 표현하면?',
    contentPlaceholder: '오늘 있었던 일, 느낀 점을 자유롭게 적어 보세요.',
    prevLabel: '전날',
    nextLabel: '다음날',
  },
  {
    period: 'week',
    label: '주간',
    moodLabel: '이번 주 기분',
    titlePlaceholder: '이번 주를 한 줄로 표현하면?',
    contentPlaceholder: '이번 주에 잘한 일, 아쉬운 일, 다음 주에 해 보고 싶은 일을 적어 보세요.',
    prevLabel: '지난주',
    nextLabel: '다음 주',
  },
  {
    period: 'month',
    label: '월간',
    moodLabel: '이번 달 기분',
    titlePlaceholder: '이번 달을 한 줄로 표현하면?',
    contentPlaceholder: '이번 달 기억에 남는 일과 다음 달 목표를 적어 보세요.',
    prevLabel: '지난달',
    nextLabel: '다음 달',
  },
];

export function getPeriod(period: DiaryPeriod): PeriodInfo {
  return PERIODS.find((p) => p.period === period) ?? PERIODS[0];
}
