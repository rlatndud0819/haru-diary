/**
 * 날짜 유틸 함수.
 * DB에는 날짜를 'YYYY-MM-DD' 문자열(dateKey)로 저장한다.
 * 문자열로 저장하면 시간대(타임존) 때문에 날짜가 하루 밀리는 문제가 없고, 문자열 비교만으로 정렬·범위 조회가 된다.
 */

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Date 객체 → 'YYYY-MM-DD' (기기 현지 시간 기준) */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 'YYYY-MM-DD' → Date 객체 (현지 시간 자정) */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

/** dateKey에 일(day) 수를 더한 새 dateKey */
export function addDays(key: string, days: number): string {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** '2026년 11월 22일 (일)' */
export function formatKoreanDate(key: string): string {
  const date = fromDateKey(key);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`;
}

/** '11월 22일 일요일' 같은 짧은 표기 */
export function formatShortDate(key: string): string {
  const date = fromDateKey(key);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAYS[date.getDay()]}요일`;
}

export { WEEKDAYS };
