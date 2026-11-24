import { Canvas, ColorMatrix, Group, Image, RadialGradient, Rect, type SkFont, type SkImage, Text, vec } from '@shopify/react-native-skia';

import { FilterEffectColors } from '@/constants/filters';
import { withAlpha } from '@/styles/color';
import type { ColorMatrix as Matrix } from '@/utils/color-matrix';

/**
 * 필터를 적용한 사진 그리기 (Skia).
 *
 * Skia = 구글이 만든 2D 그래픽 엔진(크롬·안드로이드가 화면을 그릴 때 쓰는 그것).
 * <Canvas> 안에 <Image>를 그리고, 그 안에 <ColorMatrix>를 넣으면 GPU에서 픽셀 색을 바꿔 준다.
 *
 * 같은 장면(FilteredScene)을 두 군데서 쓴다.
 * 1) 화면 미리보기: <FilteredPhotoCanvas> (화면 크기에 맞춰 축소)
 * 2) 저장: drawAsImage(<FilteredScene .../>) 로 원본 크기 이미지를 만들어 JPEG로 인코딩
 */
type SceneProps = {
  image: SkImage;
  width: number;
  height: number;
  matrix: Matrix;
  /** 0~1 가장자리 어둡게 */
  vignette: number;
  /** 날짜 도장 글자 (없으면 안 그림) */
  stamp?: { text: string; font: SkFont } | null;
};

export function FilteredScene({ image, width, height, matrix, vignette, stamp }: SceneProps) {
  const radius = Math.hypot(width, height) / 2;
  return (
    <Group>
      <Image image={image} x={0} y={0} width={width} height={height} fit="cover">
        <ColorMatrix matrix={matrix} />
      </Image>
      {vignette > 0 ? (
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient
            c={vec(width / 2, height / 2)}
            r={radius}
            colors={['transparent', 'transparent', withAlpha(FilterEffectColors.vignetteEdge, Math.min(1, vignette * 0.85))]}
            positions={[0, 0.55, 1]}
          />
        </Rect>
      ) : null}
      {stamp ? (
        <Text
          text={stamp.text}
          font={stamp.font}
          x={width - stamp.font.measureText(stamp.text).width - width * 0.05}
          y={height - height * 0.05}
          color={FilterEffectColors.dateStamp}
        />
      ) : null}
    </Group>
  );
}

type CanvasProps = Omit<SceneProps, 'width' | 'height'> & { width: number; height: number };

/** 화면에 보이는 미리보기 캔버스 */
export function FilteredPhotoCanvas({ width, height, ...scene }: CanvasProps) {
  return (
    <Canvas style={{ width, height }}>
      <FilteredScene width={width} height={height} {...scene} />
    </Canvas>
  );
}
