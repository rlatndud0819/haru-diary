import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { getEmotion } from '@/constants/emotions';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { makeStyles } from '@/styles/make-styles';
import type { DiaryEntry } from '@/types/diary';
import { averageMood, countEmotions, countTags } from '@/utils/summary';

/**
 * 주간·월간 회고 상세에 붙는 요약 카드.
 * 그 기간의 하루 일기들을 모아 평균 기분, 많이 느낀 감정, 자주 나온 이유 태그를 보여 준다.
 */
export function PeriodSummary({ entries }: { entries: DiaryEntry[] }) {
  const theme = useTheme();
  const styles = useStyles();
  if (entries.length === 0) return null;

  const avg = averageMood(entries);
  const emotions = countEmotions(entries).slice(0, 5);
  const tags = countTags(entries).slice(0, 5);

  return (
    <Card style={styles.card}>
      <AppText variant="subtitle">
        이 기간 요약 · 하루 일기 {entries.length}개{avg !== null ? ` · 평균 기분 ${avg.toFixed(1)}` : ''}
      </AppText>
      {emotions.length > 0 ? (
        <View style={styles.block}>
          <AppText variant="caption" tone="secondary">
            많이 느낀 감정
          </AppText>
          <View style={styles.chips}>
            {emotions.map(({ item, count }) => {
              const e = getEmotion(item);
              if (!e) return null;
              return (
                <Chip
                  key={item}
                  label={e.label}
                  count={count}
                  selected
                  color={e.tone === 'positive' ? theme.mood[5] : theme.mood[1]}
                />
              );
            })}
          </View>
        </View>
      ) : null}
      {tags.length > 0 ? (
        <View style={styles.block}>
          <AppText variant="caption" tone="secondary">
            자주 나온 이유
          </AppText>
          <View style={styles.chips}>
            {tags.map(({ item, count }) => (
              <Chip key={item.id} label={`#${item.name}`} count={count} />
            ))}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const useStyles = makeStyles(() => ({
  card: { gap: Spacing.sm },
  block: { gap: Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
}));
