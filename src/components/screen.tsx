import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Layout, Spacing } from '@/constants/theme';
import { CommonStyles } from '@/styles/common';
import { makeStyles } from '@/styles/make-styles';

type Props = {
  title: string;
  /** 제목 오른쪽에 둘 요소 (예: 버튼) */
  right?: ReactNode;
  children: ReactNode;
};

/**
 * 탭 화면 공통 틀.
 * 네이티브 탭에는 헤더가 없어서, 노치 영역을 피하는 SafeAreaView + 큰 제목을 직접 그린다.
 * (JSP의 공통 레이아웃 include 와 비슷한 역할)
 */
export function Screen({ title, right, children }: Props) {
  const styles = useStyles();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[CommonStyles.rowBetween, styles.header]}>
        <AppText variant="largeTitle">{title}</AppText>
        {right}
      </View>
      <View style={CommonStyles.flex1}>{children}</View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((theme) => ({
  safe: { flex: 1, backgroundColor: theme.background },
  header: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
}));
