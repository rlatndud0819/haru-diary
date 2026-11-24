import { useState } from 'react';
import { type GestureResponderEvent, type LayoutChangeEvent, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Radius, Spacing } from '@/constants/theme';
import { CommonStyles } from '@/styles/common';
import { makeStyles } from '@/styles/make-styles';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** 표시할 숫자 형식. 기본은 -100 ~ 100 처럼 백분율로 보여준다. */
  format?: (value: number) => string;
  /** 어두운 배경(카메라·필터 화면) 위에 그릴 때 */
  onDark?: boolean;
};

const THUMB = 22;

/**
 * 가로 슬라이더. 외부 라이브러리 없이 View의 터치 응답(responder) 기능으로 만들었다.
 * 트랙을 누르거나 끌면 손가락 x 위치를 min~max 값으로 바꿔 onChange로 알려준다.
 */
export function Slider({ label, value, min, max, onChange, format, onDark }: Props) {
  const styles = useStyles();
  const [width, setWidth] = useState(0);

  function update(e: GestureResponderEvent) {
    if (width <= 0) return;
    const ratio = Math.min(1, Math.max(0, e.nativeEvent.locationX / width));
    onChange(min + (max - min) * ratio);
  }

  const ratio = (value - min) / (max - min);
  const text = format ? format(value) : String(Math.round(((value - min) / (max - min)) * 200 - 100));

  return (
    <View style={styles.wrap}>
      <View style={CommonStyles.rowBetween}>
        <AppText variant="caption" tone={onDark ? 'onOverlay' : 'secondary'}>
          {label}
        </AppText>
        <AppText variant="caption" tone={onDark ? 'onOverlay' : 'secondary'}>
          {text}
        </AppText>
      </View>
      <View
        style={styles.touchArea}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text }}
        // 이 View가 터치를 맡겠다고 선언하고, 누를 때·끌 때 값을 바꾼다
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={update}
        onResponderMove={update}>
        {/* 자식 View들이 터치를 가로채면 locationX 기준이 바뀌므로 터치를 받지 않게 한다 */}
        <View style={styles.track} pointerEvents="none">
          <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
        </View>
        <View pointerEvents="none" style={[styles.thumb, { left: ratio * width - THUMB / 2 }]} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  wrap: { gap: Spacing.xs },
  touchArea: { height: THUMB + 8, justifyContent: 'center' },
  track: { height: 4, borderRadius: Radius.pill, backgroundColor: theme.border, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: theme.tint },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: Radius.pill,
    backgroundColor: theme.card,
    borderWidth: 2,
    borderColor: theme.tint,
  },
}));
