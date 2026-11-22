import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Photo } from '@/components/ui/photo';
import { LoadingView, MessageView } from '@/components/ui/state-view';
import { getMood } from '@/constants/moods';
import { Radius, Spacing } from '@/constants/theme';
import { deleteEntry, getEntryById } from '@/db/diary-repository';
import { useTheme } from '@/hooks/use-theme';
import { deletePhoto } from '@/services/photo-storage';
import { withAlpha } from '@/styles/color';
import { CommonStyles } from '@/styles/common';
import type { DiaryEntry } from '@/types/diary';
import { formatKoreanDate } from '@/utils/date';

/**
 * 일기 상세 화면.
 * 파일명 [id].tsx 의 대괄호는 "동적 경로"라는 뜻. /entry/3 으로 오면 id = '3' 이 된다.
 * (Spring의 @PathVariable 과 비슷)
 */
export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  // undefined = 불러오는 중, null = 없음
  const [entry, setEntry] = useState<DiaryEntry | null | undefined>(undefined);

  // 수정 화면에서 돌아왔을 때 바뀐 내용을 다시 읽기 위해 useFocusEffect 사용
  useFocusEffect(
    useCallback(() => {
      getEntryById(db, Number(id)).then(setEntry);
    }, [db, id])
  );

  function confirmDelete() {
    if (!entry) return;
    Alert.alert('일기 삭제', '이 일기를 삭제할까요? 삭제하면 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(db, entry.id);
          deletePhoto(entry.photoUri);
          router.back();
        },
      },
    ]);
  }

  if (entry === undefined) return <LoadingView />;
  if (entry === null) return <MessageView message="일기를 찾을 수 없어요." />;

  const mood = getMood(entry.mood);

  return (
    <>
      <Stack.Screen options={{ title: formatKoreanDate(entry.entryDate) }} />
      <ScrollView contentContainerStyle={[CommonStyles.stackScrollContent, styles.content]}>
        <View style={[CommonStyles.row, styles.moodRow, { backgroundColor: withAlpha(theme.mood[entry.mood], 0.15) }]}>
          <Text style={styles.moodEmoji}>{mood.emoji}</Text>
          <AppText variant="subtitle">오늘의 기분: {mood.label}</AppText>
        </View>

        <AppText variant="title">{entry.title || '제목 없음'}</AppText>

        {entry.photoUri ? <Photo uri={entry.photoUri} /> : null}

        <AppText style={styles.body} selectable>
          {entry.content || '내용이 없어요.'}
        </AppText>

        <View style={styles.actions}>
          <Button
            label="수정"
            variant="outline"
            onPress={() => router.push({ pathname: '/write', params: { id: String(entry.id) } })}
          />
          <Button label="삭제" variant="danger" onPress={confirmDelete} />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.md },
  moodRow: { gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md },
  moodEmoji: { fontSize: 32 },
  body: { lineHeight: 26 },
  actions: { gap: Spacing.sm, marginTop: Spacing.lg },
});
