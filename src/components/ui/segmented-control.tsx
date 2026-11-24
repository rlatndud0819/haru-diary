import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { makeStyles } from '@/styles/make-styles';

export type SegmentOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * 여러 개 중 하나를 고르는 버튼 묶음 (iOS의 Segmented Control 모양).
 * 예: [하루 | 주간 | 월간], [전체 | 하루 | 주간 | 월간]
 *
 * <T extends string> 은 Java의 제네릭 <T extends ...> 와 같다.
 * value로 'day' | 'week' 같은 문자열 유니온을 넘기면 onChange도 그 타입으로 자동으로 맞춰진다.
 */
export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const styles = useStyles();
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.item,
              selected && styles.itemSelected,
              { opacity: pressed ? Layout.pressedOpacity : 1 },
            ]}>
            <AppText variant="label" tone={selected ? 'onTint' : 'secondary'}>
              {opt.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  track: {
    flexDirection: 'row',
    padding: 3,
    gap: 3,
    borderRadius: Radius.md,
    // 회색(border) 배경 위의 보조 글자는 라이트 모드에서 대비가 4.15로 부족해서, 카드색 + 테두리로 했다 (5.3:1)
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md - 3,
  },
  itemSelected: { backgroundColor: theme.tint },
}));
