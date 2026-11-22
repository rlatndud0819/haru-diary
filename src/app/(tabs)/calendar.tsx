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
import { Spacing } from '@/constants/theme';
import { getEntriesBetween } from '@/db/diary-repository';
import { CommonStyles } from '@/styles/common';
import type { DiaryEntry, MoodLevel } from '@/types/diary';
import { formatKoreanDate, toDateKey, todayKey } from '@/utils/date';

/**
 * 캘린더 화면 (두 번째 탭).
 * - 보고 있는 달(year, month)의 일기만 DB에서 조회한다.
 * - 날짜를 누르면 그날 일기 목록을 아래에 보여주고, 없으면 "이 날 일기 쓰기" 버튼을 보여준다.
 */
export default function CalendarScreen() {
  const db = useSQLiteContext();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedKey, setSelectedKey] = useState<string>(todayKey());
  const [entries, setEntries] = useState<DiaryEntry[]>([]);

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

        {selectedEntries.length > 0 ? (
          <View style={styles.list}>
            {selectedEntries.map((entry) => (
              <DiaryCard
                key={entry.id}
                entry={entry}
                onPress={() => router.push({ pathname: '/entry/[id]', params: { id: String(entry.id) } })}
              />
            ))}
          </View>
        ) : (
          <View style={styles.list}>
            <AppText variant="bodySmall" tone="secondary">
              이 날의 일기가 없어요.
            </AppText>
            <Button
              label="이 날 일기 쓰기"
              variant="outline"
              onPress={() => router.push({ pathname: '/write', params: { date: selectedKey } })}
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dayTitle: { marginTop: Spacing.lg, marginBottom: Spacing.sm },
  list: { gap: Spacing.sm },
});
