// 어둠에 변한 이웃. 형태는 Sprite & Asset Reference Sheet(보랏빛 눈이 빛나는 검은 털뭉치), 정체성은 기획서.
// 이웃은 쓰러지지 않고 되돌아가므로 시트의 '사망' 프레임 대신 '되돌아온 모습'을 그린다.
// M1은 파닥(박쥐)과 보스전 화면용 노월(마녀). 그르르·말랑·호오·킥킥은 M2에서 같은 규격으로 추가한다.
import { type Ctx, Palette, ellipse, starPath } from './kit';

export const BAT = { size: 80, cx: 40, cy: 44, frames: 4 } as const;

/** 날갯짓 각도 (위 → 가운데 → 아래 → 가운데) */
const FLAP = [-0.55, -0.1, 0.38, -0.1];

function wing(ctx: Ctx, side: -1 | 1, angle: number, fill: string, edge: string): void {
  ctx.save();
  ctx.translate(BAT.cx + side * 9, BAT.cy - 3);
  ctx.scale(side, 1);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(10, -16, 30, -10);
  ctx.quadraticCurveTo(27, -2, 30, 6);
  ctx.quadraticCurveTo(24, 2, 21, 9);
  ctx.quadraticCurveTo(16, 4, 12, 10);
  ctx.quadraticCurveTo(8, 4, 2, 7);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // 날개 뼈
  ctx.beginPath();
  ctx.moveTo(2, 1);
  ctx.lineTo(21, 7);
  ctx.moveTo(4, -2);
  ctx.lineTo(27, -6);
  ctx.stroke();
  ctx.restore();
}

/** 어둠에 변한 파닥: 보랏빛 눈만 빛나는 검은 털뭉치 */
export function drawBatDark(ctx: Ctx, frame: number): void {
  const a = FLAP[frame];
  wing(ctx, -1, a, '#1B1729', 'rgba(120,108,170,0.35)');
  wing(ctx, 1, a, '#1B1729', 'rgba(120,108,170,0.35)');
  const { cx, cy } = BAT;
  ctx.fillStyle = '#14111F';
  starPath(ctx, cx, cy + 1, 11, 15, 12.2, frame * 0.08);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy - 8);
  ctx.lineTo(cx - 8, cy - 22);
  ctx.lineTo(cx - 2, cy - 11);
  ctx.moveTo(cx + 10, cy - 8);
  ctx.lineTo(cx + 8, cy - 22);
  ctx.lineTo(cx + 2, cy - 11);
  ctx.fill();
  // 털 끝에 비친 달빛
  ctx.strokeStyle = 'rgba(168,156,217,0.28)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy + 1, 13.5, -2.6, -0.6);
  ctx.stroke();
  ctx.shadowColor = Palette.lavender;
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#D6CCFF';
  for (const d of [-1, 1]) {
    ellipse(ctx, cx + d * 5, cy, 3, 2.3);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

/** 되돌아온 파닥: 라벤더색, 얼굴이 있는 작은 박쥐 */
export function drawBatTrue(ctx: Ctx, frame: number): void {
  const a = FLAP[frame];
  wing(ctx, -1, a, '#8F80CF', 'rgba(246,241,231,0.6)');
  wing(ctx, 1, a, '#8F80CF', 'rgba(246,241,231,0.6)');
  const { cx, cy } = BAT;
  ctx.fillStyle = Palette.lavender;
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy - 6);
  ctx.lineTo(cx - 9, cy - 22);
  ctx.lineTo(cx - 1, cy - 10);
  ctx.moveTo(cx + 10, cy - 6);
  ctx.lineTo(cx + 9, cy - 22);
  ctx.lineTo(cx + 1, cy - 10);
  ctx.fill();
  ctx.fillStyle = '#F2B8C8';
  ctx.beginPath();
  ctx.moveTo(cx - 8.5, cy - 9);
  ctx.lineTo(cx - 8, cy - 17);
  ctx.lineTo(cx - 4, cy - 11);
  ctx.moveTo(cx + 8.5, cy - 9);
  ctx.lineTo(cx + 8, cy - 17);
  ctx.lineTo(cx + 4, cy - 11);
  ctx.fill();
  ellipse(ctx, cx, cy + 1, 13, 13.5);
  ctx.fillStyle = Palette.lavender;
  ctx.fill();
  ctx.strokeStyle = 'rgba(246,241,231,0.55)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ellipse(ctx, cx, cy + 6, 7.5, 6.5);
  ctx.fillStyle = '#DCD3F7';
  ctx.fill();
  ctx.fillStyle = '#2A2440';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + d * 4.6, cy - 1, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#FFFFFF';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + d * 4.6 - 0.9, cy - 2, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(242,150,170,0.6)';
  for (const d of [-1, 1]) {
    ellipse(ctx, cx + d * 8.5, cy + 3, 2.4, 1.5);
    ctx.fill();
  }
  ctx.strokeStyle = '#2A2440';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy + 2, 2, 0.2, Math.PI - 0.2);
  ctx.stroke();
}

