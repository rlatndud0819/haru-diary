/**
 * 색 변환 행렬(Color Matrix) 계산.
 *
 * 사진 필터의 정체는 "픽셀마다 RGBA 값에 곱하는 4×5 행렬"이다.
 *   R' = a·R + b·G + c·B + d·A + e
 *   G' = ...
 * 숫자 20개(4행 × 5열)로 밝기·대비·채도·색온도·흑백·세피아 등을 모두 표현할 수 있다.
 * 행렬끼리 곱하면(concat) 효과를 겹칠 수 있다. 예) 흑백 → 대비 올리기
 *
 * Skia의 <ColorMatrix matrix={...}/>에 그대로 넘긴다. 5번째 열(더하는 값)은 0~1 범위다.
 */
export type ColorMatrix = number[];

/** 아무 변화 없는 행렬 (원본) */
export const IDENTITY: ColorMatrix = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, 1, 0,
];

/** a 다음에 b를 적용한 것과 같은 행렬 (b · a) */
function concatTwo(a: ColorMatrix, b: ColorMatrix): ColorMatrix {
  const out: number[] = new Array(20).fill(0);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      let sum = col === 4 ? b[row * 5 + 4] : 0;
      for (let k = 0; k < 4; k++) sum += b[row * 5 + k] * a[k * 5 + col];
      out[row * 5 + col] = sum;
    }
  }
  return out;
}

/** 여러 행렬을 순서대로 적용한 결과 (왼쪽부터 먼저 적용) */
export function concat(...matrices: ColorMatrix[]): ColorMatrix {
  return matrices.reduce(concatTwo, IDENTITY);
}

/** 두 행렬 사이를 t(0~1)만큼 섞는다. 필터 "강도" 조절에 쓴다. (t=0 원본, t=1 필터 100%) */
export function lerp(a: ColorMatrix, b: ColorMatrix, t: number): ColorMatrix {
  return a.map((v, i) => v + (b[i] - v) * t);
}

/** 밝기: amount -1(검정) ~ 0(그대로) ~ 1(흰색) */
export function brightness(amount: number): ColorMatrix {
  return [1, 0, 0, 0, amount, 0, 1, 0, 0, amount, 0, 0, 1, 0, amount, 0, 0, 0, 1, 0];
}

/** 대비: 1 = 그대로, 1보다 크면 진하게, 작으면 흐리게 */
export function contrast(c: number): ColorMatrix {
  const t = (1 - c) / 2;
  return [c, 0, 0, 0, t, 0, c, 0, 0, t, 0, 0, c, 0, t, 0, 0, 0, 1, 0];
}

/** 채도: 0 = 흑백, 1 = 그대로, 1보다 크면 쨍하게 (사람 눈 밝기 가중치 사용) */
export function saturation(s: number): ColorMatrix {
  const lr = 0.2126 * (1 - s);
  const lg = 0.7152 * (1 - s);
  const lb = 0.0722 * (1 - s);
  return [
    lr + s, lg, lb, 0, 0,
    lr, lg + s, lb, 0, 0,
    lr, lg, lb + s, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

/** 색온도: 양수면 따뜻하게(노랑·주황), 음수면 차갑게(파랑). -1 ~ 1 */
export function temperature(t: number): ColorMatrix {
  return [1 + t * 0.2, 0, 0, 0, 0, 0, 1 + t * 0.05, 0, 0, 0, 0, 0, 1 - t * 0.2, 0, 0, 0, 0, 0, 1, 0];
}

/** 채널별로 색을 곱하고 더한다. (r, g, b: 곱할 값 / or, og, ob: 더할 값 0~1) */
export function tint(r: number, g: number, b: number, or = 0, og = 0, ob = 0): ColorMatrix {
  return [r, 0, 0, 0, or, 0, g, 0, 0, og, 0, 0, b, 0, ob, 0, 0, 0, 1, 0];
}

/** 세피아(옛날 사진 갈색 톤) */
export const SEPIA: ColorMatrix = [
  0.393, 0.769, 0.189, 0, 0,
  0.349, 0.686, 0.168, 0, 0,
  0.272, 0.534, 0.131, 0, 0,
  0, 0, 0, 1, 0,
];

/** 어두운 부분을 살짝 들어 올려 "바랜 필름" 느낌을 낸다. amount 0 ~ 0.2 정도 */
export function fade(amount: number): ColorMatrix {
  const s = 1 - amount;
  return [s, 0, 0, 0, amount, 0, s, 0, 0, amount, 0, 0, s, 0, amount, 0, 0, 0, 1, 0];
}
