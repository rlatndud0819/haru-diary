/**
 * 일기 데이터 타입 정의.
 * DB 테이블(entries)의 한 행(row)과 화면에서 쓰는 객체를 같은 모양으로 맞춰 둔다.
 */

/** 기분 단계: 1(최악) ~ 5(최고) */
export type MoodLevel = 1 | 2 | 3 | 4 | 5;

/** 저장된 일기 한 건 */
export type DiaryEntry = {
  id: number;
  /** 일기 날짜. 'YYYY-MM-DD' 형식의 문자열 (예: '2026-11-22') */
  entryDate: string;
  mood: MoodLevel;
  title: string;
  content: string;
  /** 앱 내부 저장소에 복사된 사진 경로. 사진이 없으면 null */
  photoUri: string | null;
  /** 생성·수정 시각 (ISO 문자열) */
  createdAt: string;
  updatedAt: string;
};

/** 새로 작성하거나 수정할 때 화면에서 넘기는 값 (id, 시각은 DB가 관리) */
export type DiaryInput = {
  entryDate: string;
  mood: MoodLevel;
  title: string;
  content: string;
  photoUri: string | null;
};
