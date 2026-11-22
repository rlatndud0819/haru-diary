import { TextInput, type TextInputProps } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { makeStyles } from '@/styles/make-styles';

/**
 * 앱 공통 입력칸. TextInput 의 모든 속성을 그대로 받는다.
 * multiline 을 주면 여러 줄 입력용(높이 큼, 위쪽 정렬)으로 바뀐다.
 */
export function TextField({ style, multiline, ...rest }: TextInputProps) {
  const theme = useTheme();
  const styles = useStyles();

  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      {...rest}
      style={[styles.input, multiline && styles.multiline, style]}
    />
  );
}

const useStyles = makeStyles((theme) => ({
  input: {
    ...Typography.body,
    color: theme.text,
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
  },
  multiline: { minHeight: 200 },
}));
