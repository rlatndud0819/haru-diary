import { Pressable, Text, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { MOODS } from '@/constants/moods';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/styles/color';
import { makeStyles } from '@/styles/make-styles';
import type { MoodLevel } from '@/types/diary';

type Props = {
  value: MoodLevel;
  onChange: (mood: MoodLevel) => void;
};

/**
 * 기분 선택 컴포넌트.
 * "제어 컴포넌트(controlled component)" 패턴: 선택값(value)은 부모가 갖고, 바뀌면 onChange로 알려준다.
 */
export function MoodPicker({ value, onChange }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.row}>
      {MOODS.map((mood) => {
        const selected = mood.level === value;
        return (
          <Pressable
            key={mood.level}
            onPress={() => onChange(mood.level)}
            accessibilityRole="button"
            accessibilityLabel={`기분 ${mood.label}`}
            accessibilityState={{ selected }}
            style={[
              styles.item,
              selected && { borderColor: theme.mood[mood.level], backgroundColor: withAlpha(theme.mood[mood.level], 0.2) },
            ]}>
            <Text style={styles.emoji}>{mood.emoji}</Text>
            <AppText variant="caption" tone={selected ? 'primary' : 'secondary'}>
              {mood.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  row: { flexDirection: 'row', gap: Spacing.sm },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  emoji: { fontSize: 26 },
}));
