import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { DiaryCard } from '@/components/diary-card';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/ui/app-text';
import { TextField } from '@/components/ui/text-field';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { getAllEntries, searchEntries } from '@/db/diary-repository';
import { makeStyles } from '@/styles/make-styles';
import type { DiaryEntry } from '@/types/diary';

/**
 * 일기 목록 화면 (첫 번째 탭).
 *
 * 데이터 흐름
 * 1. 화면에 들어올 때마다(useFocusEffect) DB에서 목록을 읽어 entries 상태에 넣는다.
 *    → 작성·수정 화면에서 돌아오면 자동으로 새 목록이 보인다.
 * 2. 검색어(keyword)가 바뀌면 다시 조회한다.
 * 3. entries 상태가 바뀌면 React가 FlatList를 다시 그린다.
 */
export default function DiaryListScreen() {
  const db = useSQLiteContext();
  const styles = useStyles();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [keyword, setKeyword] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true; // 화면을 떠난 뒤 늦게 도착한 결과로 상태를 바꾸지 않기 위한 플래그
      const trimmed = keyword.trim();
      (trimmed ? searchEntries(db, trimmed) : getAllEntries(db)).then((rows) => {
        if (active) setEntries(rows);
      });
      return () => {
        active = false;
      };
    }, [db, keyword])
  );

  const writeButton = (
    <Pressable
      onPress={() => router.push('/write')}
      accessibilityRole="button"
      accessibilityLabel="새 일기 쓰기"
      style={({ pressed }) => [styles.writeButton, { opacity: pressed ? Layout.pressedOpacity : 1 }]}>
      <AppText variant="subtitle" tone="onTint">
        ＋ 쓰기
      </AppText>
    </Pressable>
  );

  return (
    <Screen title="하루 일기" right={writeButton}>
      <View style={styles.searchWrap}>
        <TextField
          value={keyword}
          onChangeText={setKeyword}
          placeholder="제목이나 내용으로 검색"
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => (
          <DiaryCard
            entry={item}
            onPress={() => router.push({ pathname: '/entry/[id]', params: { id: String(item.id) } })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📔</Text>
            <AppText tone="secondary" style={styles.emptyText}>
              {keyword.trim() ? '검색 결과가 없어요.' : '아직 작성한 일기가 없어요.\n오른쪽 위 "쓰기"를 눌러 시작해 보세요.'}
            </AppText>
          </View>
        }
      />
    </Screen>
  );
}

function Separator() {
  return <View style={{ height: Spacing.sm }} />;
}

const useStyles = makeStyles((theme) => ({
  writeButton: {
    backgroundColor: theme.tint,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
  },
  searchWrap: { paddingHorizontal: Layout.screenPadding, paddingBottom: Spacing.sm },
  list: { padding: Layout.screenPadding, paddingBottom: Layout.tabBarInset, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { textAlign: 'center' },
}));
