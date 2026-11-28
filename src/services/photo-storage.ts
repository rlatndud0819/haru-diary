import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { withRelockSuspended } from '@/services/lock-control';

/**
 * 사진 처리.
 * 이미지 피커가 돌려주는 경로는 임시(캐시) 폴더라서 OS가 지울 수 있다.
 * 그래서 고른 사진을 앱 전용 문서 폴더(Paths.document/photos)로 복사하고, 그 경로를 DB에 저장한다.
 */

const photoDir = new Directory(Paths.document, 'photos');
/** 필터를 적용한 결과를 잠깐 두는 임시 폴더 (저장 버튼을 누르면 photoDir로 복사된다) */
const editedDir = new Directory(Paths.cache, 'edited');

function ensurePhotoDir(): void {
  if (!photoDir.exists) {
    photoDir.create({ intermediates: true, idempotent: true });
  }
}

/** 사진 보관 폴더 (백업·복원에서 사용). 없으면 만든다. */
export function getPhotoDirectory(): Directory {
  ensurePhotoDir();
  return photoDir;
}

/** 앨범에서 사진 여러 장 선택 (최대 limit장). 취소하면 빈 배열 */
export async function pickPhotos(limit: number): Promise<string[]> {
  if (limit <= 0) return [];
  const result = await withRelockSuspended(() =>
    ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      // 여러 장 선택과 자르기(allowsEditing)는 함께 쓸 수 없다. 대신 필터 화면에서 다듬는다.
      allowsMultipleSelection: true,
      selectionLimit: limit,
      orderedSelection: true,
      quality: 0.8,
    })
  );
  if (result.canceled || !result.assets?.length) {
    return [];
  }
  return result.assets.slice(0, limit).map((a) => a.uri);
}

/** 임시 경로의 사진을 앱 문서 폴더로 복사하고, 새 경로(uri)를 돌려준다. */
export async function savePhotoToAppStorage(tempUri: string): Promise<string> {
  ensurePhotoDir();
  const source = new File(tempUri);
  const ext = source.extension || '.jpg';
  // 여러 장을 같은 밀리초에 복사할 수 있어서 난수를 붙여 이름이 겹치지 않게 한다.
  const dest = new File(photoDir, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
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

/** 필터 적용 결과(JPEG 바이트)를 임시 파일로 쓰고 경로를 돌려준다. */
export async function writeEditedPhoto(bytes: Uint8Array): Promise<string> {
  if (!editedDir.exists) {
    editedDir.create({ intermediates: true, idempotent: true });
  }
  const file = new File(editedDir, `${Date.now()}.jpg`);
  file.create();
  await file.write(bytes);
  return file.uri;
}

/** 필터 편집·저장에 쓰는 최대 크기(긴 변 px). 일기용으로 충분하고 메모리·용량을 아낀다. */
const EDIT_MAX_SIDE = 2048;

/**
 * 필터 편집 전에 사진을 "정리"한다.
 * 1) 휴대폰 사진은 회전 정보(EXIF)만 붙어 있고 픽셀은 누워 있는 경우가 있다 → 실제 픽셀을 바로 세운다.
 * 2) 너무 큰 사진(1200만 화소 등)은 긴 변 2048px로 줄인다.
 * 결과는 캐시 폴더의 새 JPEG 경로.
 */
export async function prepareForEditing(uri: string): Promise<string> {
  const loaded = await ImageManipulator.manipulate(uri).renderAsync();
  let image = loaded;
  if (Math.max(loaded.width, loaded.height) > EDIT_MAX_SIDE) {
    const size = loaded.width >= loaded.height ? { width: EDIT_MAX_SIDE } : { height: EDIT_MAX_SIDE };
    image = await ImageManipulator.manipulate(loaded).resize(size).renderAsync();
  }
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.92 });
  return saved.uri;
}
