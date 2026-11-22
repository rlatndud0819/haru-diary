import { useMemo } from 'react';
import { type ImageStyle, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

/**
 * 테마(라이트/다크) 색을 쓰는 스타일시트를 만드는 도우미.
 *
 * 문제: StyleSheet.create()는 파일이 로드될 때 한 번만 실행되므로 다크 모드 색을 넣을 수 없다.
 *       그래서 지금까지는 `style={[styles.x, { color: theme.text }]}` 처럼 색을 인라인으로 섞어 썼다.
 * 해결: 테마를 받아 스타일을 만드는 함수(factory)를 넘기면, 컴포넌트 안에서 부를 수 있는 훅을 돌려준다.
 *
 * 사용법
 * ```tsx
 * const useStyles = makeStyles((theme) => ({
 *   title: { color: theme.text, fontSize: 20 },
 * }));
 *
 * function MyComponent() {
 *   const styles = useStyles();
 *   return <Text style={styles.title}>안녕</Text>;
 * }
 * ```
 *
 * 테마가 바뀔 때만 스타일을 다시 만든다(useMemo). 웹의 CSS Modules + CSS 변수를 합친 것과 비슷하다.
 */
export function makeStyles<T extends NamedStyles>(
  // `T & NamedStyles`: StyleSheet.create 와 같은 방식. 'row' 같은 문자열이 string 으로 넓어지지 않게 한다.
  factory: (theme: ThemeColors) => T & NamedStyles
): () => Readonly<T> {
  return function useStyles(): Readonly<T> {
    const theme = useTheme();
    return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
  };
}