export const WITCH = { size: 192, frames: 2 } as const;

/** 노월(보스): 태양을 재운 마녀. 어두운 보랏빛 망토, 라벤더 머리, 초승달 지팡이 (기획서 색 #2B1B3D → #F4D6FF) */
export function drawWitch(ctx: Ctx, frame: number): void {
  const sway = frame === 0 ? 0 : 2;
  ctx.save();
  ctx.translate(96, 112);
  // 지팡이와 초승달
  ctx.strokeStyle = '#7A5530';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(42, -26);
  ctx.lineTo(54, 74);
  ctx.stroke();
  ctx.shadowColor = Palette.lavender;
  ctx.shadowBlur = frame === 0 ? 14 : 22;
  ctx.fillStyle = '#F4D6FF';
  ctx.beginPath();
  ctx.arc(40, -36, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#2B1B3D';
  ctx.beginPath();
  ctx.arc(45, -40, 9, 0, Math.PI * 2);
  ctx.fill();
  // 머리카락 (뒤)
  ctx.fillStyle = '#E9D7F7';
  ctx.beginPath();
  ctx.moveTo(-26, -24);
  ctx.quadraticCurveTo(-40 - sway, 30, -30 - sway, 54);
  ctx.lineTo(30 + sway, 54);
  ctx.quadraticCurveTo(40 + sway, 30, 26, -24);
  ctx.closePath();
  ctx.fill();
  // 망토
  ctx.fillStyle = '#2B1B3D';
  ctx.beginPath();
  ctx.moveTo(-22, 14);
  ctx.quadraticCurveTo(-46 - sway, 60, -50 - sway, 80);
  ctx.lineTo(50 + sway, 80);
  ctx.quadraticCurveTo(46 + sway, 60, 22, 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = Palette.lavender;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-48 - sway, 76);
  ctx.lineTo(48 + sway, 76);
  ctx.stroke();
  ctx.fillStyle = '#3A2A5A';
  ctx.beginPath();
  ctx.moveTo(-18, 14);
  ctx.lineTo(0, 30);
  ctx.lineTo(18, 14);
  ctx.closePath();
  ctx.fill();
  // 얼굴
  ctx.fillStyle = '#F6E9F2';
  ctx.beginPath();
  ctx.arc(0, -6, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#E9D7F7';
  ctx.beginPath();
  ctx.moveTo(-23, -10);
  ctx.quadraticCurveTo(-10, -2, 0, -16);
  ctx.quadraticCurveTo(10, -2, 23, -10);
  ctx.lineTo(23, -24);
  ctx.lineTo(-23, -24);
  ctx.closePath();
  ctx.fill();
  for (const d of [-1, 1]) {
    ellipse(ctx, d * 8, -2, 4.4, 5.6);
    ctx.fillStyle = Palette.lavender;
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(d * 8 - 1.4, -4, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(242,150,170,0.5)';
  for (const d of [-1, 1]) {
    ellipse(ctx, d * 13, 5, 3.4, 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#7A5A7A';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 6, 3, 0.2, Math.PI - 0.2);
  ctx.stroke();
  // 모자
  ctx.fillStyle = '#3A2A5A';
  ellipse(ctx, 0, -26, 46, 10);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-26, -28);
  ctx.quadraticCurveTo(-8, -70, 10 + sway, -94);
  ctx.quadraticCurveTo(14, -60, 26, -28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = Palette.lavender;
  ctx.fillRect(-25, -38, 50, 7);
  ctx.fillStyle = Palette.amber;
  starPath(ctx, 0, -34.5, 5, 6, 2.6);
  ctx.fill();
  ctx.restore();
}
