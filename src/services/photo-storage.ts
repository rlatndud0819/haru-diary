import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { withRelockSuspended } from '@/services/lock-control';

/**
 * 사진 처리.
 * 이미지 피커가 돌려주는 경로는 임시(캐시) 폴더라서 OS가 지울 수 있다.
 * 그래서 고른 사진을 앱 전용 문서 폴더(Paths.document/photos)로 복사하고, 그 경로를 DB에 저장한다.
 */

const photoDir = new Directory(Paths.document, 'photos');

function ensurePhotoDir(): void {
  if (!photoDir.exists) {
    photoDir.create({ intermediates: true, idempotent: true });
  }
}

/** 앨범에서 사진 1장 선택. 취소하면 null */
export async function pickPhoto(): Promise<string | null> {
  const result = await withRelockSuspended(() =>
    ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    })
  );
  if (result.canceled || !result.assets?.length) {
    return null;
  }
  return result.assets[0].uri;
}

/** 임시 경로의 사진을 앱 문서 폴더로 복사하고, 새 경로(uri)를 돌려준다. */
export async function savePhotoToAppStorage(tempUri: string): Promise<string> {
  ensurePhotoDir();
  const source = new File(tempUri);
  const ext = source.extension || '.jpg';
  const dest = new File(photoDir, `${Date.now()}${ext}`);
  await source.copy(dest);
  return dest.uri;
}

/** 이미 앱 폴더에 저장된 사진인지 확인 (수정 시 사진을 바꾸지 않았으면 다시 복사하지 않기 위해) */
export function isStoredPhoto(uri: string): boolean {
  return uri.startsWith(photoDir.uri);
}

/** 사진 파일 삭제. 파일이 없거나 실패해도 앱이 멈추지 않도록 에러를 무시한다. */
export function deletePhoto(uri: string | null): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch (e) {
    console.warn('사진 삭제 실패', e);
  }
}
