// 에셋 그리기 공통 도구. 모든 그림은 Canvas 2D로 그려 PNG 스프라이트 시트로 내보낸다(scripts/export-assets.mjs).

export type Ctx = CanvasRenderingContext2D;

/** 기획서 팔레트 10색 (색상 코드의 원본은 기획서) */
export const Palette = {
  night: '#1B1F3B',
  dusk: '#2A2F5A',
  predawn: '#120F24',
  dawn: '#F2B880',
  amber: '#FFC857',
  mint: '#9ED9B5',
  lavender: '#A89CD9',
  ember: '#FF8C5A',
  paper: '#F6F1E7',
  ash: '#8A8FA8',
} as const;

/** 팔레트에서 섞어 쓰는 공통 색 (제안: 기획서에 없음) */
export const Ink = {
  outline: '#1a1428',
  shadow: 'rgba(5, 4, 12, 0.55)',
  glassHot: '#FFF6DA',
  brass: '#9A6B34',
  brassDark: '#5A3E26',
  scarf: '#F7955E',
} as const;

export function shadowed(ctx: Ctx, draw: () => void, dy = 4, blur = 6, color: string = Ink.shadow, dx = 0): void {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = dx;
  ctx.shadowOffsetY = dy;
  draw();
  ctx.restore();
}

export function poly(ctx: Ctx, pts: readonly (readonly [number, number])[]): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

/** n갈래 별 경로 */
export function starPath(ctx: Ctx, cx: number, cy: number, points: number, outer: number, inner: number, rot = -Math.PI / 2): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = rot + (i * Math.PI) / points;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
}

export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 두 색을 t(0~1)만큼 섞는다 */
export function mix(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
