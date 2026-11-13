// 2026-11-13 컨셉 시연판: 아이템 아이콘 5종(64×64)과 노월의 어둠 구슬(48×48) 임시 코드 그림.
// 아이콘은 HUD(DOM)와 맵 위 줍기 그림에 함께 쓰므로, 어두운 바닥에서도 보이게 굵은 짙은 외곽선을 두른다.
// 모양·색은 모두 제안 (팔레트 10색 근처, 빨강 없음).
import { type Ctx, Ink, Palette, ellipse, starPath } from './kit';

export type ItemId = 'wind_feather' | 'star_necklace' | 'firefly_jar' | 'golden_acorn' | 'light_charm';
export const ITEM_IDS: readonly ItemId[] = ['wind_feather', 'star_necklace', 'firefly_jar', 'golden_acorn', 'light_charm'];
export const ITEM_ICON = { size: 64 } as const;
export const itemKey = (id: ItemId): string => `item-${id}`;

export const ITEM_LABEL: Record<ItemId, string> = {
  wind_feather: '바람 깃털',
  star_necklace: '별 목걸이',
  firefly_jar: '반딧불 병',
  golden_acorn: '황금 도토리',
  light_charm: '빛의 부적',
};

const OUT = Ink.outline;
const OUT_W = 4.5;
const GOLD = '#E0A84A';

