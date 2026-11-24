/**
 * 일기 데이터 타입 정의.
 * DB 테이블(entries + entry_photos)의 행과 화면에서 쓰는 객체를 같은 모양으로 맞춰 둔다.
 */

/** 기분 단계: 1(최악) ~ 5(최고) */
export type MoodLevel = 1 | 2 | 3 | 4 | 5;

/**
 * 일기 종류.
 * - day   : 하루 일기
 * - week  : 주간 회고 (entryDate = 그 주 일요일)
 * - month : 월간 회고 (entryDate = 그 달 1일)
 */
export type DiaryPeriod = 'day' | 'week' | 'month';

/** 한 일기에 붙일 수 있는 최대 사진 수 */
export const MAX_PHOTOS = 10;

/** 한 일기에 고를 수 있는 최대 감정 단어 수 */
export const MAX_EMOTIONS = 5;

/** 이유 태그 (사용자가 추가·삭제 가능) */
export type Tag = { id: number; name: string };

/** 저장된 일기 한 건 */
export type DiaryEntry = {
  id: number;
  period: DiaryPeriod;
  /** 일기 날짜(기간의 시작일). 'YYYY-MM-DD' 형식의 문자열 (예: '2026-11-22') */
  entryDate: string;
  mood: MoodLevel;
  title: string;
  content: string;
  /** 앱 내부 저장소에 복사된 사진 경로들 (순서대로). 사진이 없으면 빈 배열 */
  photoUris: string[];
  /** 고른 감정 단어 id 목록 (constants/emotions.ts 의 id) */
  emotions: string[];
  /** 붙인 이유 태그 */
  tags: Tag[];
  /** 생성·수정 시각 (ISO 문자열) */
  createdAt: string;
  updatedAt: string;
};

/** 새로 작성하거나 수정할 때 화면에서 넘기는 값 (id, 시각은 DB가 관리) */
export type DiaryInput = {
  period: DiaryPeriod;
  entryDate: string;
  mood: MoodLevel;
  title: string;
  content: string;
  photoUris: string[];
  emotions: string[];
  tagIds: number[];
};
