import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/hooks/use-theme';

/**
 * 하단 탭 레이아웃. (tabs) 폴더 안의 파일 하나가 탭 하나가 된다.
 * - index.tsx    → 일기 목록
 * - calendar.tsx → 캘린더
 * - settings.tsx → 설정
 * 아이콘: sf = iOS SF Symbols 이름, md = Android Material Symbols 이름
 */
export default function TabLayout() {
  const theme = useTheme();

  return (
    <NativeTabs
      backgroundColor={theme.background}
      tintColor={theme.tint}
      labelStyle={{ selected: { color: theme.tint } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>일기</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' }} md="menu_book" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Label>캘린더</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>설정</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
