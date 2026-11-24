import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { SectionLabel } from '@/components/ui/section-label';
import { getEmotion } from '@/constants/emotions';
import { MOODS } from '@/constants/moods';
import { Spacing } from '@/constants/theme';
import { getEmotionCounts, getMoodStats, getTagMoodImpact, type TagMoodImpact } from '@/db/diary-repository';
import { isLockEnabled, setLockEnabled } from '@/db/settings-repository';
import { useTheme } from '@/hooks/use-theme';
import { authenticate, checkBiometricAvailable } from '@/services/biometric';
import { CommonStyles } from '@/styles/common';
import { makeStyles } from '@/styles/make-styles';
import type { MoodLevel } from '@/types/diary';

type MoodStats = { total: number; byMood: Record<MoodLevel, number> };

/**
 * 설정 화면 (세 번째 탭).
 * - 앱 잠금 켜기/끄기 (켜거나 끌 때 한 번 인증해서 본인 확인)
 * - 기분 통계, 자주 느낀 감정, 기분에 영향을 준 이유 태그
 */
export default function SettingsScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = useStyles();
  const [lockOn, setLockOn] = useState(false);
  const [stats, setStats] = useState<MoodStats>({ total: 0, byMood: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const [emotionCounts, setEmotionCounts] = useState<{ emotion: string; count: number }[]>([]);
  const [impacts, setImpacts] = useState<TagMoodImpact[]>([]);

  useFocusEffect(
    useCallback(() => {
      isLockEnabled(db).then(setLockOn);
      getMoodStats(db).then(setStats);
      getEmotionCounts(db).then(setEmotionCounts);
      getTagMoodImpact(db).then(setImpacts);
    }, [db])
  );

  async function handleToggleLock(next: boolean) {
    if (next) {
      const status = await checkBiometricAvailable();
      if (!status.available) {
        Alert.alert('잠금을 켤 수 없어요', status.reason);
        return;
      }
    }
    const ok = await authenticate(next ? '앱 잠금을 켜려면 인증해 주세요' : '앱 잠금을 끄려면 인증해 주세요');
    if (!ok) return;
    await setLockEnabled(db, next);
    setLockOn(next);
  }

  const maxCount = Math.max(1, ...Object.values(stats.byMood));

  return (
    <Screen title="설정">
      <ScrollView contentContainerStyle={CommonStyles.tabScrollContent}>
        <SectionLabel>보안</SectionLabel>
        <Card style={[CommonStyles.row, styles.lockRow]}>
          <View style={CommonStyles.flex1}>
            <AppText variant="subtitle">앱 잠금</AppText>
            <AppText variant="caption" tone="secondary" style={styles.lockDesc}>
              앱을 열 때 Face ID·지문 또는 기기 암호로 인증합니다.
            </AppText>
          </View>
          <Switch value={lockOn} onValueChange={handleToggleLock} trackColor={{ true: theme.tint }} />
        </Card>

        <SectionLabel>기분 통계</SectionLabel>
        <Card style={styles.statsCard}>
          <AppText variant="subtitle">지금까지 쓴 일기 {stats.total}개</AppText>
          {[...MOODS].reverse().map((mood) => {
            const count = stats.byMood[mood.level];
            return (
              <View key={mood.level} style={[CommonStyles.row, styles.statRow]}>
                <Text style={styles.statEmoji}>{mood.emoji}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[styles.barFill, { width: `${(count / maxCount) * 100}%`, backgroundColor: theme.mood[mood.level] }]}
                  />
                </View>
                <AppText variant="caption" tone="secondary" style={styles.statCount}>
                  {count}
                </AppText>
              </View>
            );
          })}
        </Card>

        <SectionLabel>자주 느낀 감정</SectionLabel>
        <Card style={styles.statsCard}>
          {emotionCounts.length === 0 ? (
            <AppText variant="bodySmall" tone="secondary">
              일기를 쓸 때 감정 단어를 고르면 여기에 모여요.
            </AppText>
          ) : (
            <View style={styles.chips}>
              {emotionCounts.slice(0, 8).map(({ emotion, count }) => {
                const e = getEmotion(emotion);
                if (!e) return null;
                return (
                  <Chip
                    key={emotion}
                    label={e.label}
                    count={count}
                    selected
                    color={e.tone === 'positive' ? theme.mood[5] : theme.mood[1]}
                  />
                );
              })}
            </View>
          )}
        </Card>

        <SectionLabel>기분에 영향을 준 것</SectionLabel>
        <Card style={styles.statsCard}>
          {impacts.length === 0 ? (
            <AppText variant="bodySmall" tone="secondary">
              같은 태그를 2번 이상 붙이면, 그 태그가 있는 날의 기분이 평소와 어떻게 달랐는지 보여 드려요.
            </AppText>
          ) : (
            <>
              <AppText variant="caption" tone="secondary" style={styles.impactNote}>
                하루 일기 기준, 태그가 있는 날의 평균 기분과 전체 평균의 차이
              </AppText>
              {impacts.slice(0, 6).map((it) => (
                <View key={it.tagId} style={[CommonStyles.rowBetween, styles.impactRow]}>
                  <AppText variant="subtitle">#{it.name}</AppText>
                  <AppText variant="bodySmall" tone="secondary">
                    {it.count}번 · 평균 {it.avgMood.toFixed(1)}{' '}
                    <AppText variant="bodySmall" tone={it.diff >= 0 ? 'tint' : 'danger'} style={styles.diff}>
                      {it.diff >= 0 ? '+' : ''}
                      {it.diff.toFixed(1)}
                    </AppText>
                  </AppText>
                </View>
              ))}
            </>
          )}
        </Card>

        <AppText variant="caption" tone="secondary" style={styles.version}>
          하루 일기 v{Constants.expoConfig?.version ?? '1.0.0'} · 모든 일기는 이 기기에만 저장됩니다.
        </AppText>
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((theme) => ({
  lockRow: { gap: Spacing.md },
  lockDesc: { marginTop: 2, fontWeight: '400', lineHeight: 18 },
  statsCard: { gap: Spacing.sm },
  statRow: { gap: Spacing.sm },
  statEmoji: { fontSize: 20, width: 28 },
  barTrack: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: theme.border },
  barFill: { height: '100%', borderRadius: 5 },
  statCount: { width: 28, textAlign: 'right' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  impactNote: { fontWeight: '400' },
  impactRow: { paddingVertical: 2 },
  diff: { fontWeight: '700' },
  version: { textAlign: 'center', marginTop: Spacing.xl, fontWeight: '400' },
}));
