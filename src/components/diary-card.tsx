import { Text, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Photo } from '@/components/ui/photo';
import { getMood } from '@/constants/moods';
import { getPeriod } from '@/constants/periods';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { withAlpha } from '@/styles/color';
import { CommonStyles } from '@/styles/common';
import { makeStyles } from '@/styles/make-styles';
import type { DiaryEntry } from '@/types/diary';
import { formatPeriod, formatShortDate } from '@/utils/date';

type Props = {
  entry: DiaryEntry;
  onPress: () => void;
};

/** 목록에 보이는 일기 카드 한 장 */
export function DiaryCard({ entry, onPress }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const mood = getMood(entry.mood);

  return (
    <Card onPress={onPress} style={[CommonStyles.row, styles.card]}>
      <View style={[styles.moodBadge, { backgroundColor: withAlpha(theme.mood[entry.mood], 0.2) }]}>
        <Text style={styles.emoji}>{mood.emoji}</Text>
      </View>

      <View style={styles.textArea}>
        <View style={[CommonStyles.row, styles.metaRow]}>
          {entry.period !== 'day' ? (
            <View style={styles.periodBadge}>
              <AppText variant="caption" tone="onTint">
                {getPeriod(entry.period).label}
              </AppText>
            </View>
          ) : null}
          <AppText variant="caption" tone="secondary" numberOfLines={1} style={CommonStyles.flex1}>
            {entry.period === 'day' ? formatShortDate(entry.entryDate) : formatPeriod(entry.period, entry.entryDate)}
          </AppText>
        </View>
        <AppText variant="subtitle" numberOfLines={1}>
          {entry.title || '제목 없음'}
        </AppText>
        {entry.content ? (
          <AppText variant="bodySmall" tone="secondary" numberOfLines={2}>
            {entry.content}
          </AppText>
        ) : null}
      </View>

      {entry.photoUris.length > 0 ? (
        <View>
          <Photo uri={entry.photoUris[0]} size="thumb" />
          {entry.photoUris.length > 1 ? (
            <View style={styles.countBadge}>
              <AppText variant="caption" tone="onOverlay">
                +{entry.photoUris.length - 1}
              </AppText>
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const useStyles = makeStyles((theme) => ({
  card: { gap: Spacing.md },
  moodBadge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 26 },
  textArea: { flex: 1, gap: 2 },
  metaRow: { gap: Spacing.xs },
  periodBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: Radius.sm, backgroundColor: theme.tint },
  countBadge: {
    position: 'absolute',
    right: 3,
    bottom: 3,
    paddingHorizontal: 5,
    borderRadius: Radius.sm,
    backgroundColor: theme.overlay,
  },
}));
