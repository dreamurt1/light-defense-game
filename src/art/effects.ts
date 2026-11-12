// 이펙트 에셋: 등불 글로우, 빛 마스크, 60° 부채꼴 빛, 반짝이·별, 발밑 그림자, 되돌림 터짐(5프레임).
// 기준: Sprite & Asset Reference Sheet의 빛 발사·되돌림·콤보 이펙트. 색은 기획서 팔레트(AMBER·DAWN·PAPER).
import { type Ctx, Palette, starPath } from './kit';

export const GLOW_SIZE = 256;

/** 꼭짓점이 왼쪽 가운데에 있고 오른쪽(0°)을 향하는 부채꼴. 반지름 R로 그려 두고 스케일로 사거리를 맞춘다 */
export const FAN_TEXTURE_RADIUS = 256;

export function fanTextureHeight(fanDeg: number): number {
  return Math.ceil(FAN_TEXTURE_RADIUS * Math.sin((fanDeg * Math.PI) / 360)) * 2 + 8;
}

function radial(ctx: Ctx, size: number, stops: [number, number][]): void {
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [at, alpha] of stops) g.addColorStop(at, `rgba(255,255,255,${alpha})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
}

/** 보이는 글로우: 부드럽게 퍼지는 빛 (흰색, 쓸 때 색을 입힌다) */
export function drawGlow(ctx: Ctx): void {
  radial(ctx, GLOW_SIZE, [
    [0, 1],
    [0.55, 0.35],
    [1, 0],
  ]);
}

/** 켜진 마을을 드러내는 마스크: 안쪽은 또렷하고 바깥 30%에서만 흐려진다 */
export function drawGlowMask(ctx: Ctx): void {
  radial(ctx, GLOW_SIZE, [
    [0, 1],
    [0.7, 1],
    [1, 0],
  ]);
}

function wedge(ctx: Ctx, half: number, cy: number): void {
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.arc(0, cy, FAN_TEXTURE_RADIUS, -half, half);
  ctx.closePath();
}

export function drawFanLight(ctx: Ctx, fanDeg: number): void {
  const R = FAN_TEXTURE_RADIUS;
  const half = (fanDeg * Math.PI) / 360;
  const cy = fanTextureHeight(fanDeg) / 2;
  const g = ctx.createRadialGradient(0, cy, 0, 0, cy, R);
  g.addColorStop(0, 'rgba(255,176,74,0.75)');
  g.addColorStop(0.55, 'rgba(255,160,60,0.42)');
  g.addColorStop(0.92, 'rgba(255,200,87,0.7)');
  g.addColorStop(1, 'rgba(255,200,87,0)');
  ctx.fillStyle = g;
  wedge(ctx, half, cy);
  ctx.fill();
  // 두 옆선이 또렷한 빛줄기
  ctx.shadowColor = 'rgba(255,176,74,0.9)';
  ctx.shadowBlur = 6;
  ctx.lineWidth = 3.5;
  for (const a of [-half, half]) {
    const lg = ctx.createLinearGradient(0, cy, Math.cos(a) * R, cy + Math.sin(a) * R);
    lg.addColorStop(0, 'rgba(255,224,168,0.95)');
    lg.addColorStop(1, 'rgba(255,200,87,0)');
    ctx.strokeStyle = lg;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(Math.cos(a) * R * 0.97, cy + Math.sin(a) * R * 0.97);
    ctx.stroke();
  }
}

export function drawFanMask(ctx: Ctx, fanDeg: number): void {
  ctx.fillStyle = '#fff';
  wedge(ctx, (fanDeg * Math.PI) / 360, fanTextureHeight(fanDeg) / 2);
  ctx.fill();
}

/** 네 갈래 반짝이 (32×32) */
export function drawSparkle(ctx: Ctx): void {
  ctx.shadowColor = 'rgba(255,200,87,0.9)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#FFF1C9';
  starPath(ctx, 16, 16, 4, 12, 3);
  ctx.fill();
}

/** 다섯 갈래 별 (32×32): 콤보 별, 아이템 반짝임 */
export function drawStar(ctx: Ctx): void {
  ctx.shadowColor = 'rgba(255,176,74,0.9)';
  ctx.shadowBlur = 5;
  ctx.fillStyle = Palette.amber;
  starPath(ctx, 16, 17, 5, 12, 5.4);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#FFF1C9';
  starPath(ctx, 14, 14, 5, 4.4, 2);
  ctx.fill();
}

/** 발밑 그림자 (40×16) */
export function drawFootShadow(ctx: Ctx): void {
  const g = ctx.createRadialGradient(20, 8, 0, 20, 8, 20);
  g.addColorStop(0, 'rgba(5,4,12,0.6)');
  g.addColorStop(1, 'rgba(5,4,12,0)');
  ctx.fillStyle = g;
  ctx.save();
  ctx.scale(1, 0.4);
  ctx.beginPath();
  ctx.arc(20, 20, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export const RETURN_BURST = { size: 96, frames: 5 } as const;

/** 되돌림 터짐: 빛 고리가 퍼지고 별 조각이 흩어진다 (96×96, 5프레임) */
export function drawReturnBurst(ctx: Ctx, frame: number): void {
  const c = RETURN_BURST.size / 2;
  const p = (frame + 1) / RETURN_BURST.frames;
  const fade = 1 - p * 0.85;
  // 따뜻한 중심
  const g = ctx.createRadialGradient(c, c, 0, c, c, 14 + p * 22);
  g.addColorStop(0, `rgba(255,241,201,${0.9 * fade})`);
  g.addColorStop(1, 'rgba(255,200,87,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, RETURN_BURST.size, RETURN_BURST.size);
  // 빛 고리
  ctx.strokeStyle = `rgba(255,214,140,${0.85 * fade})`;
  ctx.lineWidth = 4 - p * 2.5;
  ctx.beginPath();
  ctx.arc(c, c, 10 + p * 30, 0, Math.PI * 2);
  ctx.stroke();
  // 흩어지는 별 조각
  ctx.fillStyle = `rgba(255,200,87,${fade})`;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const d = 12 + p * 30;
    starPath(ctx, c + Math.cos(a) * d, c + Math.sin(a) * d, 4, 5 - p * 2, 1.4);
    ctx.fill();
  }
}
