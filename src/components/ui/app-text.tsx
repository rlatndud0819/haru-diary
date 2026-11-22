import { Text, type TextProps } from 'react-native';

import { type ThemeColors, Typography, type TypographyVariant } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextTone = 'primary' | 'secondary' | 'tint' | 'danger' | 'onTint';

/** 단일 색 값인 테마 키만 (mood 같은 묶음 제외) */
type ColorKey = Exclude<keyof ThemeColors, 'mood'>;

const toneToColor: Record<TextTone, ColorKey> = {
  primary: 'text',
  secondary: 'textSecondary',
  tint: 'tint',
  danger: 'danger',
  onTint: 'tintText',
};

type Props = TextProps & {
  /** 글자 크기·굵기 프리셋 (constants/theme.ts 의 Typography) */
  variant?: TypographyVariant;
  /** 글자색 역할. 실제 색은 라이트/다크 모드에 따라 자동으로 정해진다. */
  tone?: TextTone;
};

/**
 * 앱 공통 텍스트. 기본 <Text> 대신 이걸 쓰면 글자 스타일과 다크 모드 색이 자동으로 맞춰진다.
 *
 * <AppText variant="title">제목</AppText>
 * <AppText variant="caption" tone="secondary">보조 설명</AppText>
 *
 * 추가 스타일(margin 등)은 style로 덧붙이면 된다. 배열의 뒤쪽 스타일이 앞쪽을 덮어쓴다(CSS 우선순위와 비슷).
 */
export function AppText({ variant = 'body', tone = 'primary', style, ...rest }: Props) {
  const theme = useTheme();
  return <Text {...rest} style={[Typography[variant], { color: theme[toneToColor[tone]] }, style]} />;
}
