import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { MOODS } from '@/constants/moods';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/styles/color';
import { makeStyles } from '@/styles/make-styles';

type Props = {
  /**
   * 색 칸의 진하기. 캘린더는 날짜 숫자가 잘 보이도록 연하게(0.4) 칠하므로 범례도 같은 값을 쓴다.
   * 연간 보기는 원래 색(1) 그대로.
   */
  alpha?: number;
};

/** 기분 색 범례: ■ 최악 ■ 별로 ■ 보통 ■ 좋음 ■ 최고 */
export function MoodLegend({ alpha = 1 }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.row} accessibilityRole="text" accessibilityLabel="기분 색 범례: 왼쪽부터 최악, 별로, 보통, 좋음, 최고">
      {MOODS.map((m) => (
        <View key={m.level} style={styles.item}>
          {/* 색이 기분마다 달라서 배열 스타일로 덧붙인다 (색 값은 테마에서 온다) */}
          <View style={[styles.swatch, { backgroundColor: withAlpha(theme.mood[m.level], alpha) }]} />
          <AppText variant="caption" tone="secondary">
            {m.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: Spacing.md, paddingVertical: Spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  swatch: { width: 12, height: 12, borderRadius: Radius.sm / 3 },
}));
