import { AppText } from '@/components/ui/app-text';
import { Spacing } from '@/constants/theme';

/** 입력칸·카드 위에 붙는 작은 회색 제목 (예: "제목", "기분 통계") */
export function SectionLabel({ children }: { children: string }) {
  return (
    <AppText variant="label" tone="secondary" style={{ marginTop: Spacing.md, marginBottom: Spacing.xs }}>
      {children}
    </AppText>
  );
}
