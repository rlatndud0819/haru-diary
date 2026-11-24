import { Alert, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Chip } from '@/components/ui/chip';
import { EMOTION_GROUPS, EMOTIONS, type EmotionTone } from '@/constants/emotions';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { makeStyles } from '@/styles/make-styles';
import { MAX_EMOTIONS } from '@/types/diary';

type Props = {
  /** 고른 감정 id 목록 */
  value: string[];
  onChange: (next: string[]) => void;
};

/**
 * 감정 단어 고르기 (여러 개, 최대 5개).
 * 좋은 감정 / 힘든 감정 두 묶음으로 나눠 보여 준다.
 * MoodPicker 처럼 "제어 컴포넌트" 패턴: 값은 부모가 갖고, 바뀌면 onChange 로 알려준다.
 */
export function EmotionPicker({ value, onChange }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const toneColor: Record<EmotionTone, string> = { positive: theme.mood[5], negative: theme.mood[1] };

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else if (value.length >= MAX_EMOTIONS) {
      Alert.alert(`감정은 ${MAX_EMOTIONS}개까지 고를 수 있어요`, '가장 크게 느낀 감정 위주로 골라 보세요.');
    } else {
      onChange([...value, id]);
    }
  }

  return (
    <View style={styles.wrap}>
      {EMOTION_GROUPS.map((group) => (
        <View key={group.tone} style={styles.group}>
          <AppText variant="caption" tone="secondary">
            {group.label}
          </AppText>
          <View style={styles.chips}>
            {EMOTIONS.filter((e) => e.tone === group.tone).map((e) => (
              <Chip
                key={e.id}
                label={e.label}
                selected={value.includes(e.id)}
                color={toneColor[e.tone]}
                onPress={() => toggle(e.id)}
                accessibilityLabel={`감정 ${e.label}`}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  wrap: { gap: Spacing.sm },
  group: { gap: Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
}));
