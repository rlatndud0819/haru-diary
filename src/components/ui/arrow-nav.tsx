import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Layout, Spacing } from '@/constants/theme';
import { CommonStyles } from '@/styles/common';

type Props = {
  /** 가운데 표시할 글자 (예: "2026년 11월") */
  label: string;
  onPrev: () => void;
  onNext: () => void;
  /** 스크린 리더용 버튼 이름 */
  prevLabel: string;
  nextLabel: string;
  nextDisabled?: boolean;
};

/**
 * ‹ 가운데 글자 › 형태의 이동 막대.
 * 캘린더의 월 이동, 작성 화면의 날짜 이동에서 같이 쓴다.
 */
export function ArrowNav({ label, onPrev, onNext, prevLabel, nextLabel, nextDisabled }: Props) {
  return (
    <View style={[CommonStyles.rowBetween, styles.container]}>
      <Pressable onPress={onPrev} hitSlop={12} accessibilityRole="button" accessibilityLabel={prevLabel}>
        <AppText tone="tint" style={styles.arrow}>
          ‹
        </AppText>
      </Pressable>
      <AppText variant="heading">{label}</AppText>
      <Pressable
        onPress={onNext}
        disabled={nextDisabled}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={nextLabel}
        accessibilityState={{ disabled: nextDisabled }}>
        <AppText tone="tint" style={[styles.arrow, nextDisabled && { opacity: Layout.disabledOpacity / 2 }]}>
          ›
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: Spacing.sm },
  arrow: { fontSize: 30, lineHeight: 36, fontWeight: '600', paddingHorizontal: Spacing.md },
});
