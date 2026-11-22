import { StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Photo } from '@/components/ui/photo';
import { getMood } from '@/constants/moods';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/styles/color';
import { CommonStyles } from '@/styles/common';
import type { DiaryEntry } from '@/types/diary';
import { formatShortDate } from '@/utils/date';

type Props = {
  entry: DiaryEntry;
  onPress: () => void;
};

/** 목록에 보이는 일기 카드 한 장 */
export function DiaryCard({ entry, onPress }: Props) {
  const theme = useTheme();
  const mood = getMood(entry.mood);

  return (
    <Card onPress={onPress} style={[CommonStyles.row, styles.card]}>
      <View style={[styles.moodBadge, { backgroundColor: withAlpha(theme.mood[entry.mood], 0.2) }]}>
        <Text style={styles.emoji}>{mood.emoji}</Text>
      </View>

      <View style={styles.textArea}>
        <AppText variant="caption" tone="secondary">
          {formatShortDate(entry.entryDate)}
        </AppText>
        <AppText variant="subtitle" numberOfLines={1}>
          {entry.title || '제목 없음'}
        </AppText>
        {entry.content ? (
          <AppText variant="bodySmall" tone="secondary" numberOfLines={2}>
            {entry.content}
          </AppText>
        ) : null}
      </View>

      {entry.photoUri ? <Photo uri={entry.photoUri} size="thumb" /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  moodBadge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 26 },
  textArea: { flex: 1, gap: 2 },
});
