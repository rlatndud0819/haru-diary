import type { ReactNode } from 'react';
import { Pressable, type StyleProp, View, type ViewStyle } from 'react-native';

import { Layout, Radius, Spacing } from '@/constants/theme';
import { makeStyles } from '@/styles/make-styles';

type Props = {
  children: ReactNode;
  /** 넘기면 누를 수 있는 카드가 된다. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** 흰(다크 모드에선 어두운) 바탕 + 얇은 테두리 + 둥근 모서리의 공통 카드 */
export function Card({ children, onPress, style }: Props) {
  const styles = useStyles();

  if (!onPress) {
    return <View style={[styles.card, style]}>{children}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, style, { opacity: pressed ? Layout.pressedOpacity : 1 }]}>
      {children}
    </Pressable>
  );
}

const useStyles = makeStyles((theme) => ({
  card: {
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
}));
