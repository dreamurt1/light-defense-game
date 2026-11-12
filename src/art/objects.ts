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

/**
 * 중앙 광원 (2026-11-12 새 기획, 마을의 수호 토템). 임시 코드 그림 128×176: 돌 받침 위에 떠 있는 빛의 결정과 파편.
 * 0 = 밝음, 1 = 약함(광도 '낮음'), 2 = 꺼짐. 기준점 = 받침 바닥 가운데(64, 158), 결정 가운데 = (64, 66)
 */
export const CENTRAL = { w: 128, h: 176, footY: 158, coreY: 66, frames: 3 } as const;

const CRYSTAL: readonly [string, string, string][] = [
  ['#FFFDF2', '#FFD983', '#E39B3C'], // 밝음
  ['#F5DDB0', '#C9935A', '#7A5238'], // 약함
  ['#7C7090', '#4A4060', '#2A2438'], // 꺼짐
];

function crystal(ctx: Ctx, x: number, y: number, w: number, h: number, colors: readonly [string, string, string]): void {
  const g = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
  g.addColorStop(0, colors[0]);
  g.addColorStop(0.5, colors[1]);
  g.addColorStop(1, colors[2]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2);
  ctx.lineTo(x + w / 2, y - h * 0.08);
  ctx.lineTo(x, y + h / 2);
  ctx.lineTo(x - w / 2, y - h * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,248,230,0.55)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // 가운데 결
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2);
  ctx.lineTo(x - w * 0.12, y);
  ctx.lineTo(x, y + h / 2);
  ctx.stroke();
}

export function drawCentralSource(ctx: Ctx, frame: number): void {
  const { w, footY, coreY } = CENTRAL;
  const cx = w / 2;
  const colors = CRYSTAL[frame];
  // 바닥 그림자
  ctx.fillStyle = 'rgba(5,4,12,0.45)';
  ctx.beginPath();
  ctx.ellipse(cx, footY - 2, 50, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  // 돌 받침 두 단
  shadowed(ctx, () => {
    ctx.fillStyle = '#5B5670';
    ctx.beginPath();
    ctx.roundRect(cx - 44, footY - 26, 88, 24, 8);
    ctx.fill();
  }, 3, 5);
  ctx.fillStyle = '#6E6886';
  ctx.beginPath();
  ctx.roundRect(cx - 44, footY - 26, 88, 9, 6);
  ctx.fill();
  ctx.fillStyle = '#6A6582';
  ctx.beginPath();
  ctx.roundRect(cx - 30, footY - 44, 60, 20, 7);
  ctx.fill();
  ctx.fillStyle = '#7F7998';
  ctx.beginPath();
  ctx.roundRect(cx - 30, footY - 44, 60, 7, 5);
  ctx.fill();
  // 받침에 새긴 별
  ctx.fillStyle = frame === 2 ? 'rgba(160,150,190,0.35)' : 'rgba(255,214,140,0.75)';
  ctx.beginPath();
  ctx.moveTo(cx, footY - 22);
  ctx.lineTo(cx + 3, footY - 15);
  ctx.lineTo(cx, footY - 8);
  ctx.lineTo(cx - 3, footY - 15);
  ctx.closePath();
  ctx.fill();
  // 떠 있는 결정 + 둘레 파편 셋
  if (frame !== 2) {
    ctx.save();
    ctx.shadowColor = frame === 0 ? '#FFC857' : '#C9935A';
    ctx.shadowBlur = frame === 0 ? 22 : 10;
    crystal(ctx, cx, coreY, 38, 74, colors);
    ctx.restore();
  } else {
    crystal(ctx, cx, coreY + 6, 38, 74, colors);
  }
  crystal(ctx, cx - 34, coreY + 14, 11, 20, colors);
  crystal(ctx, cx + 33, coreY + 6, 10, 18, colors);
  crystal(ctx, cx + 22, coreY - 34, 8, 14, colors);
  // 금(어둠의 습격으로 생긴 균열, XMind)
  ctx.strokeStyle = frame === 0 ? 'rgba(180,110,40,0.55)' : 'rgba(40,30,50,0.7)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx + 4, coreY - 20);
  ctx.lineTo(cx - 3, coreY - 6);
  ctx.lineTo(cx + 5, coreY + 4);
  ctx.lineTo(cx - 1, coreY + 16);
  ctx.stroke();
}