/** 바깥 외곽선(굵게) → 칠하기 */
function outlined(ctx: Ctx, path: () => void, fill: string | CanvasGradient, w = OUT_W): void {
  path();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** 바닥에 놓였을 때 떠 보이게 깔리는 은은한 빛 */
function backGlow(ctx: Ctx, color: string, x = 32, y = 34, r = 26): void {
  const g = ctx.createRadialGradient(x, y, 2, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** 바람 깃털 (민트): 비스듬한 깃털 + 바람 줄기 */
function drawWindFeather(ctx: Ctx): void {
  backGlow(ctx, 'rgba(158,217,181,0.35)');
  // 바람 줄기
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  const wind = () => {
    ctx.beginPath();
    ctx.moveTo(6, 44);
    ctx.quadraticCurveTo(16, 40, 22, 46);
    ctx.moveTo(8, 54);
    ctx.quadraticCurveTo(20, 50, 28, 56);
  };
  wind();
  ctx.stroke();
  ctx.strokeStyle = Palette.paper;
  ctx.lineWidth = 2;
  wind();
  ctx.stroke();
  // 깃털
  ctx.save();
  ctx.translate(34, 30);
  ctx.rotate(0.7);
  const vane = () => {
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.bezierCurveTo(13, -18, 13, 8, 2, 22);
    ctx.lineTo(-1, 22);
    ctx.bezierCurveTo(-12, 8, -12, -16, 0, -26);
    ctx.closePath();
  };
  outlined(ctx, vane, Palette.mint);
  // 그늘 반쪽
  ctx.save();
  vane();
  ctx.clip();
  ctx.fillStyle = '#76B593';
  ctx.fillRect(0, -30, 16, 56);
  // 깃 결
  ctx.strokeStyle = 'rgba(26,20,40,0.45)';
  ctx.lineWidth = 1.3;
  for (let y = -16; y <= 12; y += 7) {
    ctx.beginPath();
    ctx.moveTo(0, y + 4);
    ctx.lineTo(-9, y - 2);
    ctx.moveTo(0, y + 4);
    ctx.lineTo(9, y - 2);
    ctx.stroke();
  }
  ctx.restore();
  // 깃대
  ctx.strokeStyle = Palette.paper;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(0, 28);
  ctx.stroke();
  ctx.restore();
}

/** 별 목걸이 (라벤더): 구슬 줄 + 별 펜던트 */
function drawStarNecklace(ctx: Ctx): void {
  backGlow(ctx, 'rgba(168,156,217,0.4)', 32, 38);
  // 구슬 줄
  const beads: [number, number][] = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * 1.05 + (Math.PI * 0.9 * i) / 12;
    beads.push([32 + Math.cos(a) * 22, 26 - Math.sin(a) * 18]);
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 4;
  ctx.beginPath();
  beads.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  for (const [x, y] of beads) {
    outlined(
      ctx,
      () => {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
      },
      '#CFC6F0',
      3,
    );
  }
  // 펜던트 고리
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(32, 42);
  ctx.lineTo(32, 34);
  ctx.stroke();
  // 별
  outlined(ctx, () => starPath(ctx, 32, 46, 5, 14, 6.5), Palette.lavender);
  ctx.save();
  starPath(ctx, 32, 46, 5, 14, 6.5);
  ctx.clip();
  ctx.fillStyle = '#8F80CF';
  ctx.fillRect(32, 30, 20, 32);
  ctx.restore();
  ctx.fillStyle = Palette.paper;
  ctx.beginPath();
  ctx.arc(28.5, 42.5, 2, 0, Math.PI * 2);
  ctx.fill();
}

/** 반딧불 병 (앰버 빛): 코르크 마개, 유리병 안에서 빛나는 점들 */
function drawFireflyJar(ctx: Ctx): void {
  backGlow(ctx, 'rgba(255,200,87,0.5)', 32, 38, 28);
  const jar = () => {
    ctx.beginPath();
    ctx.moveTo(22, 18);
    ctx.lineTo(42, 18);
    ctx.lineTo(42, 22);
    ctx.quadraticCurveTo(52, 28, 52, 40);
    ctx.quadraticCurveTo(52, 58, 32, 58);
    ctx.quadraticCurveTo(12, 58, 12, 40);
    ctx.quadraticCurveTo(12, 28, 22, 22);
    ctx.closePath();
  };
  const g = ctx.createRadialGradient(32, 42, 2, 32, 42, 22);
  g.addColorStop(0, '#FFF0B8');
  g.addColorStop(0.55, Palette.amber);
  g.addColorStop(1, '#C98A2E');
  outlined(ctx, jar, g);
  // 반딧불 점
  ctx.save();
  ctx.shadowColor = '#FFF6DA';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#FFFBEA';
  for (const [x, y, r] of [
    [26, 38, 2.4],
    [38, 34, 2],
    [33, 48, 2.6],
    [42, 46, 1.6],
    [22, 48, 1.5],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // 유리 반사
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(17, 36);
  ctx.quadraticCurveTo(17, 30, 21, 27);
  ctx.stroke();
  // 코르크 마개
  outlined(
    ctx,
    () => {
      ctx.beginPath();
      ctx.roundRect(20, 9, 24, 10, 3);
    },
    Ink.brass,
  );
  ctx.fillStyle = 'rgba(255,220,170,0.35)';
  ctx.fillRect(22, 11, 20, 2.5);
}

/** 황금 도토리 (#E0A84A): 갈색 깍정이 + 반짝임 */
function drawGoldenAcorn(ctx: Ctx): void {
  backGlow(ctx, 'rgba(224,168,74,0.45)', 32, 38);
  // 열매
  const nut = () => ellipse(ctx, 32, 39, 15, 17);
  const g = ctx.createLinearGradient(20, 26, 46, 56);
  g.addColorStop(0, '#F6CF7A');
  g.addColorStop(0.5, GOLD);
  g.addColorStop(1, '#B07A2C');
  outlined(ctx, nut, g);
  // 깍정이
  const cap = () => {
    ctx.beginPath();
    ctx.moveTo(14, 30);
    ctx.quadraticCurveTo(14, 14, 32, 13);
    ctx.quadraticCurveTo(50, 14, 50, 30);
    ctx.quadraticCurveTo(32, 36, 14, 30);
    ctx.closePath();
  };
  outlined(ctx, cap, '#7A4A26');
  ctx.save();
  cap();
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,220,170,0.35)';
  ctx.lineWidth = 1.2;
  for (let x = 12; x <= 52; x += 6) {
    ctx.beginPath();
    ctx.moveTo(x - 4, 14);
    ctx.lineTo(x + 4, 32);
    ctx.moveTo(x + 4, 14);
    ctx.lineTo(x - 4, 32);
    ctx.stroke();
  }
  ctx.restore();
  // 꼭지
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(32, 13);
  ctx.quadraticCurveTo(33, 7, 38, 5);
  ctx.stroke();
  ctx.strokeStyle = '#7A4A26';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  // 반짝임
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ellipse(ctx, 25, 40, 2.6, 5, 0.3);
  ctx.fill();
  ctx.fillStyle = '#FFF6DA';
  starPath(ctx, 45, 50, 4, 5, 1.6);
  ctx.fill();
}

/** 빛의 부적: 종이색 부적 + 앰버 별 + 끈 */
function drawLightCharm(ctx: Ctx): void {
  backGlow(ctx, 'rgba(255,200,87,0.4)', 32, 36);
  // 끈 (위로)
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(32, 12);
  ctx.quadraticCurveTo(28, 6, 32, 3);
  ctx.stroke();
  ctx.strokeStyle = Palette.mint;
  ctx.lineWidth = 2;
  ctx.stroke();
  // 부적 종이 (살짝 기울임)
  ctx.save();
  ctx.translate(32, 34);
  ctx.rotate(-0.08);
  const paper = () => {
    ctx.beginPath();
    ctx.moveTo(-14, -22);
    ctx.lineTo(14, -22);
    ctx.lineTo(14, 20);
    ctx.lineTo(7, 26);
    ctx.lineTo(0, 20);
    ctx.lineTo(-7, 26);
    ctx.lineTo(-14, 20);
    ctx.closePath();
  };
  outlined(ctx, paper, Palette.paper);
  ctx.save();
  paper();
  ctx.clip();
  ctx.fillStyle = '#E6DCC8';
  ctx.fillRect(4, -24, 12, 52);
  ctx.restore();
  // 고리 구멍
  ctx.fillStyle = OUT;
  ctx.beginPath();
  ctx.arc(0, -17, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // 앰버 별 (은은하게 빛남)
  ctx.save();
  ctx.shadowColor = Palette.amber;
  ctx.shadowBlur = 8;
  starPath(ctx, 0, 1, 5, 10, 4.4);
  ctx.fillStyle = Palette.amber;
  ctx.fill();
  ctx.restore();
  starPath(ctx, 0, 1, 5, 10, 4.4);
  ctx.strokeStyle = '#9A6B34';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // 아래 장식 줄
  ctx.strokeStyle = 'rgba(154,107,52,0.7)';
  ctx.lineWidth = 1.4;
  for (const y of [14, 17]) {
    ctx.beginPath();
    ctx.moveTo(-8, y);
    ctx.lineTo(8, y);
    ctx.stroke();
  }
  ctx.restore();
}

/** 아이템 아이콘 하나 (64×64, 투명 배경) */
export function drawItemIcon(ctx: Ctx, id: ItemId): void {
  ctx.save();
  switch (id) {
    case 'wind_feather':
      drawWindFeather(ctx);
      break;
    case 'star_necklace':
      drawStarNecklace(ctx);
      break;
    case 'firefly_jar':
      drawFireflyJar(ctx);
      break;
    case 'golden_acorn':
      drawGoldenAcorn(ctx);
      break;
    case 'light_charm':
      drawLightCharm(ctx);
      break;
  }
  ctx.restore();
}

/** 노월이 던지는 어둠 구슬 (48×48): 라벤더 테두리의 어두운 보랏빛 구슬, 둘레에 작은 빛 알갱이 */
export const DARK_ORB = { size: 48 } as const;

export function drawDarkOrb(ctx: Ctx): void {
  const c = DARK_ORB.size / 2;
  // 바깥 번짐
  const halo = ctx.createRadialGradient(c, c, 8, c, c, 23);
  halo.addColorStop(0, 'rgba(168,156,217,0.45)');
  halo.addColorStop(1, 'rgba(168,156,217,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(c, c, 23, 0, Math.PI * 2);
  ctx.fill();
  // 구슬
  const g = ctx.createRadialGradient(c - 4, c - 5, 1, c, c, 14);
  g.addColorStop(0, '#5A4485');
  g.addColorStop(0.6, '#2B1B3D');
  g.addColorStop(1, '#170F26');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.shadowColor = Palette.lavender;
  ctx.shadowBlur = 6;
  ctx.strokeStyle = Palette.lavender;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  // 안쪽 소용돌이
  ctx.strokeStyle = 'rgba(214,204,255,0.55)';
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(c + 1, c + 1, 6, -0.4, Math.PI * 1.1);
  ctx.stroke();
  ctx.fillStyle = 'rgba(246,241,231,0.85)';
  ctx.beginPath();
  ctx.arc(c - 5, c - 5, 2, 0, Math.PI * 2);
  ctx.fill();
  // 둘레의 작은 빛 알갱이
  ctx.save();
  ctx.shadowColor = Palette.lavender;
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#E4DCFF';
  for (const [a, r, s] of [
    [-0.6, 18, 1.6],
    [0.9, 19, 1.2],
    [2.2, 17.5, 1.8],
    [3.3, 19.5, 1.1],
    [4.4, 18, 1.5],
    [5.4, 20, 1],
  ]) {
    ctx.beginPath();
    ctx.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
