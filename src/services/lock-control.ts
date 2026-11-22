/**
 * 재잠금 일시 중지 스위치.
 * 사진 앨범을 열면(특히 Android) 앱이 잠깐 백그라운드로 가는데, 그때 잠기면 불편하다.
 * 앨범을 여는 동안만 suspended = true 로 두고, LockGate는 이 값이 true면 재잠금을 건너뛴다.
 */
let suspended = false;

export function isRelockSuspended(): boolean {
  return suspended;
}

/** fn을 실행하는 동안만 재잠금을 멈춘다. */
export async function withRelockSuspended<T>(fn: () => Promise<T>): Promise<T> {
  suspended = true;
  try {
    return await fn();
  } finally {
    // 앱이 다시 활성화되는 이벤트가 결과 반환보다 늦게 올 수 있어 약간 늦게 해제한다.
    setTimeout(() => {
      suspended = false;
    }, 1000);
  }
}
