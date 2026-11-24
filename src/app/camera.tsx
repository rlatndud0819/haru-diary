import { CameraView, type CameraType, type FlashMode, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { CommonStyles } from '@/styles/common';
import { makeStyles } from '@/styles/make-styles';

/** 플래시: 끔 → 켬 → 자동 순서로 돌아간다 */
const FLASH_ORDER: FlashMode[] = ['off', 'on', 'auto'];
const FLASH_LABEL: Record<string, string> = { off: '⚡︎ 끔', on: '⚡︎ 켬', auto: '⚡︎ 자동' };

/** 셀프 타이머(초) */
const TIMER_ORDER = [0, 3, 10] as const;
type TimerSec = (typeof TIMER_ORDER)[number];

/**
 * 카메라 화면 (전체 화면 모달).
 *
 * 기능: 앞/뒤 전환, 플래시, 3×3 격자, 셀프 타이머(3초·10초), 줌, 셀카 좌우 반전.
 * 찍으면 필터 화면(/photo-filter)으로 넘어가고, 거기서 [적용]하면 작성 화면에 사진이 추가된다.
 *
 * router.replace 를 쓰는 이유: 카메라 → 필터로 "교체"하면, 필터 화면에서 뒤로 갈 때 카메라를 건너뛰고
 * 바로 작성 화면으로 돌아간다. (push 였다면 카메라가 중간에 남는다)
 */
export default function CameraScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [grid, setGrid] = useState(false);
  const [timer, setTimer] = useState<TimerSec>(0);
  const [zoom, setZoom] = useState(0);
  const [ready, setReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturing, setCapturing] = useState(false);

  // 처음 들어왔을 때 권한이 아직 결정되지 않았으면 바로 물어본다.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  async function capture() {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      router.replace({ pathname: '/photo-filter', params: { uri: photo.uri } });
    } catch (e) {
      console.error(e);
      Alert.alert('촬영 실패', '사진을 찍지 못했어요. 다시 시도해 주세요.');
      setCapturing(false);
    }
  }

  async function handleShutter() {
    if (!ready || capturing) return;
    setCapturing(true);
    if (timer === 0) {
      await capture();
      return;
    }
    // 타이머: 1초마다 숫자를 줄이고 0이 되면 찍는다
    for (let s = timer; s > 0; s--) {
      setCountdown(s);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    setCountdown(null);
    await capture();
  }

  function cycleFlash() {
    setFlash((f) => FLASH_ORDER[(FLASH_ORDER.indexOf(f) + 1) % FLASH_ORDER.length]);
  }

  function cycleTimer() {
    setTimer((t) => TIMER_ORDER[(TIMER_ORDER.indexOf(t) + 1) % TIMER_ORDER.length]);
  }

  // 권한 확인 중
  if (!permission) return <View style={styles.screen} />;

  // 권한 거부됨
  if (!permission.granted) {
    return (
      <View style={[styles.screen, CommonStyles.center, styles.permissionBox]}>
        <AppText variant="heading" tone="onOverlay">
          카메라 권한이 필요해요
        </AppText>
        <AppText tone="onOverlay" style={styles.permissionText}>
          일기에 넣을 사진을 찍으려면 카메라 사용을 허용해 주세요.
          {permission.canAskAgain ? '' : '\n설정 앱 > 하루 일기 > 카메라에서 켤 수 있어요.'}
        </AppText>
        {permission.canAskAgain ? <Button label="권한 허용하기" onPress={requestPermission} /> : null}
        <Button label="닫기" variant="outline" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView
        ref={cameraRef}
        style={CommonStyles.flex1}
        facing={facing}
        flash={flash}
        zoom={zoom}
        // 셀카는 거울처럼 보이는 그대로 저장 (요즘 카메라 앱 기본값)
        mirror={facing === 'front'}
        onCameraReady={() => setReady(true)}
      />

      {/* 3×3 격자 (구도 잡기용). 터치는 통과시킨다. */}
      {grid ? (
        <View style={styles.gridOverlay} pointerEvents="none">
          <View style={[styles.gridLineV, { left: '33.33%' }]} />
          <View style={[styles.gridLineV, { left: '66.66%' }]} />
          <View style={[styles.gridLineH, { top: '33.33%' }]} />
          <View style={[styles.gridLineH, { top: '66.66%' }]} />
        </View>
      ) : null}

      {/* 타이머 카운트다운 */}
      {countdown !== null ? (
        <View style={styles.countdown} pointerEvents="none">
          <AppText tone="onOverlay" style={styles.countdownText}>
            {countdown}
          </AppText>
        </View>
      ) : null}

      {/* 상단 도구 */}
      <View style={[CommonStyles.rowBetween, styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <ToolButton label="✕" onPress={() => router.back()} accessibilityLabel="닫기" />
        <View style={[CommonStyles.row, styles.topTools]}>
          <ToolButton label={FLASH_LABEL[flash]} onPress={cycleFlash} accessibilityLabel="플래시" />
          <ToolButton
            label={timer === 0 ? '⏱ 끔' : `⏱ ${timer}초`}
            onPress={cycleTimer}
            accessibilityLabel="타이머"
          />
          <ToolButton label={grid ? '▦ 격자' : '▢ 격자'} onPress={() => setGrid((g) => !g)} accessibilityLabel="격자" />
        </View>
      </View>

      {/* 하단: 줌 + 셔터 */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Slider
          label="줌"
          value={zoom}
          min={0}
          max={1}
          onChange={setZoom}
          format={(v) => `${Math.round(v * 100)}%`}
          onDark
        />
        <View style={[CommonStyles.rowBetween, styles.shutterRow]}>
          <View style={styles.sideSlot} />
          <Pressable
            onPress={handleShutter}
            disabled={!ready || capturing}
            accessibilityRole="button"
            accessibilityLabel="촬영"
            style={({ pressed }) => [
              styles.shutterOuter,
              { opacity: !ready || capturing ? Layout.disabledOpacity : pressed ? Layout.pressedOpacity : 1 },
            ]}>
            <View style={styles.shutterInner} />
          </Pressable>
          <View style={styles.sideSlot}>
            <ToolButton
              label="⟲"
              onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
              accessibilityLabel="앞뒤 카메라 전환"
              large
            />
          </View>
        </View>
      </View>
    </View>
  );
}

/** 카메라 위의 반투명 동그란 버튼 */
function ToolButton({
  label,
  onPress,
  accessibilityLabel,
  large,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  large?: boolean;
}) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.toolButton, large && styles.toolButtonLarge, { opacity: pressed ? Layout.pressedOpacity : 1 }]}>
      <AppText variant={large ? 'heading' : 'label'} tone="onOverlay">
        {label}
      </AppText>
    </Pressable>
  );
}

const SHUTTER = 74;

const useStyles = makeStyles((theme) => ({
  screen: { flex: 1, backgroundColor: theme.cameraBackground },
  permissionBox: { gap: Spacing.md },
  permissionText: { textAlign: 'center' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: Layout.screenPadding },
  topTools: { gap: Spacing.sm },
  toolButton: {
    minWidth: 40,
    height: 36,
    paddingHorizontal: Spacing.sm + 4,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.overlay,
  },
  toolButtonLarge: { width: 52, height: 52 },
  gridOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: theme.onOverlay, opacity: 0.4 },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: theme.onOverlay, opacity: 0.4 },
  countdown: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: { fontSize: 120, lineHeight: 140, fontWeight: '700' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.md,
    gap: Spacing.md,
    backgroundColor: theme.overlay,
  },
  shutterRow: { paddingHorizontal: Spacing.lg },
  sideSlot: { width: 52, alignItems: 'center' },
  shutterOuter: {
    width: SHUTTER,
    height: SHUTTER,
    borderRadius: Radius.pill,
    borderWidth: 4,
    borderColor: theme.onOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: SHUTTER - 16, height: SHUTTER - 16, borderRadius: Radius.pill, backgroundColor: theme.onOverlay },
}));
