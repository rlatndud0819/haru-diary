import { ActivityIndicator, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { useTheme } from '@/hooks/use-theme';
import { CommonStyles } from '@/styles/common';

/** 화면 가운데 로딩 표시 */
export function LoadingView() {
  const theme = useTheme();
  return (
    <View style={CommonStyles.center}>
      <ActivityIndicator color={theme.tint} />
    </View>
  );
}

/** 화면 가운데 안내 문구 (예: "일기를 찾을 수 없어요.") */
export function MessageView({ message }: { message: string }) {
  return (
    <View style={CommonStyles.center}>
      <AppText tone="secondary" style={{ textAlign: 'center' }}>
        {message}
      </AppText>
    </View>
  );
}
