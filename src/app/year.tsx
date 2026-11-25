import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { MoodLegend } from '@/components/mood-legend';
import { AppText } from '@/components/ui/app-text';
import { ArrowNav } from '@/components/ui/arrow-nav';
import { Card } from '@/components/ui/card';
import { getMood } from '@/constants/moods';
import { Radius, Spacing } from '@/constants/theme';
import { type DailyMood, getDailyMoods } from '@/db/diary-repository';
import { useTheme } from '@/hooks/use-theme';
import { CommonStyles } from '@/styles/common';
import { withAlpha } from '@/styles/color';
import { makeStyles } from '@/styles/make-styles';
import type { MoodLevel } from '@/types/diary';
import { toDateKey, todayKey } from '@/utils/date';

const MONTHS = Array.from({ length: 12 }, (_, i) => i);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
/** 왼쪽 날짜 번호는 몇 개만 적는다 (31개를 다 적으면 빽빽하다) */
const DAY_LABELS = new Set([1, 5, 10, 15, 20, 25, 30]);

/** 평균(소수) → 가장 가까운 기분 단계 */
function toLevel(avg: number): MoodLevel {
  return Math.min(5, Math.max(1, Math.round(avg))) as MoodLevel;
}

/**
 * 연간 보기 (Year in Pixels).
 * 1년 365일을 "가로 = 월(1~12), 세로 = 일(1~31)" 격자로 놓고, 하루 일기의 기분 색으로 칠한다.
 * - 일기가 없는 지난 날: 회색 칸, 아직 오지 않은 날: 더 옅은 칸, 없는 날짜(2월 30일 등): 빈자리
 * - 색 칸을 누르면 그날 일기 상세로 간다.
 * - 맨 아래 줄은 그 달의 평균 기분 색이다.
 *
 * DB 조회는 날짜·기분만 가볍게 가져온다(getDailyMoods). 목록 화면처럼 사진·태그까지 붙이면 1년치가 무겁다.
 */
export default function YearScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = useStyles();
  const params = useLocalSearchParams<{ year?: string }>();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(() => Number(params.year) || thisYear);
  const [moods, setMoods] = useState<DailyMood[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getDailyMoods(db, `${year}-01-01`, `${year}-12-31`).then((rows) => {
        if (active) setMoods(rows);
      });
      return () => {
        active = false;
      };
    }, [db, year])
  );

  const byDate = new Map(moods.map((m) => [m.entryDate, m]));
  const today = todayKey();

  // 요약: 기록한 날, 평균 기분, 가장 많았던 기분
  const avg = moods.length ? moods.reduce((sum, m) => sum + m.mood, 0) / moods.length : null;
  const counts: Record<MoodLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const m of moods) counts[m.mood] += 1;
  const topLevel = moods.length
    ? (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as unknown as MoodLevel)
    : null;
  const daysInYear = new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;

  // 달마다 평균 기분 (기록이 없으면 null)
  const monthAvg = MONTHS.map((mi) => {
    const prefix = `${year}-${String(mi + 1).padStart(2, '0')}-`;
    const list = moods.filter((m) => m.entryDate.startsWith(prefix));
    return list.length ? list.reduce((s, m) => s + m.mood, 0) / list.length : null;
  });

  return (
    <>
      <Stack.Screen options={{ title: '연간 보기' }} />
      <ScrollView contentContainerStyle={CommonStyles.stackScrollContent}>
        <ArrowNav
          label={`${year}년`}
          onPrev={() => setYear((y) => y - 1)}
          onNext={() => setYear((y) => y + 1)}
          prevLabel="이전 해"
          nextLabel="다음 해"
          nextDisabled={year >= thisYear}
        />

        <Card style={[CommonStyles.rowBetween, styles.summary]}>
          <SummaryItem label="기록한 날" value={`${moods.length}일`} sub={`/ ${daysInYear}일`} />
          <SummaryItem label="평균 기분" value={avg === null ? '-' : getMood(toLevel(avg)).label} sub={avg?.toFixed(1)} />
          <SummaryItem label="가장 많았던" value={topLevel ? getMood(topLevel).label : '-'} sub={topLevel ? `${counts[topLevel]}일` : undefined} />
        </Card>

        <View style={styles.grid}>
          {/* 맨 위: 월 번호 */}
          <View style={styles.row}>
            <View style={styles.dayLabel} />
            {MONTHS.map((mi) => (
              <AppText key={mi} variant="caption" tone="secondary" style={styles.monthLabel}>
                {mi + 1}
              </AppText>
            ))}
          </View>

          {DAYS.map((day) => (
            <View key={day} style={styles.row}>
              <AppText variant="caption" tone="secondary" style={styles.dayLabel}>
                {DAY_LABELS.has(day) ? day : ''}
              </AppText>
              {MONTHS.map((mi) => {
                const date = new Date(year, mi, day);
                // 2월 30일처럼 없는 날은 다음 달로 넘어가므로 빈자리로 둔다
                if (date.getMonth() !== mi) return <View key={mi} style={styles.cell} />;
                const key = toDateKey(date);
                const m = byDate.get(key);
                if (!m) {
                  return <View key={mi} style={[styles.cell, key > today ? styles.future : styles.empty]} />;
                }
                return (
                  <Pressable
                    key={mi}
                    onPress={() => router.push({ pathname: '/entry/[id]', params: { id: String(m.entryId) } })}
                    accessibilityRole="button"
                    accessibilityLabel={`${mi + 1}월 ${day}일, 기분 ${getMood(m.mood).label}`}
                    // 기분 색은 칸마다 달라서 배열 스타일로 덧붙인다 (색 값은 테마에서 온다)
                    style={[styles.cell, { backgroundColor: theme.mood[m.mood] }]}
                  />
                );
              })}
            </View>
          ))}

          {/* 맨 아래: 달별 평균 기분 */}
          <View style={[styles.row, styles.avgRow]}>
            <AppText variant="caption" tone="secondary" style={styles.dayLabel}>
              평균
            </AppText>
            {monthAvg.map((a, mi) => (
              <View
                key={mi}
                accessible
                accessibilityLabel={`${mi + 1}월 평균 기분 ${a === null ? '기록 없음' : getMood(toLevel(a)).label}`}
                style={[styles.cell, styles.avgCell, a === null ? styles.empty : { backgroundColor: theme.mood[toLevel(a)] }]}
              />
            ))}
          </View>
        </View>

        <MoodLegend />
        <AppText variant="caption" tone="secondary" style={styles.note}>
          하루 일기 기준이에요. 같은 날 여러 개를 썼다면 마지막에 쓴 일기의 기분으로 칠해요.
        </AppText>
      </ScrollView>
    </>
  );
}

function SummaryItem({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.summaryItem}>
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
      <AppText variant="heading">{value}</AppText>
      {sub ? (
        <AppText variant="caption" tone="secondary">
          {sub}
        </AppText>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  summary: { marginBottom: Spacing.md },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  grid: { gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  dayLabel: { width: 26, fontSize: 10, textAlign: 'right', paddingRight: Spacing.xs },
  monthLabel: { flex: 1, textAlign: 'center' },
  cell: { flex: 1, height: 13, borderRadius: Radius.sm / 4 },
  empty: { backgroundColor: theme.border },
  future: { backgroundColor: withAlpha(theme.border, 0.4) },
  avgRow: { marginTop: Spacing.sm },
  avgCell: { height: 18 },
  note: { textAlign: 'center', fontWeight: '400', marginTop: Spacing.xs },
}));
