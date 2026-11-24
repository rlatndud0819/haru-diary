import {
  brightness,
  type ColorMatrix,
  concat,
  contrast,
  fade,
  IDENTITY,
  saturation,
  SEPIA,
  temperature,
  tint,
} from '@/utils/color-matrix';

/**
 * 사진 필터 목록.
 * 각 필터는 색 변환 행렬 하나 + (선택) 비네팅(가장자리 어둡게) 정도로 정의된다.
 * 새 필터를 만들고 싶으면 여기에 한 줄 추가하면 된다. (행렬 함수는 utils/color-matrix.ts)
 */
export type PhotoFilter = {
  id: string;
  name: string;
  matrix: ColorMatrix;
  /** 가장자리 어둡게 하는 정도 0~1 (없으면 0) */
  vignette?: number;
};

export const FILTERS: readonly PhotoFilter[] = [
  { id: 'original', name: '원본', matrix: IDENTITY },
  { id: 'warm', name: '따뜻함', matrix: concat(temperature(0.6), saturation(1.1)) },
  { id: 'cool', name: '시원함', matrix: concat(temperature(-0.6), brightness(0.02)) },
  { id: 'vivid', name: '선명', matrix: concat(saturation(1.45), contrast(1.12)) },
  { id: 'film', name: '필름', matrix: concat(fade(0.1), saturation(0.85), temperature(0.25)), vignette: 0.35 },
  { id: 'vintage', name: '빈티지', matrix: concat(SEPIA, fade(0.08), contrast(0.95)), vignette: 0.5 },
  { id: 'cream', name: '크림', matrix: concat(fade(0.12), saturation(0.8), tint(1.04, 1.0, 0.94), brightness(0.03)) },
  { id: 'soda', name: '청량', matrix: concat(saturation(1.2), tint(0.94, 1.03, 1.08), brightness(0.04)) },
  { id: 'sunset', name: '노을', matrix: concat(tint(1.12, 0.96, 0.86, 0.03, 0, 0.02), contrast(1.05)), vignette: 0.25 },
  { id: 'dreamy', name: '몽환', matrix: concat(fade(0.15), tint(1.05, 0.97, 1.05), saturation(0.9)) },
  { id: 'mono', name: '흑백', matrix: saturation(0) },
  { id: 'noir', name: '누아르', matrix: concat(saturation(0), contrast(1.4)), vignette: 0.6 },
  { id: 'chrome', name: '크롬', matrix: concat(contrast(1.2), saturation(1.15), brightness(-0.02)) },
  { id: 'faded', name: '바랜', matrix: concat(fade(0.18), saturation(0.6)) },
];

/**
 * 필터 효과에 쓰는 고정 색. UI 테마 색이 아니라 "사진에 찍히는 색"이라서
 * 라이트/다크 모드와 상관없이 항상 같은 값을 쓴다.
 */
export const FilterEffectColors = {
  /** 비네팅의 가장자리 색 (검정, 알파는 강도에 따라 계산) */
  vignetteEdge: '#000000',
  /** 필름 카메라 날짜 도장 색 (주황) */
  dateStamp: '#FF9A3C',
} as const;

/** 밝기·대비·채도·색온도 미세 조정 값 */
export type Adjustments = {
  brightness: number; // -0.3 ~ 0.3
  contrast: number; // -0.5 ~ 0.5  (1을 더해서 사용)
  saturation: number; // -1 ~ 1     (1을 더해서 사용)
  temperature: number; // -1 ~ 1
};

export const DEFAULT_ADJUSTMENTS: Adjustments = { brightness: 0, contrast: 0, saturation: 0, temperature: 0 };

/** 조정 슬라이더 정의 (화면에서 이 목록대로 슬라이더를 그린다) */
export const ADJUSTMENT_SLIDERS: readonly { key: keyof Adjustments; label: string; min: number; max: number }[] = [
  { key: 'brightness', label: '밝기', min: -0.3, max: 0.3 },
  { key: 'contrast', label: '대비', min: -0.5, max: 0.5 },
  { key: 'saturation', label: '채도', min: -1, max: 1 },
  { key: 'temperature', label: '색온도', min: -1, max: 1 },
];

/** 조정 값 → 행렬 */
export function adjustmentMatrix(a: Adjustments): ColorMatrix {
  return concat(
    brightness(a.brightness),
    contrast(1 + a.contrast),
    saturation(1 + a.saturation),
    temperature(a.temperature)
  );
}
