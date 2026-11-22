import { Pressable } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Layout } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** 굵게 (주요 동작, 예: "저장") */
  emphasized?: boolean;
};

/** 내비게이션 헤더 좌우에 두는 글자 버튼 (예: "취소", "저장") */
export function HeaderTextButton({ label, onPress, disabled, emphasized }: Props) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={10} accessibilityRole="button">
      <AppText
        variant={emphasized ? 'subtitle' : 'body'}
        tone="tint"
        style={{ opacity: disabled ? Layout.disabledOpacity : 1 }}>
        {label}
      </AppText>
    </Pressable>
  );
}
