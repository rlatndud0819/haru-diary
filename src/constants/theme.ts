import type { TextStyle } from 'react-native';

/**
 * 디자인 토큰: 앱 전체에서 쓰는 색상·간격·모서리·글자 스타일 값.
 * 웹으로 치면 CSS 변수(:root { --tint: ... })를 모아 둔 파일이다.
 *
 * - 화면/컴포넌트에서 숫자·색상을 직접 쓰지 말고 여기 값을 가져다 쓴다.
 * - 색은 라이트/다크 모드별로 나눠 두고, useTheme() 또는 makeStyles()로 현재 모드 값을 가져온다.
 * - 값 하나만 바꾸면 앱 전체에 반영된다.
 */

export const Colors = {
  light: {
    text: '#1C1C1E',
    textSecondary: '#6B6B70',
    background: '#FAF8F5',
    card: '#FFFFFF',
    border: '#E7E3DD',
    // 대비(WCAG AA 4.5:1) 기준으로 맞춘 값. 흰 글자 on tint 4.99, 배경 위 tint 4.71, danger 6.09
    tint: '#B84F33',
    tintText: '#FFFFFF',
    danger: '#B42340',
    /** 사진 위에 얹는 반투명 검정(삭제 버튼 등)과 그 위 글자색 */
    overlay: '#00000099',
    onOverlay: '#FFFFFF',
    /** 카메라 화면 배경. 카메라 앱은 라이트 모드여도 검정 배경이 기본이다. */
    cameraBackground: '#000000',
    /** 검정 카메라 배경 위의 강조색 (라이트 모드의 진한 tint는 검정 위에서 잘 안 보여서 따로 둔다) */
    cameraAccent: '#F2A28B',
    /** 기분 1~5 색. 밝은 회색 트랙 위에서도 구분되도록(3:1 이상) 진하게 잡았다. */
    mood: { 1: '#5A6E8C', 2: '#737F91', 3: '#957A4E', 4: '#A86428', 5: '#B84F33' },
  },
  dark: {
    text: '#F2F2F4',
    textSecondary: '#A1A1A8',
    background: '#121214',
    card: '#1E1E21',
    border: '#2E2E33',
    tint: '#F2A28B',
    tintText: '#1C1C1E',
    danger: '#FF6B6B',
    overlay: '#00000099',
    onOverlay: '#FFFFFF',
    cameraBackground: '#000000',
    cameraAccent: '#F2A28B',
    /** 어두운 배경에서는 밝은 파스텔 톤이 잘 보인다. */
    mood: { 1: '#7A8CA5', 2: '#9AA7B8', 3: '#C9B79C', 4: '#F2B880', 5: '#E07A5F' },
  },
} as const;

export type ThemeColors = (typeof Colors)['light'] | (typeof Colors)['dark'];

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

/**
 * 글자 스타일 프리셋. <AppText variant="title"> 처럼 이름으로 골라 쓴다.
 * (CSS의 .title, .caption 같은 유틸리티 클래스와 같은 개념)
 */
export const Typography = {
  largeTitle: { fontSize: 30, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '700' },
  heading: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24 },
  bodySmall: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '700' },
  caption: { fontSize: 12, fontWeight: '600' },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof Typography;

/** 레이아웃 공통 값 */
export const Layout = {
  /** 화면 좌우 여백 */
  screenPadding: Spacing.md,
  /** 하단 탭 바에 마지막 내용이 가려지지 않도록 스크롤 끝에 두는 여유 공간 */
  tabBarInset: 120,
  /** 눌렀을 때 살짝 흐려지는 정도 (모든 버튼·카드 공통) */
  pressedOpacity: 0.7,
  disabledOpacity: 0.4,
} as const;
