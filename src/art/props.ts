// 격자 맵 소품의 생성 그림 자리 (2026-11-24 ChatGPT Map_Props_Pack, 기획 세션 13:14 통과 · 강·다리 수정본 13:33 통과 — 칸마다 이어 붙이는 조각, light만)
// 파일 = art-src/objects/prop-<종류>-<크기|조각>-<테마>.png, 캔버스 = 칸×96 + 사방 48(집은 위로 96 더) — 발자리 왼쪽 위 = 캔버스 (48, 48[+96])
// 테마: A 맵 light · B border · C dark. 그 테마 그림이 없으면 dark → border → light 순으로 찾아 그 테마 색조를 입힌다(MapProps)
export type PropTheme = 'light' | 'border' | 'dark';
export type PropKind = 'rock' | 'barrel' | 'house' | 'hay' | 'bush' | 'fence' | 'river' | 'bridge';

/** 그림이 있는 소품: 종류 · 크기(가로x세로 칸) 또는 울타리·강·다리 조각(h·v·end — 강·다리 h = 가로로 흐르는 물길, v = 세로) · 받은 테마 */
export const PROP_ART: readonly { kind: PropKind; size: string; themes: readonly PropTheme[] }[] = [
  { kind: 'rock', size: '1x1', themes: ['light', 'border', 'dark'] },
  { kind: 'rock', size: '2x2', themes: ['light', 'border', 'dark'] },
  { kind: 'barrel', size: '1x1', themes: ['light', 'dark'] },
  { kind: 'house', size: '2x2', themes: ['light', 'border', 'dark'] },
  { kind: 'house', size: '2x3', themes: ['light', 'border'] },
  { kind: 'house', size: '3x3', themes: ['light', 'border'] },
  { kind: 'hay', size: '2x1', themes: ['light', 'border', 'dark'] },
  { kind: 'hay', size: '3x1', themes: ['light', 'border', 'dark'] },
  { kind: 'bush', size: '2x2', themes: ['light', 'border', 'dark'] },
  { kind: 'bush', size: '3x3', themes: ['light', 'border', 'dark'] },
  { kind: 'fence', size: 'h', themes: ['light', 'border', 'dark'] },
  { kind: 'fence', size: 'v', themes: ['light', 'border', 'dark'] },
  { kind: 'fence', size: 'end', themes: ['light', 'border', 'dark'] },
  { kind: 'river', size: 'h', themes: ['light'] },
  { kind: 'river', size: 'v', themes: ['light'] },
  { kind: 'bridge', size: 'h', themes: ['light'] },
  { kind: 'bridge', size: 'v', themes: ['light'] },
];

export const propKey = (kind: PropKind, size: string, theme: PropTheme): string => `prop-${kind}-${size}-${theme}`;

/** 캔버스 크기(px): 칸×96 + 96, 집은 위로 96 더. 울타리 조각은 한 칸 */
export function propCanvas(kind: PropKind, size: string, cell = 96): { w: number; h: number } {
  const m = size.match(/^(\d)x(\d)$/);
  const [cw, ch] = m ? [Number(m[1]), Number(m[2])] : [1, 1];
  return { w: cw * cell + cell, h: ch * cell + cell + (kind === 'house' ? cell : 0) };
}

/** 맵 테마 → 소품 테마 */
export const PROP_THEME: Record<string, PropTheme> = { 'light-village': 'light', border: 'border', 'dark-village': 'dark' };
/** 그 테마 그림이 없을 때 찾아볼 순서 */
export const PROP_FALLBACK: Record<PropTheme, readonly PropTheme[]> = { light: ['light'], border: ['border', 'light'], dark: ['dark', 'border', 'light'] };
/** 다른 테마 그림을 빌려 쓸 때 입히는 색조 (border = 차가운 청회색, dark = 어둑한 보라 — 제안) */
export const PROP_TINT: Record<PropTheme, number> = { light: 0xffffff, border: 0xb9c3e2, dark: 0x8e88bc };
