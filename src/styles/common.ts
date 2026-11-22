import { StyleSheet } from 'react-native';

import { Layout, Spacing } from '@/constants/theme';

/**
 * 색과 상관없는 공통 레이아웃 스타일. (CSS 유틸리티 클래스 .flex-1, .row 같은 것)
 * 여러 화면에서 반복되던 스타일을 한 곳에 모았다.
 */
export const CommonStyles = StyleSheet.create({
  flex1: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  /** 탭 화면의 스크롤 내용 (좌우 여백 + 탭 바 여유 공간) */
  tabScrollContent: { paddingHorizontal: Layout.screenPadding, paddingBottom: Layout.tabBarInset },
  /** 스택 화면(상세·작성)의 스크롤 내용 */
  stackScrollContent: { padding: Layout.screenPadding, paddingBottom: Spacing.xl * 2 },
});
