import { useSQLiteContext } from 'expo-sqlite';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { LoadingView } from '@/components/ui/state-view';
import { Spacing } from '@/constants/theme';
import { isLockEnabled } from '@/db/settings-repository';
import { authenticate } from '@/services/biometric';
import { isRelockSuspended } from '@/services/lock-control';
import { CommonStyles } from '@/styles/common';
import { makeStyles } from '@/styles/make-styles';

type LockState = 'checking' | 'locked' | 'unlocked';

/**
 * 앱 잠금 관문.
 * - 앱을 켰을 때 잠금 설정이 켜져 있으면 인증 전까지 children(실제 앱 화면)을 보여주지 않는다.
 * - 앱이 백그라운드로 갔다가 돌아오면 다시 잠근다. (AppState 이벤트 사용)
 */
export function LockGate({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const styles = useStyles();
  const [state, setState] = useState<LockState>('checking');
  const [everUnlocked, setEverUnlocked] = useState(false);
  const authenticating = useRef(false);

  function unlock() {
    setState('unlocked');
    setEverUnlocked(true);
  }

  async function tryUnlock() {
    if (authenticating.current) return;
    authenticating.current = true;
    try {
      const ok = await authenticate();
      if (ok) unlock();
      else setState('locked');
    } finally {
      authenticating.current = false;
    }
  }

  // 1) 앱 시작 시 잠금 설정 확인
  useEffect(() => {
    (async () => {
      const enabled = await isLockEnabled(db);
      if (!enabled) {
        unlock();
        return;
      }
      setState('locked');
      await tryUnlock();
    })();
    // 시작 시 한 번만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) 백그라운드 → 다시 활성화될 때 재잠금
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next) => {
      // 인증 창이 떠 있는 동안에도 앱 상태가 바뀌므로, 인증 중에는 무시한다.
      if (next === 'background' && !authenticating.current && !isRelockSuspended()) {
        if (await isLockEnabled(db)) {
          setState('locked');
        }
      }
    });
    return () => sub.remove();
  }, [db]);

  if (state === 'checking') {
    return (
      <View style={styles.screen}>
        <LoadingView />
      </View>
    );
  }

  // 한 번이라도 잠금이 풀린 뒤에는 앱 화면을 계속 유지하고, 잠길 때는 그 위에 잠금 화면을 덮는다.
  // → 다시 잠금 해제해도 보던 화면(작성 중인 글 등)이 그대로 남아 있다.
  return (
    <View style={CommonStyles.flex1}>
      {everUnlocked ? children : null}
      {state === 'locked' ? (
        <View style={[StyleSheet.absoluteFill, styles.screen, CommonStyles.center]}>
          <Text style={styles.icon}>🔒</Text>
          <AppText variant="heading">하루 일기가 잠겨 있어요</AppText>
          <AppText variant="bodySmall" tone="secondary" style={{ marginTop: Spacing.sm }}>
            인증 후 일기를 볼 수 있습니다.
          </AppText>
          <Button label="잠금 해제" onPress={tryUnlock} style={styles.button} />
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  screen: { flex: 1, backgroundColor: theme.background },
  icon: { fontSize: 56, marginBottom: Spacing.md },
  button: { marginTop: Spacing.lg, alignSelf: 'stretch' },
}));
