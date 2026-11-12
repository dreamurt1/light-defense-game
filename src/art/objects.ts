// 오브젝트 에셋: 큰 등불(켜짐·약함·꺼짐), 처마에 매단 작은 등불(꺼짐·켜짐).
// 기준: Sprite & Asset Reference Sheet의 등불 — 놋쇠 받침 위의 유리 등. 상태는 기획서의 등불 HP 표현.
import { type Ctx, Ink, shadowed } from './kit';

/** 큰 등불: 기준점은 유리 가운데 */
export const LANTERN = { w: 56, h: 80, glassY: 44, frames: 3 } as const;
export const LANTERN_FRAME = { lit: 0, low: 1, out: 2 } as const;

const GLASS: readonly [string, string, string][] = [
  ['#FFF6DA', '#FFD27A', '#F0A040'], // 켜짐
  ['#FFE2A6', '#F2B05A', '#B86A2C'], // 약함 (HP 30% 이하)
  ['#6B5A72', '#3E3450', '#262036'], // 꺼짐: 식은 유리
];

export function drawLantern(ctx: Ctx, frame: number): void {
  const { w, h, glassY } = LANTERN;
  const cx = w / 2;
  shadowed(ctx, () => {
    ctx.fillStyle = '#4A321E';
    ctx.beginPath();
    ctx.ellipse(cx, h - 8, 20, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }, 3, 4);
  // 받침
  ctx.fillStyle = '#7A5530';
  ctx.beginPath();
  ctx.roundRect(cx - 15, h - 18, 30, 9, 3);
  ctx.fill();
  ctx.fillStyle = Ink.brass;
  ctx.fillRect(cx - 11, glassY + 16, 22, 5);
  // 유리
  const [hot, mid, edge] = GLASS[frame];
  const g = ctx.createRadialGradient(cx, glassY, 2, cx, glassY, 18);
  g.addColorStop(0, hot);
  g.addColorStop(0.45, mid);
  g.addColorStop(1, edge);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(cx - 13, glassY - 16, 26, 32, 7);
  ctx.fill();
  // 꺼진 등불에는 불씨 하나
  if (frame === LANTERN_FRAME.out) {
    ctx.fillStyle = '#FF8C5A';
    ctx.beginPath();
    ctx.arc(cx, glassY + 8, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // 놋쇠 틀
  ctx.strokeStyle = Ink.brass;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.roundRect(cx - 13, glassY - 16, 26, 32, 7);
  ctx.moveTo(cx, glassY - 16);
  ctx.lineTo(cx, glassY + 16);
  ctx.stroke();
  // 지붕 + 꼭지 고리
  ctx.fillStyle = '#7A5530';
  ctx.beginPath();
  ctx.moveTo(cx - 18, glassY - 16);
  ctx.quadraticCurveTo(cx, glassY - 38, cx + 18, glassY - 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = Ink.brass;
  ctx.fillRect(cx - 19, glassY - 18, 38, 4);
  ctx.strokeStyle = Ink.brass;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(cx, glassY - 38, 4, 0, Math.PI * 2);
  ctx.stroke();
}

/** 처마·가지에 매단 작은 등불 (24×34): 0 꺼짐, 1 켜짐 */
export const HANGING_LANTERN = { w: 24, h: 34, frames: 2 } as const;

export function drawHangingLantern(ctx: Ctx, frame: number): void {
  ctx.strokeStyle = '#3A2A1E';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(12, 6);
  ctx.stroke();
  ctx.fillStyle = Ink.brassDark;
  ctx.fillRect(5, 6, 14, 4);
  ctx.fillRect(6, 28, 12, 4);
  const g = ctx.createRadialGradient(12, 19, 1, 12, 19, 10);
  if (frame === 1) {
    g.addColorStop(0, '#FFF1C9');
    g.addColorStop(1, '#FFB347');
  } else {
    g.addColorStop(0, '#5A4A5E');
    g.addColorStop(1, '#2E2638');
  }
  ctx.fillStyle = g;
  ctx.fillRect(7, 10, 10, 18);
  ctx.strokeStyle = Ink.brassDark;
  ctx.strokeRect(7, 10, 10, 18);
}
