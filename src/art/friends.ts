// 루미의 잃어버린 친구 토리(토끼)·도토(다람쥐)의 초상 (2026-11-12 라이언: 정해진 에셋이 아니면 임시 그림은 직접 그린다).
// 선택 화면의 루미 초상(ChatGPT 대기 팩)과 어울리게: 앉아서 오른쪽 3/4을 보는 2등신, 굵은 짙은 외곽선, 한 단계 그늘.
// 두 가지 모습: 'true' = 제 모습(구출 뒤), 'lost' = 빛을 잃은 모습(검은 털 + 보랏빛 눈, 잠겨 있을 때).
// 좌표는 192×192 초상 칸 기준, 발끝 ≈ 186. 모양·색은 모두 제안.
import { type Ctx, Palette, ellipse, starPath } from './kit';

export type FriendId = 'tori' | 'doto';
export type FriendLook = 'true' | 'lost';

interface Colors {
  fur: string;
  shade: string;
  outline: string;
  belly: string;
  earInner: string;
  /** 다람쥐 꼬리 가운데 밝은 결 */
  stripe: string;
  eye: string;
  eyeLow: string;
  nose: string;
  blush: string | null;
}

const LOST: Colors = {
  fur: '#1f1b2e',
  shade: '#141120',
  outline: '#09070f',
  belly: '#272240',
  earInner: '#2f2848',
  stripe: '#2a2540',
  eye: '#d6ccff',
  eyeLow: '#a89cd9',
  nose: '#3a3256',
  blush: null,
};

const TRUE: Record<FriendId, Colors> = {
  tori: {
    fur: '#f4efe8',
    shade: '#d8cdcb',
    outline: '#4a3a46',
    belly: '#ffffff',
    earInner: '#f4b6c6',
    stripe: '#ffffff',
    eye: '#2b2238',
    eyeLow: '#6a5a86',
    nose: '#e8849c',
    blush: 'rgba(244,140,165,0.5)',
  },
  doto: {
    fur: '#c8743c',
    shade: '#9a5226',
    outline: '#46271a',
    belly: '#f7e3c6',
    earInner: '#e8a27a',
    stripe: '#e8a066',
    eye: '#2a1a14',
    eyeLow: '#6e4a36',
    nose: '#5a3020',
    blush: 'rgba(240,130,110,0.45)',
  },
};

const LINE = 3.2;

