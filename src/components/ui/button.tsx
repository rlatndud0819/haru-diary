import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { AppText, type TextTone } from '@/components/ui/app-text';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { makeStyles } from '@/styles/make-styles';

export type ButtonVariant = 'filled' | 'outline' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** 바깥 배치용 스타일 (예: CommonStyles.flex1 로 가로 공간 나눠 갖기) */
  style?: StyleProp<ViewStyle>;
};

const labelTone: Record<ButtonVariant, TextTone> = {
  filled: 'onTint',
  outline: 'tint',
  danger: 'danger',
};

/** 앱 공통 버튼. variant 로 모양만 고르면 색은 테마에서 자동으로 정해진다. */
export function Button({ label, onPress, variant = 'filled', disabled, style }: Props) {
  const styles = useStyles();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        style,
        { opacity: disabled ? Layout.disabledOpacity : pressed ? Layout.pressedOpacity : 1 },
      ]}>
      <AppText variant="subtitle" tone={labelTone[variant]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const useStyles = makeStyles((theme) => ({
  base: {
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  filled: { backgroundColor: theme.tint, borderColor: theme.tint },
  outline: { backgroundColor: 'transparent', borderColor: theme.tint },
  danger: { backgroundColor: 'transparent', borderColor: theme.danger },
}));
