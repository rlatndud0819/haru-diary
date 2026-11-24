/**
 * 사진 전달함.
 * 카메라·필터 화면에서 만든 사진을 작성 화면으로 넘겨줄 때 쓴다.
 *
 * 왜 필요한가: router.back()은 이전 화면으로 값을 돌려주는 기능이 없다.
 * (웹의 "팝업 → 부모 창에 값 전달"과 비슷한 상황)
 * 그래서 카메라/필터 화면이 여기에 결과를 넣어 두고, 작성 화면이 다시 보일 때(useFocusEffect) 꺼내 간다.
 * 메모리에만 있는 아주 작은 큐(queue)다.
 */
export type PhotoResult = {
  uri: string;
  /** 기존 사진을 필터로 바꾼 경우 그 사진의 위치. 없으면 새 사진으로 추가 */
  replaceIndex?: number;
};

let pending: PhotoResult[] = [];

export function deliverPhoto(result: PhotoResult): void {
  pending.push(result);
}

/** 쌓인 결과를 모두 꺼내고 비운다. */
export function takePendingPhotos(): PhotoResult[] {
  const results = pending;
  pending = [];
  return results;
}
