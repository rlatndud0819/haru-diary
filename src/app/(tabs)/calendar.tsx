import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CalendarGrid } from '@/components/calendar-grid';
import { DiaryCard } from '@/components/diary-card';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/ui/app-text';
import { ArrowNav } from '@/components/ui/arrow-nav';
import { Button } from '@/components/ui/button';
import { SectionLabel } from '@/components/ui/section-label';
import { Spacing } from '@/constants/theme';
import { getEntriesBetween, getEntriesForPeriod } from '@/db/diary-repository';
import { CommonStyles } from '@/styles/common';
import type { DiaryEntry, MoodLevel } from '@/types/diary';
import { formatKoreanDate, periodStart, toDateKey, todayKey } from '@/utils/date';

/**
 * 캘린더 화면 (두 번째 탭).
 * - 보고 있는 달(year, month)의 일기만 DB에서 조회한다.
 * - 날짜를 누르면 그날 일기 목록을 아래에 보여주고, 없으면 "이 날 일기 쓰기" 버튼을 보여준다.
 * - 그 아래에 고른 날짜가 속한 주·달의 회고(주간/월간 일기)를 보여준다.
 * - 달력의 기분 표시는 하루 일기 기준이다.
 */
export default function CalendarScreen() {
  const db = useSQLiteContext();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedKey, setSelectedKey] = useState<string>(todayKey());
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [weekEntries, setWeekEntries] = useState<DiaryEntry[]>([]);
  const [monthEntries, setMonthEntries] = useState<DiaryEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const start = toDateKey(new Date(year, month, 1));
      const end = toDateKey(new Date(year, month + 1, 0));
      getEntriesBetween(db, start, end).then((rows) => {
        if (active) setEntries(rows);
      });
      return () => {
        active = false;
      };
    }, [db, year, month])
  );

  // 고른 날짜가 속한 주·달의 회고
  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        getEntriesForPeriod(db, 'week', periodStart('week', selectedKey)),
        getEntriesForPeriod(db, 'month', periodStart('month', selectedKey)),
      ]).then(([week, monthRows]) => {
        if (!active) return;
        setWeekEntries(week);
        setMonthEntries(monthRows);
      });
      return () => {
        active = false;
      };
    }, [db, selectedKey])
  );

  // 날짜별 기분: 같은 날 일기가 여러 개면 가장 마지막에 쓴 일기의 기분을 표시
  const moodsByDate: Record<string, MoodLevel> = {};
  for (const e of entries) moodsByDate[e.entryDate] = e.mood;

  const selectedEntries = entries.filter((e) => e.entryDate === selectedKey);

  function moveMonth(diff: number) {
    const next = new Date(year, month + diff, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  }

  return (
    <Screen title="캘린더">
      <ScrollView contentContainerStyle={CommonStyles.tabScrollContent}>
        <ArrowNav
          label={`${year}년 ${month + 1}월`}
          onPrev={() => moveMonth(-1)}
          onNext={() => moveMonth(1)}
          prevLabel="이전 달"
          nextLabel="다음 달"
        />

        <CalendarGrid
          year={year}
          month={month}
          moodsByDate={moodsByDate}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
        />

        <AppText variant="subtitle" style={styles.dayTitle}>
          {formatKoreanDate(selectedKey)}
        </AppText>

        <EntryListOrWrite
          entries={selectedEntries}
          emptyText="이 날의 일기가 없어요."
          writeLabel="이 날 일기 쓰기"
          onWrite={() => router.push({ pathname: '/write', params: { date: selectedKey } })}
        />

        <SectionLabel>이 주의 회고</SectionLabel>
        <EntryListOrWrite
          entries={weekEntries}
          writeLabel="주간 회고 쓰기"
          onWrite={() => router.push({ pathname: '/write', params: { period: 'week', date: selectedKey } })}
        />

        <SectionLabel>이 달의 회고</SectionLabel>
        <EntryListOrWrite
          entries={monthEntries}
          writeLabel="월간 회고 쓰기"
          onWrite={() => router.push({ pathname: '/write', params: { period: 'month', date: selectedKey } })}
        />
      </ScrollView>
    </Screen>
  );
}

/** 일기가 있으면 카드 목록, 없으면 (안내 문구 +) 쓰기 버튼 */
function EntryListOrWrite({
  entries,
  emptyText,
  writeLabel,
  onWrite,
}: {
  entries: DiaryEntry[];
  emptyText?: string;
  writeLabel: string;
  onWrite: () => void;
}) {
  return (
    <View style={styles.list}>
      {entries.length > 0 ? (
        entries.map((entry) => (
          <DiaryCard
            key={entry.id}
            entry={entry}
            onPress={() => router.push({ pathname: '/entry/[id]', params: { id: String(entry.id) } })}
          />
        ))
      ) : (
        <>
          {emptyText ? (
            <AppText variant="bodySmall" tone="secondary">
              {emptyText}
            </AppText>
          ) : null}
          <Button label={writeLabel} variant="outline" onPress={onWrite} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dayTitle: { marginTop: Spacing.lg, marginBottom: Spacing.sm },
  list: { gap: Spacing.sm },
});