/** 모양 하나: 칠하고, 그 안에만 그늘을 얹고, 외곽선 */
function part(ctx: Ctx, c: Colors, path: () => void, fill: string, shade?: () => void): void {
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  if (shade) {
    ctx.save();
    path();
    ctx.clip();
    shade();
    ctx.fillStyle = c.shade;
    ctx.fill();
    ctx.restore();
  }
  path();
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = LINE;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

const el = (ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) => () => ellipse(ctx, x, y, rx, ry, rot);

/** 큰 눈 둘(가까운 눈이 조금 큼). 빛을 잃으면 동공 없이 보랏빛으로 빛난다 */
function eyes(ctx: Ctx, c: Colors, look: FriendLook, near: [number, number], far: [number, number], ring?: string): void {
  const list: [number, number, number][] = [
    [near[0], near[1], 1],
    [far[0], far[1], 0.86],
  ];
  for (const [x, y, k] of list) {
    if (look === 'lost') {
      ctx.save();
      ctx.shadowColor = Palette.lavender;
      ctx.shadowBlur = 14;
      ellipse(ctx, x, y + 1, 6.4 * k, 4.6 * k, -0.08);
      ctx.fillStyle = c.eye;
      ctx.fill();
      ctx.restore();
      continue;
    }
    if (ring) {
      ellipse(ctx, x, y, 10.5 * k, 12 * k);
      ctx.fillStyle = ring;
      ctx.fill();
    }
    ellipse(ctx, x, y, 7.6 * k, 9.2 * k);
    ctx.fillStyle = c.eye;
    ctx.fill();
    // 아래쪽 반사광
    ctx.save();
    ellipse(ctx, x, y, 7.6 * k, 9.2 * k);
    ctx.clip();
    ellipse(ctx, x + 1, y + 7 * k, 7 * k, 4.6 * k);
    ctx.fillStyle = c.eyeLow;
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - 2.4 * k, y - 3.4 * k, 3.1 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 2.6 * k, y + 2.8 * k, 1.4 * k, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 코와 'ω' 입, 볼 홍조 */
function muzzle(ctx: Ctx, c: Colors, look: FriendLook, x: number, y: number, blush: [number, number][]): void {
  ctx.fillStyle = c.nose;
  ctx.beginPath();
  ctx.moveTo(x - 3.6, y - 1.6);
  ctx.quadraticCurveTo(x, y - 3.4, x + 3.6, y - 1.6);
  ctx.quadraticCurveTo(x + 1.2, y + 2.6, x, y + 2.6);
  ctx.quadraticCurveTo(x - 1.2, y + 2.6, x - 3.6, y - 1.6);
  ctx.fill();
  ctx.strokeStyle = look === 'lost' ? 'rgba(168,156,217,0.35)' : c.outline;
  ctx.lineWidth = 1.7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + 2.6);
  ctx.lineTo(x, y + 5);
  ctx.moveTo(x - 4.4, y + 5);
  ctx.quadraticCurveTo(x - 2.2, y + 8, x, y + 5);
  ctx.quadraticCurveTo(x + 2.2, y + 8, x + 4.4, y + 5);
  ctx.stroke();
  if (c.blush) {
    ctx.fillStyle = c.blush;
    for (const [bx, by] of blush) {
      ellipse(ctx, bx, by, 6.4, 3.6);
      ctx.fill();
    }
  }
}

/** 빛을 잃은 모습의 바깥 테두리 빛(라벤더 한 줄) */
function lostRim(ctx: Ctx, path: () => void): void {
  ctx.save();
  path();
  ctx.clip();
  path();
  ctx.translate(-3, 3);
  ctx.strokeStyle = 'rgba(168,156,217,0.45)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawTori(ctx: Ctx, look: FriendLook): void {
  const c = look === 'lost' ? LOST : TRUE.tori;
  // 귀 (머리 뒤)
  const backEar = el(ctx, 82, 46, 11, 33, -0.2);
  const frontEar = el(ctx, 120, 42, 11.5, 34, 0.2);
  part(ctx, c, backEar, c.fur, el(ctx, 74, 46, 8, 34, -0.2));
  part(ctx, c, frontEar, c.fur, el(ctx, 112, 44, 6, 34, 0.2));
  ellipse(ctx, 83, 50, 5, 24, -0.2);
  ctx.fillStyle = c.earInner;
  ctx.fill();
  ellipse(ctx, 120, 46, 5.4, 25, 0.2);
  ctx.fill();
  // 꼬리 (복슬한 동그라미)
  part(ctx, c, () => starPath(ctx, 50, 164, 10, 13, 11), c.belly);
  // 뒷다리·몸
  part(ctx, c, el(ctx, 70, 158, 27, 25), c.fur, el(ctx, 64, 170, 26, 18));
  const body = el(ctx, 98, 148, 30, 34);
  part(ctx, c, body, c.fur, el(ctx, 84, 166, 26, 22));
  ellipse(ctx, 106, 156, 17, 23);
  ctx.fillStyle = c.belly;
  ctx.fill();
  part(ctx, c, el(ctx, 70, 181, 20, 6.8), c.fur, el(ctx, 66, 186, 20, 4));
  // 머리
  const head = el(ctx, 103, 94, 40, 35);
  part(ctx, c, head, c.fur, el(ctx, 84, 112, 34, 22));
  if (look === 'lost') lostRim(ctx, head);
  eyes(ctx, c, look, [96, 96], [126, 94]);
  muzzle(ctx, c, look, 114, 108, [
    [86, 110],
    [134, 107],
  ]);
  // 앞발
  part(ctx, c, el(ctx, 98, 180, 9, 7), c.fur);
  part(ctx, c, el(ctx, 120, 178, 8.5, 6.6), c.fur);
  if (look === 'true') {
    // 귀 밑의 민트 리본
    ctx.fillStyle = Palette.mint;
    ctx.strokeStyle = '#3f7d63';
    ctx.lineWidth = 2;
    for (const d of [-1, 1]) {
      ellipse(ctx, 128 + d * 8, 66 + d * -2, 8.5, 5.6, d * 0.45);
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(128, 66, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function dotoTailPath(ctx: Ctx): () => void {
  return () => {
    ctx.beginPath();
    ctx.moveTo(84, 170);
    ctx.bezierCurveTo(44, 174, 28, 142, 36, 112);
    ctx.bezierCurveTo(42, 92, 32, 80, 24, 66);
    ctx.bezierCurveTo(12, 46, 26, 18, 54, 20);
    ctx.bezierCurveTo(78, 22, 90, 40, 82, 56);
    ctx.bezierCurveTo(78, 66, 66, 66, 62, 58);
    ctx.bezierCurveTo(58, 72, 72, 86, 72, 106);
    ctx.bezierCurveTo(72, 124, 70, 140, 92, 150);
    ctx.closePath();
  };
}

function drawDoto(ctx: Ctx, look: FriendLook): void {
  const c = look === 'lost' ? LOST : TRUE.doto;
  // 크고 복슬한 꼬리 (몸 뒤, 끝이 바깥으로 말림)
  const tail = dotoTailPath(ctx);
  part(ctx, c, tail, c.fur, el(ctx, 30, 120, 22, 70, 0.1));
  ctx.save();
  tail();
  ctx.clip();
  ctx.strokeStyle = c.stripe;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(74, 160);
  ctx.bezierCurveTo(52, 150, 48, 124, 52, 104);
  ctx.bezierCurveTo(56, 84, 40, 68, 46, 44);
  ctx.stroke();
  ctx.restore();
  // 꼬리 털결
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const [x1, y1, x2, y2] of [
    [33, 128, 40, 124],
    [30, 88, 37, 86],
    [24, 50, 31, 52],
    [70, 34, 66, 40],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  if (look === 'lost') lostRim(ctx, tail);
  // 뾰족한 귀와 귀 끝 털
  const backEar = () => {
    ctx.beginPath();
    ctx.moveTo(76, 78);
    ctx.quadraticCurveTo(72, 54, 82, 42);
    ctx.quadraticCurveTo(94, 54, 96, 72);
    ctx.closePath();
  };
  const frontEar = () => {
    ctx.beginPath();
    ctx.moveTo(114, 70);
    ctx.quadraticCurveTo(120, 50, 132, 42);
    ctx.quadraticCurveTo(140, 58, 138, 78);
    ctx.closePath();
  };
  part(ctx, c, backEar, c.fur);
  part(ctx, c, frontEar, c.fur);
  ctx.fillStyle = c.earInner;
  ctx.beginPath();
  ctx.moveTo(80, 72);
  ctx.quadraticCurveTo(78, 58, 83, 50);
  ctx.quadraticCurveTo(90, 58, 91, 70);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(119, 70);
  ctx.quadraticCurveTo(124, 56, 131, 50);
  ctx.quadraticCurveTo(135, 62, 133, 74);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 2.4;
  for (const [x, y, dx, dy] of [
    [82, 42, -3, -7],
    [82, 42, 2, -8],
    [132, 42, 1, -8],
    [132, 42, 6, -6],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + dy);
    ctx.stroke();
  }
  // 뒷다리·몸
  part(ctx, c, el(ctx, 78, 160, 25, 24), c.fur, el(ctx, 72, 172, 24, 16));
  part(ctx, c, el(ctx, 102, 150, 28, 32), c.fur, el(ctx, 88, 168, 24, 20));
  ellipse(ctx, 110, 156, 16, 22);
  ctx.fillStyle = c.belly;
  ctx.fill();
  part(ctx, c, el(ctx, 78, 182, 18, 6.5), c.shade);
  // 머리 + 볼·주둥이의 크림빛
  const head = el(ctx, 106, 98, 38, 33);
  part(ctx, c, head, c.fur, el(ctx, 88, 116, 32, 20));
  ctx.save();
  head();
  ctx.clip();
  ellipse(ctx, 118, 114, 22, 15);
  ctx.fillStyle = c.belly;
  ctx.fill();
  ctx.restore();
  head();
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = LINE;
  ctx.stroke();
  if (look === 'lost') lostRim(ctx, head);
  eyes(ctx, c, look, [100, 98], [128, 96], look === 'true' ? c.belly : undefined);
  muzzle(ctx, c, look, 121, 110, [
    [92, 112],
    [139, 109],
  ]);
  // 앞발
  part(ctx, c, el(ctx, 98, 182, 8.5, 6.2), c.shade);
  part(ctx, c, el(ctx, 120, 181, 8, 6), c.shade);
  if (look === 'true') {
    // 두 손에 든 황금 도토리 (아이템 '황금 도토리'와 이름 '도토')
    part(ctx, c, el(ctx, 112, 156, 9, 10.5), '#f2b54a', el(ctx, 106, 162, 8, 8));
    ctx.fillStyle = '#7a4a26';
    ctx.beginPath();
    ctx.ellipse(112, 147, 11, 6.4, 0, Math.PI, 0);
    ctx.quadraticCurveTo(112, 152, 101, 147);
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,170,0.4)';
    ctx.lineWidth = 1;
    for (const x of [106, 112, 118]) {
      ctx.beginPath();
      ctx.moveTo(x - 2, 142);
      ctx.lineTo(x + 2, 149);
      ctx.stroke();
    }
    ctx.strokeStyle = c.outline;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(112, 141);
    ctx.lineTo(114, 136);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ellipse(ctx, 116, 153, 2.2, 3.4, 0.3);
    ctx.fill();
  }
  // 도토리를 감싼 앞발
  part(ctx, c, el(ctx, 101, 156, 6.4, 7.4, 0.3), c.fur);
  part(ctx, c, el(ctx, 123, 155, 6, 7, -0.3), c.fur);
}

/** 192×192 초상 (투명 배경) */
export function drawFriendPortrait(ctx: Ctx, id: FriendId, look: FriendLook): void {
  ctx.save();
  ctx.lineCap = 'round';
  if (id === 'tori') drawTori(ctx, look);
  else drawDoto(ctx, look);
  ctx.restore();
}
