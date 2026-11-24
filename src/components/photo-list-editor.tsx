import { Pressable, ScrollView, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Photo } from '@/components/ui/photo';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { CommonStyles } from '@/styles/common';
import { makeStyles } from '@/styles/make-styles';

type Props = {
  uris: string[];
  max: number;
  onPickFromAlbum: () => void;
  onOpenCamera: () => void;
  /** 사진을 누르면 필터 화면으로 */
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
};

/**
 * 작성 화면의 사진 칸.
 * 가로로 스크롤되는 사진 목록 + [앨범] [카메라] 버튼.
 * 사진을 누르면 필터 편집, 오른쪽 위 ✕ 를 누르면 목록에서 뺀다.
 */
export function PhotoListEditor({ uris, max, onPickFromAlbum, onOpenCamera, onEdit, onRemove }: Props) {
  const styles = useStyles();
  const full = uris.length >= max;

  return (
    <View style={styles.wrap}>
      {uris.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {uris.map((uri, index) => (
            <View key={`${uri}-${index}`}>
              <Pressable
                onPress={() => onEdit(index)}
                accessibilityRole="button"
                accessibilityLabel={`사진 ${index + 1} 필터 편집`}
                style={({ pressed }) => ({ opacity: pressed ? Layout.pressedOpacity : 1 })}>
                <Photo uri={uri} size="tile" />
              </Pressable>
              <Pressable
                onPress={() => onRemove(index)}
                accessibilityRole="button"
                accessibilityLabel={`사진 ${index + 1} 빼기`}
                hitSlop={8}
                style={styles.removeButton}>
                <AppText variant="label" tone="onOverlay">
                  ✕
                </AppText>
              </Pressable>
              {index === 0 ? (
                <View style={styles.coverBadge}>
                  <AppText variant="caption" tone="onOverlay">
                    대표
                  </AppText>
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
      ) : null}

      <View style={[CommonStyles.row, styles.actions]}>
        <Button label="＋ 앨범" variant="outline" onPress={onPickFromAlbum} disabled={full} style={CommonStyles.flex1} />
        <Button label="📷 카메라" variant="outline" onPress={onOpenCamera} disabled={full} style={CommonStyles.flex1} />
      </View>
      <AppText variant="caption" tone="secondary">
        {uris.length}/{max}장 · 사진을 누르면 필터를 적용할 수 있어요.
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  wrap: { gap: Spacing.sm },
  strip: { gap: Spacing.sm, paddingTop: Spacing.xs },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.overlay,
  },
  coverBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: theme.overlay,
  },
  actions: { gap: Spacing.sm },
}));
