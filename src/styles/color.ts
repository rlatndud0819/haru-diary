/**
 * '#RRGGBB' 색에 투명도를 붙여 '#RRGGBBAA'로 돌려준다.
 * 예: withAlpha('#E07A5F', 0.2) → '#E07A5F33'
 *
 * 기존 코드의 `${color}33` 같은 마법 문자열 대신 이 함수를 쓴다. (0.2 = 20% 불투명)
 */
export function withAlpha(hex: string, alpha: number): string {
  const clamped = Math.min(1, Math.max(0, alpha));
  const aa = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  return `${hex.slice(0, 7)}${aa}`;
}
