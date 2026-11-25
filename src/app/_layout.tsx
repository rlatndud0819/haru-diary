import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { LockGate } from '@/components/lock-gate';
import { migrateDbIfNeeded } from '@/db/migrations';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/**
 * 루트 레이아웃: 앱 전체를 감싸는 가장 바깥 틀.
 *
 * 감싸는 순서 (바깥 → 안쪽)
 * 1. ThemeProvider  : 내비게이션 헤더·배경에 라이트/다크 테마 적용
 * 2. SQLiteProvider : DB 파일(diary.db)을 열고 마이그레이션 실행 → 하위 화면에서 useSQLiteContext()로 DB 사용
 * 3. LockGate       : 잠금이 켜져 있으면 인증 전까지 화면을 가림
 * 4. Stack          : 화면 이동(push/back) 관리
 */
export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = useTheme();

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SQLiteProvider databaseName="diary.db" onInit={migrateDbIfNeeded}>
        <LockGate>
          <Stack
            screenOptions={{
              headerTintColor: theme.tint,
              headerStyle: { backgroundColor: theme.background },
              headerTitleStyle: { color: theme.text },
              contentStyle: { backgroundColor: theme.background },
              headerBackTitle: '뒤로',
            }}>
            {/* 하단 탭 묶음 (목록·캘린더·설정) */}
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            {/* 일기 상세 */}
            <Stack.Screen name="entry/[id]" options={{ title: '일기' }} />
            {/* 연간 보기 (Year in Pixels) */}
            <Stack.Screen name="year" options={{ title: '연간 보기' }} />
            {/* 작성·수정: 아래에서 올라오는 모달 */}
            <Stack.Screen name="write" options={{ presentation: 'modal', title: '일기 쓰기' }} />
            {/* 카메라·필터: 화면 전체를 덮는 모달 (헤더 없이 자체 상단 바 사용) */}
            <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal', headerShown: false }} />
            <Stack.Screen name="photo-filter" options={{ presentation: 'fullScreenModal', headerShown: false }} />
          </Stack>
        </LockGate>
        <StatusBar style="auto" />
      </SQLiteProvider>
    </ThemeProvider>
  );
}
