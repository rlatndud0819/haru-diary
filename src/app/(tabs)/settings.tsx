import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { SectionLabel } from '@/components/ui/section-label';
import { getEmotion } from '@/constants/emotions';
import { MOODS } from '@/constants/moods';
import { Spacing } from '@/constants/theme';
import { getEmotionCounts, getMoodStats, getTagMoodImpact, type TagMoodImpact } from '@/db/diary-repository';
import { getLastBackupAt, isLockEnabled, setLastBackupAt, setLockEnabled } from '@/db/settings-repository';
import { useTheme } from '@/hooks/use-theme';
import { BackupError, createBackup, pickBackup, restoreBackup, shareBackup } from '@/services/backup';
import { authenticate, checkBiometricAvailable } from '@/services/biometric';
import { CommonStyles } from '@/styles/common';
import { makeStyles } from '@/styles/make-styles';
import type { MoodLevel } from '@/types/diary';
import { formatKoreanDate, toDateKey } from '@/utils/date';

/** ISO 시각 → '2026년 11월 28일 (토)' */
function formatIsoDate(iso: string): string {
  return formatKoreanDate(toDateKey(new Date(iso)));
}

/** 사용자에게 보여 줄 에러 문장. 우리가 만든 BackupError는 문장 그대로, 그 밖의 에러는 일반 안내로 */
function backupErrorMessage(e: unknown): string {
  if (e instanceof BackupError) return e.message;
  console.warn('백업/복원 실패', e);
  return '잠시 뒤 다시 시도해 주세요. 저장 공간이 부족하면 실패할 수 있어요.';
}

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
  const [lastBackupAt, setLastBackup] = useState<string | null>(null);
  /** 백업·복원 중에는 버튼을 막는다 (두 번 눌러 겹치지 않게) */
  const [busy, setBusy] = useState<'backup' | 'restore' | null>(null);

  const load = useCallback(() => {
    isLockEnabled(db).then(setLockOn);
    getMoodStats(db).then(setStats);
    getEmotionCounts(db).then(setEmotionCounts);
    getTagMoodImpact(db).then(setImpacts);
    getLastBackupAt(db).then(setLastBackup);
  }, [db]);

  useFocusEffect(load);

  async function handleBackup() {
    setBusy('backup');
    try {
      const { file, summary, missingPhotos } = await createBackup(db);
      await shareBackup(file);
      await setLastBackupAt(db, summary.createdAt);
      setLastBackup(summary.createdAt);
      if (missingPhotos > 0) {
        Alert.alert('일부 사진은 빠졌어요', `기기에서 찾을 수 없는 사진 ${missingPhotos}장은 백업에 넣지 못했어요.`);
      }
    } catch (e) {
      Alert.alert('백업하지 못했어요', backupErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleRestore() {
    setBusy('restore');
    try {
      const picked = await pickBackup();
      if (!picked) return;
      const { summary } = picked;
      // 확인 창은 버튼을 누를 때까지 기다리지 않으므로, 실제 복원은 '바꾸기' 버튼 콜백에서 한다.
      Alert.alert(
        '이 백업으로 바꿀까요?',
        `${formatIsoDate(summary.createdAt)}에 만든 백업\n일기 ${summary.entries}개 · 사진 ${summary.photos}장\n\n` +
          `지금 이 기기에 있는 일기 ${stats.total}개는 지워지고 백업 내용으로 바뀌어요. 되돌릴 수 없으니, 필요하면 먼저 지금 일기를 백업해 두세요.`,
        [
          { text: '취소', style: 'cancel' },
          { text: '바꾸기', style: 'destructive', onPress: () => runRestore(picked) },
        ]
      );
    } catch (e) {
      Alert.alert('백업 파일을 열지 못했어요', backupErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function runRestore(picked: NonNullable<Awaited<ReturnType<typeof pickBackup>>>) {
    setBusy('restore');
    try {
      const summary = await restoreBackup(db, picked);
      load();
      Alert.alert('복원했어요', `일기 ${summary.entries}개와 사진 ${summary.photos}장을 되살렸어요.`);
    } catch (e) {
      Alert.alert('복원하지 못했어요', `${backupErrorMessage(e)}\n지금 있던 일기는 그대로예요.`);
    } finally {
      setBusy(null);
    }
  }

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

        <SectionLabel>백업</SectionLabel>
        <Card style={styles.backupCard}>
          <AppText variant="subtitle">일기 백업·복원</AppText>
          <AppText variant="caption" tone="secondary" style={styles.lockDesc}>
            일기와 사진을 파일 하나로 만들어 iCloud Drive·파일 앱·카카오톡 등에 저장해요. 폰을 바꾸면 그 파일로 되살릴 수 있어요.
          </AppText>
          <AppText variant="caption" tone="secondary" style={styles.lockDesc}>
            {lastBackupAt ? `마지막 백업: ${formatIsoDate(lastBackupAt)}` : '아직 백업한 적이 없어요.'}
          </AppText>
          <View style={[CommonStyles.row, styles.backupButtons]}>
            <Button
              label={busy === 'backup' ? '만드는 중…' : '백업하기'}
              onPress={handleBackup}
              disabled={busy !== null}
              style={CommonStyles.flex1}
            />
            <Button
              label={busy === 'restore' ? '복원 중…' : '복원하기'}
              variant="outline"
              onPress={handleRestore}
              disabled={busy !== null}
              style={CommonStyles.flex1}
            />
          </View>
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
  backupCard: { gap: Spacing.xs },
  backupButtons: { gap: Spacing.sm, marginTop: Spacing.sm },
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
