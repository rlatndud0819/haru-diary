import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import { Radius } from '@/constants/theme';

type Props = {
  uri: string;
  /** full = 가로 꽉 찬 4:3 사진, tile = 작성 화면의 사진 칸, thumb = 목록용 작은 정사각형 */
  size?: 'full' | 'tile' | 'thumb';
};

/** 일기 사진 표시 (상세·작성·목록 공통) */
export function Photo({ uri, size = 'full' }: Props) {
  return <Image source={{ uri }} style={styles[size]} contentFit="cover" />;
}

const styles = StyleSheet.create({
  full: { width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.md },
  tile: { width: 96, height: 96, borderRadius: Radius.sm },
  thumb: { width: 56, height: 56, borderRadius: Radius.sm },
});
