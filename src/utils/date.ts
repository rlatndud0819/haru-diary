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

/** 'M.D' 짧은 표기 (예: '11.23') */
function formatDot(key: string): string {
  const date = fromDateKey(key);
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

// ───────────── 기간(하루/주간/월간) ─────────────
// 주는 달력과 같이 일요일에 시작한다.

/** 하루/주간/월간 */
export type Period = 'day' | 'week' | 'month';

/** key가 속한 기간의 시작일 (day: 그대로, week: 그 주 일요일, month: 그 달 1일) */
export function periodStart(period: Period, key: string): string {
  const date = fromDateKey(key);
  if (period === 'week') date.setDate(date.getDate() - date.getDay());
  if (period === 'month') date.setDate(1);
  return toDateKey(date);
}

/** key가 속한 기간의 마지막 날 */
export function periodEnd(period: Period, key: string): string {
  const start = fromDateKey(periodStart(period, key));
  if (period === 'week') start.setDate(start.getDate() + 6);
  if (period === 'month') return toDateKey(new Date(start.getFullYear(), start.getMonth() + 1, 0));
  return toDateKey(start);
}

/** 기간 단위로 앞뒤 이동한 시작일 (diff = -1: 이전, +1: 다음) */
export function shiftPeriod(period: Period, key: string, diff: number): string {
  const date = fromDateKey(periodStart(period, key));
  if (period === 'day') date.setDate(date.getDate() + diff);
  if (period === 'week') date.setDate(date.getDate() + diff * 7);
  if (period === 'month') date.setMonth(date.getMonth() + diff);
  return toDateKey(date);
}

/**
 * 기간을 사람이 읽는 글자로.
 * - day   : '2026년 11월 22일 (일)'
 * - week  : '11월 4째 주 (11.22 ~ 11.28)'
 * - month : '2026년 11월'
 */
export function formatPeriod(period: Period, key: string): string {
  const start = periodStart(period, key);
  const date = fromDateKey(start);
  if (period === 'day') return formatKoreanDate(start);
  if (period === 'month') return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  // 몇째 주인지는 그 주 토요일이 속한 달 기준으로 센다 (달력의 줄 번호와 같다)
  const end = fromDateKey(periodEnd('week', start));
  const firstOfMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  const weekNo = Math.floor((end.getDate() - 1 + firstOfMonth.getDay()) / 7) + 1;
  return `${end.getMonth() + 1}월 ${weekNo}째 주 (${formatDot(start)} ~ ${formatDot(toDateKey(end))})`;
}

export { WEEKDAYS };
