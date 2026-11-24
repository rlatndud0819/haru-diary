import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/styles/color';
import { makeStyles } from '@/styles/make-styles';

type Props = {
  label: string;
  /** 선택됨 (색이 칠해짐) */
  selected?: boolean;
  /** 선택됐을 때 쓰는 강조색. 없으면 theme.tint */
  color?: string;
  /** 누르면 실행. 없으면 보여주기만 하는 칩 */
  onPress?: () => void;
  onLongPress?: () => void;
  /** 오른쪽에 붙는 작은 숫자 (예: 횟수) */
  count?: number;
  /** 작게 (목록 카드용) */
  small?: boolean;
  accessibilityLabel?: string;
};

/**
 * 동그란 알약 모양 꼬리표. 감정 단어·이유 태그에 쓴다.
 * (웹의 "태그 배지", "필터 칩"과 같은 것)
 */
export function Chip({ label, selected, color, onPress, onLongPress, count, small, accessibilityLabel }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const accent = color ?? theme.tint;
  const body = (
    <View
      style={[
        styles.chip,
        small && styles.small,
        selected && { borderColor: accent, backgroundColor: withAlpha(accent, 0.15) },
      ]}>
      <AppText variant="caption" tone={selected ? 'primary' : 'secondary'} style={small ? styles.smallText : undefined}>
        {label}
        {count !== undefined ? `  ${count}` : ''}
      </AppText>
    </View>
  );
  if (!onPress && !onLongPress) return body;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => ({ opacity: pressed ? Layout.pressedOpacity : 1 })}>
      {body}
    </Pressable>
  );
}

const useStyles = makeStyles((theme) => ({
  chip: {
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  small: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderWidth: 1 },
  smallText: { fontSize: 11 },
}));
