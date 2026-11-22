import * as LocalAuthentication from 'expo-local-authentication';

/**
 * 생체 인증(Face ID / 지문) 처리.
 * 생체 정보가 등록돼 있지 않아도 disableDeviceFallback: false 이므로 기기 암호로 대신 인증할 수 있다.
 */

export type BiometricStatus = {
  available: boolean;
  /** 사용할 수 없을 때 사용자에게 보여줄 이유 */
  reason?: string;
};

export async function checkBiometricAvailable(): Promise<BiometricStatus> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) {
    return { available: false, reason: '이 기기는 생체 인증을 지원하지 않습니다.' };
  }
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!enrolled) {
    return { available: false, reason: '기기 설정에서 Face ID 또는 지문을 먼저 등록해 주세요.' };
  }
  return { available: true };
}

/** 인증 창을 띄우고 성공 여부를 돌려준다. */
export async function authenticate(message = '일기장을 열려면 인증해 주세요'): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: message,
    cancelLabel: '취소',
    disableDeviceFallback: false,
  });
  return result.success;
}
