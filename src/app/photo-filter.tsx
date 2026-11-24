import { drawAsImage, ImageFormat, matchFont, useImage } from '@shopify/react-native-skia';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Switch, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilteredPhotoCanvas, FilteredScene } from '@/components/filtered-photo';
import { AppText } from '@/components/ui/app-text';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Slider } from '@/components/ui/slider';
import {
  ADJUSTMENT_SLIDERS,
  adjustmentMatrix,
  type Adjustments,
  DEFAULT_ADJUSTMENTS,
  FILTERS,
  type PhotoFilter,
} from '@/constants/filters';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deliverPhoto } from '@/services/photo-inbox';
import { prepareForEditing, writeEditedPhoto } from '@/services/photo-storage';
import { CommonStyles } from '@/styles/common';
import { makeStyles } from '@/styles/make-styles';
import { concat, IDENTITY, lerp } from '@/utils/color-matrix';

type Tool = 'filter' | 'adjust' | 'effect';
const TOOL_OPTIONS: { value: Tool; label: string }[] = [
  { value: 'filter', label: '필터' },
  { value: 'adjust', label: '조정' },
  { value: 'effect', label: '효과' },
];

const THUMB_SIZE = 64;
const STAMP_FONT_FAMILY = Platform.select({ ios: 'Courier', default: 'monospace' });

/** 필름 카메라 날짜 도장 글자. 예: '26 11 24 */
function stampText(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `'${pad(date.getFullYear() % 100)} ${pad(date.getMonth() + 1)} ${pad(date.getDate())}`;
}

/**
 * 사진 필터 편집 화면 (전체 화면 모달).
 *
 * - /photo-filter?uri=...                 → 카메라에서 막 찍은 사진 (결과를 새 사진으로 추가)
 * - /photo-filter?uri=...&replaceIndex=2  → 작성 화면의 3번째 사진 편집 (결과로 교체)
 *
 * 흐름
 * 1. prepareForEditing(): 회전 바로잡기 + 크기 줄이기
 * 2. useImage(): Skia가 그릴 수 있는 이미지로 읽기
 * 3. 필터/조정/효과 값을 바꿀 때마다 행렬을 다시 계산 → 미리보기가 GPU로 즉시 다시 그려짐
 * 4. [적용]: 같은 장면을 원본 크기로 그려서(drawAsImage) JPEG로 저장 → photo-inbox로 작성 화면에 전달
 */
