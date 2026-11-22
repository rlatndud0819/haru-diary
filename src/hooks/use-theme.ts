import { Colors, type ThemeColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** 현재 기기 설정(라이트/다크)에 맞는 색상 묶음을 돌려준다. */
export function useTheme(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
}