export default function PhotoFilterScreen() {
  const params = useLocalSearchParams<{ uri: string; replaceIndex?: string }>();
  const replaceIndex = params.replaceIndex !== undefined ? Number(params.replaceIndex) : undefined;

  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();

  const [workingUri, setWorkingUri] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('filter');
  const [filter, setFilter] = useState<PhotoFilter>(FILTERS[0]);
  const [intensity, setIntensity] = useState(1);
  const [adjust, setAdjust] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);
  const [extraVignette, setExtraVignette] = useState(0);
  const [dateStamp, setDateStamp] = useState(false);
  /** 미리보기를 누르고 있는 동안 원본을 보여준다 (전/후 비교) */
  const [showOriginal, setShowOriginal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    prepareForEditing(params.uri)
      .then(setWorkingUri)
      .catch((e) => {
        console.error(e);
        Alert.alert('사진을 열 수 없어요', '다른 사진으로 다시 시도해 주세요.');
        router.back();
      });
  }, [params.uri]);

  const image = useImage(workingUri);

  // 최종 행렬 = (필터를 강도만큼 섞은 것) → (밝기·대비·채도·색온도 조정)
  const matrix = useMemo(
    () => concat(lerp(IDENTITY, filter.matrix, intensity), adjustmentMatrix(adjust)),
    [filter, intensity, adjust]
  );
  const vignette = Math.min(1, (filter.vignette ?? 0) * intensity + extraVignette);

  // 미리보기 크기: 화면 너비에 맞추되, 세로가 너무 길면 높이에 맞춘다 (사진 비율 유지)
  const maxPreviewHeight = window.height * 0.5;
  const aspect = image ? image.height() / image.width() : 1;
  const previewWidth = Math.min(window.width, maxPreviewHeight / aspect);
  const previewHeight = previewWidth * aspect;

  const previewFont = useMemo(
    () => matchFont({ fontFamily: STAMP_FONT_FAMILY, fontSize: Math.round(previewWidth * 0.05), fontWeight: 'bold' }),
    [previewWidth]
  );

  async function handleApply() {
    if (!image || saving) return;
    setSaving(true);
    try {
      const width = image.width();
      const height = image.height();
      const exportFont = matchFont({
        fontFamily: STAMP_FONT_FAMILY,
        fontSize: Math.round(width * 0.05),
        fontWeight: 'bold',
      });
      // 화면 미리보기와 같은 장면을 원본 해상도로 화면 밖에서 그린다.
      const result = await drawAsImage(
        <FilteredScene
          image={image}
          width={width}
          height={height}
          matrix={matrix}
          vignette={vignette}
          stamp={dateStamp ? { text: stampText(), font: exportFont } : null}
        />,
        { width, height }
      );
      if (!result) throw new Error('이미지 생성 실패');
      const uri = await writeEditedPhoto(result.encodeToBytes(ImageFormat.JPEG, 90));
      deliverPhoto({ uri, replaceIndex });
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('저장 실패', '필터를 적용하지 못했어요. 다시 시도해 주세요.');
      setSaving(false);
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + Spacing.sm }]}>
      {/* 상단 바 */}
      <View style={[CommonStyles.rowBetween, styles.topBar]}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <AppText variant="subtitle" tone="onOverlay">
            취소
          </AppText>
        </Pressable>
        <AppText variant="subtitle" tone="onOverlay">
          {filter.name}
        </AppText>
        <Pressable onPress={handleApply} disabled={!image || saving} hitSlop={12} accessibilityRole="button">
          <AppText variant="subtitle" tone="cameraAccent">
            {saving ? '저장 중…' : '적용'}
          </AppText>
        </Pressable>
      </View>

      {/* 미리보기 (누르고 있으면 원본) */}
      <View style={styles.previewArea}>
        {image ? (
          <Pressable
            onPressIn={() => setShowOriginal(true)}
            onPressOut={() => setShowOriginal(false)}
            accessibilityLabel="누르고 있으면 원본 보기">
            <FilteredPhotoCanvas
              image={image}
              width={previewWidth}
              height={previewHeight}
              matrix={showOriginal ? IDENTITY : matrix}
              vignette={showOriginal ? 0 : vignette}
              stamp={dateStamp && !showOriginal ? { text: stampText(), font: previewFont } : null}
            />
            {showOriginal ? (
              <View style={styles.originalBadge}>
                <AppText variant="caption" tone="onOverlay">
                  원본
                </AppText>
              </View>
            ) : null}
          </Pressable>
        ) : (
          <ActivityIndicator color={theme.onOverlay} />
        )}
      </View>
      <AppText variant="caption" tone="onOverlay" style={styles.hint}>
        사진을 누르고 있으면 원본과 비교할 수 있어요
      </AppText>

      {/* 도구 패널 */}
      <View style={styles.panel}>
        {tool === 'filter' ? (
          <>
            {filter.id !== 'original' ? (
              <Slider
                label="강도"
                value={intensity}
                min={0}
                max={1}
                onChange={setIntensity}
                format={(v) => `${Math.round(v * 100)}%`}
                onDark
              />
            ) : (
              <View style={styles.sliderPlaceholder} />
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterStrip}>
              {FILTERS.map((f) => {
                const selected = f.id === filter.id;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => {
                      setFilter(f);
                      setIntensity(1);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${f.name} 필터`}
                    accessibilityState={{ selected }}
                    style={styles.filterItem}>
                    <View style={[styles.thumbFrame, selected && styles.thumbFrameSelected]}>
                      {image ? (
                        <FilteredPhotoCanvas
                          image={image}
                          width={THUMB_SIZE}
                          height={THUMB_SIZE}
                          matrix={f.matrix}
                          vignette={f.vignette ?? 0}
                        />
                      ) : null}
                    </View>
                    <AppText variant="caption" tone={selected ? 'cameraAccent' : 'onOverlay'}>
                      {f.name}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        {tool === 'adjust'
          ? ADJUSTMENT_SLIDERS.map((s) => (
              <Slider
                key={s.key}
                label={s.label}
                value={adjust[s.key]}
                min={s.min}
                max={s.max}
                onChange={(v) => setAdjust((prev) => ({ ...prev, [s.key]: v }))}
                onDark
              />
            ))
          : null}

        {tool === 'effect' ? (
          <>
            <Slider
              label="비네팅 (가장자리 어둡게)"
              value={extraVignette}
              min={0}
              max={1}
              onChange={setExtraVignette}
              format={(v) => `${Math.round(v * 100)}%`}
              onDark
            />
            <View style={[CommonStyles.rowBetween, styles.switchRow]}>
              <View style={CommonStyles.flex1}>
                <AppText variant="subtitle" tone="onOverlay">
                  날짜 도장
                </AppText>
                <AppText variant="caption" tone="onOverlay">
                  필름 카메라처럼 오른쪽 아래에 {stampText()} 를 찍어요
                </AppText>
              </View>
              <Switch value={dateStamp} onValueChange={setDateStamp} trackColor={{ true: theme.cameraAccent }} />
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.toolTabs}>
        <SegmentedControl options={TOOL_OPTIONS} value={tool} onChange={setTool} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  screen: { flex: 1, backgroundColor: theme.cameraBackground },
  topBar: { paddingHorizontal: Layout.screenPadding, paddingVertical: Spacing.sm },
  previewArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  originalBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: theme.overlay,
  },
  hint: { textAlign: 'center', fontWeight: '400', marginVertical: Spacing.xs },
  panel: { minHeight: 150, paddingHorizontal: Layout.screenPadding, gap: Spacing.sm, justifyContent: 'center' },
  sliderPlaceholder: { height: 46 },
  filterStrip: { gap: Spacing.sm },
  filterItem: { alignItems: 'center', gap: Spacing.xs },
  thumbFrame: {
    width: THUMB_SIZE + 4,
    height: THUMB_SIZE + 4,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbFrameSelected: { borderColor: theme.cameraAccent },
  switchRow: { gap: Spacing.md },
  toolTabs: { paddingHorizontal: Layout.screenPadding, paddingTop: Spacing.sm },
}));
