// 2026-11-13 컨셉 시연판: 토리(토끼)·도토(다람쥐) 플레이용 8방향 시트 (임시 코드 그림).
// 루미 시트(lumi-8dir)와 같은 배치: 줄 = 방향(e·se·s·sw·w·nw·n·ne) + 연출 줄(ko·stun), 칸 = 대기 4 + 걷기 4.
// 애니메이션 이름도 같은 규칙: `${id}-idle-<방향>`, `${id}-walk-<방향>`, `${id}-ko`, `${id}-stun`.
// 그림은 앞·뒤·옆 세 포즈만 그리고 대각선은 옆 포즈, 왼쪽 계열은 좌우 뒤집기(제안).
// 좌표는 128×128 칸 기준(루미 원본 칸과 같음), 발끝 = FEET_Y(122). 디자인 64 칸 → 파일 2배.
// 색은 초상(src/art/friends.ts)을 따른다: 토리 = 흰 토끼 + 민트 리본, 도토 = 붉은 갈색 다람쥐 + 복슬 꼬리 + 황금 도토리.
import { DIRS, type Dir } from '../systems/facing';
import { type Ctx, Palette, ellipse, starPath } from './kit';
import { CELL, FEET_Y, LUMI_COLS } from './lumiSheet';
import { LUMI_COLUMNS, LUMI_ROWS, lumiAnims } from './lumiCompose';
import type { AnimDef } from './registry';

export type KeeperSpriteId = 'tori' | 'doto';

interface Colors {
  fur: string;
  shade: string;
  outline: string;
  belly: string;
  earInner: string;
  stripe: string;
  eye: string;
  nose: string;
  blush: string;
}

const COLORS: Record<KeeperSpriteId, Colors> = {
  tori: {
    fur: '#f4efe8',
    shade: '#d8cdcb',
    outline: '#4a3a46',
    belly: '#ffffff',
    earInner: '#f4b6c6',
    stripe: '#ffffff',
    eye: '#2b2238',
    nose: '#e8849c',
    blush: 'rgba(244,140,165,0.45)',
  },
  doto: {
    fur: '#c8743c',
    shade: '#9a5226',
    outline: '#46271a',
    belly: '#f7e3c6',
    earInner: '#e8a27a',
    stripe: '#e8a066',
    eye: '#2a1a14',
    nose: '#5a3020',
    blush: 'rgba(240,150,110,0.4)',
  },
};

const GOLD = '#E0A84A';
const LINE = 3;
const CX = CELL / 2;

type View = 'front' | 'back' | 'side';

/** 한 칸의 움직임: 몸 들썩임, 왼·오른발 앞뒤(옆 포즈)·들림(앞뒤 포즈), 숨쉬기 세로 늘림 */
interface Phase {
  bob: number;
  stepA: number;
  stepB: number;
  breathe: number;
}

const IDLE: Phase[] = [0, 0.012, 0.024, 0.012].map((b) => ({ bob: 0, stepA: 0, stepB: 0, breathe: b }));
const WALK: Phase[] = [
  { bob: 0, stepA: 1, stepB: -1, breathe: 0 },
  { bob: -2.5, stepA: 0, stepB: 0, breathe: 0.01 },
  { bob: 0, stepA: -1, stepB: 1, breathe: 0 },
  { bob: -2.5, stepA: 0, stepB: 0, breathe: 0.01 },
];

/** 방향 → 포즈와 뒤집기 (대각선은 옆 포즈) */
function viewOf(d: Dir): { view: View; flip: boolean } {
  if (d === 's') return { view: 'front', flip: false };
  if (d === 'n') return { view: 'back', flip: false };
  return { view: 'side', flip: d === 'w' || d === 'sw' || d === 'nw' };
}

/** 칠하고, 그 안에만 그늘을 얹고, 외곽선 */
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

function eye(ctx: Ctx, c: Colors, x: number, y: number, k = 1): void {
  ellipse(ctx, x, y, 4.2 * k, 5.2 * k);
  ctx.fillStyle = c.eye;
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - 1.3 * k, y - 2 * k, 1.7 * k, 0, Math.PI * 2);
  ctx.fill();
}

function nose(ctx: Ctx, c: Colors, x: number, y: number, mouth = true): void {
  ctx.fillStyle = c.nose;
  ellipse(ctx, x, y, 2.6, 1.9);
  ctx.fill();
  if (!mouth) return;
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 3.4, y + 3);
  ctx.quadraticCurveTo(x - 1.7, y + 5.4, x, y + 2.2);
  ctx.quadraticCurveTo(x + 1.7, y + 5.4, x + 3.4, y + 3);
  ctx.stroke();
}

function blush(ctx: Ctx, c: Colors, pts: [number, number][]): void {
  ctx.fillStyle = c.blush;
  for (const [x, y] of pts) {
    ellipse(ctx, x, y, 4.4, 2.6);
    ctx.fill();
  }
}

function mintBow(ctx: Ctx, x: number, y: number): void {
  ctx.fillStyle = Palette.mint;
  ctx.strokeStyle = '#3f7d63';
  ctx.lineWidth = 1.8;
  for (const d of [-1, 1]) {
    ellipse(ctx, x + d * 5, y + d * -1, 5.6, 3.6, d * 0.45);
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function acorn(ctx: Ctx, c: Colors, x: number, y: number): void {
  part(ctx, c, el(ctx, x, y + 1, 5.4, 6.2), GOLD);
  ctx.fillStyle = '#7a4a26';
  ctx.beginPath();
  ctx.ellipse(x, y - 3, 6.4, 3.6, 0, Math.PI, 0);
  ctx.quadraticCurveTo(x, y - 0.6, x - 6.4, y - 3);
  ctx.fill();
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ellipse(ctx, x - 2, y + 1, 1.2, 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// 토리 (흰 토끼)
// ---------------------------------------------------------------------------

function toriFront(ctx: Ctx, c: Colors, p: Phase, back: boolean): void {
  const y0 = p.bob;
  // 발
  part(ctx, c, el(ctx, 55, 118 - Math.max(0, p.stepA) * 3, 8.5, 4.8), c.fur, el(ctx, 55, 121, 8, 2.5));
  part(ctx, c, el(ctx, 73, 118 - Math.max(0, p.stepB) * 3, 8.5, 4.8), c.fur, el(ctx, 73, 121, 8, 2.5));
  // 몸
  part(ctx, c, el(ctx, 64, 98 + y0, 19, 19), c.fur, el(ctx, 58, 108 + y0, 18, 10));
  if (!back) {
    ellipse(ctx, 64, 101 + y0, 10.5, 12);
    ctx.fillStyle = c.belly;
    ctx.fill();
  } else {
    // 동그란 꼬리
    part(ctx, c, () => starPath(ctx, 64, 106 + y0, 9, 7.5, 6.3), c.belly);
  }
  // 팔 (걸음에 맞춰 살짝 흔듦)
  part(ctx, c, el(ctx, 47, 97 + y0 + p.stepA * 1.5, 5, 7.5, 0.3), c.fur);
  part(ctx, c, el(ctx, 81, 97 + y0 + p.stepB * 1.5, 5, 7.5, -0.3), c.fur);
  // 귀 (머리 뒤)
  part(ctx, c, el(ctx, 54, 37 + y0, 7.5, 19, -0.16), c.fur, el(ctx, 50, 38 + y0, 4, 19, -0.16));
  part(ctx, c, el(ctx, 74, 37 + y0, 7.5, 19, 0.16), c.fur, el(ctx, 70, 38 + y0, 3, 19, 0.16));
  if (!back) {
    ctx.fillStyle = c.earInner;
    ellipse(ctx, 54.5, 40 + y0, 3.6, 13, -0.16);
    ctx.fill();
    ellipse(ctx, 73.5, 40 + y0, 3.6, 13, 0.16);
    ctx.fill();
  }
  // 머리
  part(ctx, c, el(ctx, 64, 68 + y0, 25, 21), c.fur, el(ctx, 58, 80 + y0, 22, 10));
  mintBow(ctx, back ? 52 : 76, 51 + y0);
  if (back) return;
  eye(ctx, c, 55, 68 + y0);
  eye(ctx, c, 73, 68 + y0);
  nose(ctx, c, 64, 76 + y0);
  blush(ctx, c, [
    [47, 77 + y0],
    [81, 77 + y0],
  ]);
}

function toriSide(ctx: Ctx, c: Colors, p: Phase): void {
  const y0 = p.bob;
  // 뒤쪽 발
  part(ctx, c, el(ctx, 54 - p.stepA * 6, 118, 10, 5), c.shade);
  // 동그란 꼬리
  part(ctx, c, () => starPath(ctx, 42, 102 + y0, 9, 7.5, 6.3), c.belly);
  // 뒷다리 허벅지·몸
  part(ctx, c, el(ctx, 54, 106 + y0, 13, 12), c.fur, el(ctx, 50, 114 + y0, 12, 6));
  part(ctx, c, el(ctx, 64, 98 + y0, 18, 18), c.fur, el(ctx, 58, 108 + y0, 16, 9));
  ellipse(ctx, 72, 101 + y0, 8, 11);
  ctx.fillStyle = c.belly;
  ctx.fill();
  // 앞쪽 발
  part(ctx, c, el(ctx, 72 + p.stepB * 6, 118, 9.5, 4.8), c.fur, el(ctx, 72 + p.stepB * 6, 121, 9, 2.4));
  // 귀 (뒤로 눕힘)
  part(ctx, c, el(ctx, 58, 40 + y0, 7, 18, -0.42), c.shade);
  part(ctx, c, el(ctx, 66, 37 + y0, 7.5, 19, -0.24), c.fur, el(ctx, 62, 38 + y0, 3.4, 19, -0.24));
  ctx.fillStyle = c.earInner;
  ellipse(ctx, 67, 40 + y0, 3.4, 13, -0.24);
  ctx.fill();
  // 머리
  part(ctx, c, el(ctx, 72, 68 + y0, 22, 20), c.fur, el(ctx, 64, 80 + y0, 18, 10));
  mintBow(ctx, 62, 52 + y0);
  // 팔
  part(ctx, c, el(ctx, 74 - p.stepA * 2, 100 + y0, 5, 7.5, -0.3), c.fur);
  eye(ctx, c, 81, 67 + y0);
  nose(ctx, c, 92, 74 + y0, false);
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(91, 77 + y0);
  ctx.quadraticCurveTo(89, 80 + y0, 86, 79 + y0);
  ctx.stroke();
  blush(ctx, c, [[80, 77 + y0]]);
}

// ---------------------------------------------------------------------------
// 도토 (다람쥐)
// ---------------------------------------------------------------------------

function dotoEars(ctx: Ctx, c: Colors, y0: number, inner: boolean, side = false): void {
  const ears: [number, number, number][] = side
    ? [[70, 0, 0]]
    : [
        [50, -1, 0],
        [78, 1, 0],
      ];
  for (const [x, d] of ears) {
    const tipX = side ? x - 2 : x + d * 2;
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(x - 8, 54 + y0);
      ctx.quadraticCurveTo(x - 6, 42 + y0, tipX, 34 + y0);
      ctx.quadraticCurveTo(x + 7, 42 + y0, x + 8, 54 + y0);
      ctx.closePath();
    };
    part(ctx, c, path, c.fur);
    if (inner) {
      ctx.fillStyle = c.earInner;
      ctx.beginPath();
      ctx.moveTo(x - 4, 52 + y0);
      ctx.quadraticCurveTo(x - 3, 44 + y0, tipX, 40 + y0);
      ctx.quadraticCurveTo(x + 3.5, 44 + y0, x + 4, 52 + y0);
      ctx.closePath();
      ctx.fill();
    }
    // 귀 끝 털
    ctx.strokeStyle = c.outline;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tipX, 34 + y0);
    ctx.lineTo(tipX - 2, 28 + y0);
    ctx.moveTo(tipX, 34 + y0);
    ctx.lineTo(tipX + 3, 29 + y0);
    ctx.stroke();
  }
}

/** 꼬리에 밝은 결을 넣는다 */
function tailStripe(ctx: Ctx, c: Colors, path: () => void, stroke: () => void): void {
  ctx.save();
  path();
  ctx.clip();
  ctx.strokeStyle = c.stripe;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  stroke();
  ctx.stroke();
  ctx.restore();
  path();
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = LINE;
  ctx.stroke();
}

function dotoFront(ctx: Ctx, c: Colors, p: Phase): void {
  const y0 = p.bob;
  const sway = p.stepA * 2;
  // 꼬리 (몸 뒤, 왼쪽 위로)
  const tail = () => {
    ctx.beginPath();
    ctx.moveTo(60, 114);
    ctx.bezierCurveTo(36, 112, 26, 92, 30, 72 + y0);
    ctx.bezierCurveTo(32, 56 + y0, 26 + sway, 44 + y0, 34 + sway, 34 + y0);
    ctx.bezierCurveTo(44 + sway, 24 + y0, 62 + sway, 30 + y0, 56 + sway, 44 + y0);
    ctx.bezierCurveTo(50, 54 + y0, 46, 72 + y0, 58, 96);
    ctx.closePath();
  };
  part(ctx, c, tail, c.fur, el(ctx, 30, 80, 12, 40));
  tailStripe(ctx, c, tail, () => {
    ctx.beginPath();
    ctx.moveTo(52, 104);
    ctx.bezierCurveTo(38, 96, 38, 70, 40, 58 + y0);
    ctx.bezierCurveTo(42, 48 + y0, 40 + sway, 42 + y0, 44 + sway, 38 + y0);
  });
  // 발
  part(ctx, c, el(ctx, 55, 118 - Math.max(0, p.stepA) * 3, 8, 4.6), c.shade);
  part(ctx, c, el(ctx, 73, 118 - Math.max(0, p.stepB) * 3, 8, 4.6), c.shade);
  // 몸
  part(ctx, c, el(ctx, 64, 99 + y0, 18, 18.5), c.fur, el(ctx, 58, 109 + y0, 17, 9));
  ellipse(ctx, 64, 102 + y0, 10.5, 12);
  ctx.fillStyle = c.belly;
  ctx.fill();
  dotoEars(ctx, c, y0, true);
  // 머리 + 크림 주둥이
  const head = el(ctx, 64, 70 + y0, 23, 20);
  part(ctx, c, head, c.fur, el(ctx, 58, 82 + y0, 20, 9));
  ctx.save();
  head();
  ctx.clip();
  ellipse(ctx, 64, 80 + y0, 13, 8.5);
  ctx.fillStyle = c.belly;
  ctx.fill();
  ctx.restore();
  head();
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = LINE;
  ctx.stroke();
  eye(ctx, c, 55, 69 + y0);
  eye(ctx, c, 73, 69 + y0);
  nose(ctx, c, 64, 77 + y0);
  blush(ctx, c, [
    [47, 78 + y0],
    [81, 78 + y0],
  ]);
  // 두 손에 든 황금 도토리
  acorn(ctx, c, 64, 96 + y0);
  part(ctx, c, el(ctx, 57, 98 + y0, 4.4, 5.2, 0.3), c.fur);
  part(ctx, c, el(ctx, 71, 98 + y0, 4.4, 5.2, -0.3), c.fur);
}

function dotoBack(ctx: Ctx, c: Colors, p: Phase): void {
  const y0 = p.bob;
  const sway = p.stepA * 2;
  // 발
  part(ctx, c, el(ctx, 55, 118 - Math.max(0, p.stepA) * 3, 8, 4.6), c.shade);
  part(ctx, c, el(ctx, 73, 118 - Math.max(0, p.stepB) * 3, 8, 4.6), c.shade);
  // 몸·팔
  part(ctx, c, el(ctx, 64, 99 + y0, 18, 18.5), c.fur, el(ctx, 58, 109 + y0, 17, 9));
  part(ctx, c, el(ctx, 46, 98 + y0 + p.stepA * 1.5, 4.6, 7, 0.3), c.fur);
  part(ctx, c, el(ctx, 82, 98 + y0 + p.stepB * 1.5, 4.6, 7, -0.3), c.fur);
  dotoEars(ctx, c, y0, false);
  part(ctx, c, el(ctx, 64, 70 + y0, 23, 20), c.fur, el(ctx, 58, 82 + y0, 20, 9));
  // 꼬리 (등 앞으로, 오른쪽 위에서 말림)
  const tail = () => {
    ctx.beginPath();
    ctx.moveTo(52, 116);
    ctx.bezierCurveTo(40, 100, 42, 80 + y0, 54, 66 + y0);
    ctx.bezierCurveTo(62, 56 + y0, 62 + sway, 40 + y0, 76 + sway, 36 + y0);
    ctx.bezierCurveTo(90 + sway, 34 + y0, 94 + sway, 50 + y0, 84 + sway, 54 + y0);
    ctx.bezierCurveTo(78, 56 + y0, 76, 52 + y0, 76, 50 + y0);
    ctx.bezierCurveTo(72, 62 + y0, 82, 74 + y0, 82, 90);
    ctx.bezierCurveTo(82, 104, 78, 114, 70, 118);
    ctx.closePath();
  };
  part(ctx, c, tail, c.fur, el(ctx, 80, 92, 10, 30));
  tailStripe(ctx, c, tail, () => {
    ctx.beginPath();
    ctx.moveTo(64, 110);
    ctx.bezierCurveTo(58, 96, 58, 80 + y0, 64, 70 + y0);
    ctx.bezierCurveTo(70, 58 + y0, 72 + sway, 46 + y0, 80 + sway, 42 + y0);
  });
}

function dotoSide(ctx: Ctx, c: Colors, p: Phase): void {
  const y0 = p.bob;
  const sway = p.stepA * 2;
  // 꼬리 (뒤, 왼쪽 위로 말림)
  const tail = () => {
    ctx.beginPath();
    ctx.moveTo(56, 112);
    ctx.bezierCurveTo(32, 112, 22, 88, 30, 68 + y0);
    ctx.bezierCurveTo(36, 52 + y0, 24 + sway, 42 + y0, 30 + sway, 32 + y0);
    ctx.bezierCurveTo(38 + sway, 18 + y0, 62 + sway, 20 + y0, 58 + sway, 36 + y0);
    ctx.bezierCurveTo(56, 44 + y0, 48, 42 + y0, 48, 38 + y0);
    ctx.bezierCurveTo(44, 54 + y0, 52, 66 + y0, 50, 82);
    ctx.bezierCurveTo(48, 94, 54, 102, 60, 104);
    ctx.closePath();
  };
  part(ctx, c, tail, c.fur, el(ctx, 28, 80, 10, 36));
  tailStripe(ctx, c, tail, () => {
    ctx.beginPath();
    ctx.moveTo(50, 106);
    ctx.bezierCurveTo(36, 100, 34, 82, 38, 68 + y0);
    ctx.bezierCurveTo(42, 54 + y0, 34 + sway, 40 + y0, 40 + sway, 32 + y0);
  });
  // 뒤쪽 발
  part(ctx, c, el(ctx, 56 - p.stepA * 6, 118, 9, 4.6), c.shade);
  // 몸
  part(ctx, c, el(ctx, 64, 99 + y0, 17, 18), c.fur, el(ctx, 58, 109 + y0, 15, 9));
  ellipse(ctx, 71, 102 + y0, 8, 11);
  ctx.fillStyle = c.belly;
  ctx.fill();
  // 앞쪽 발
  part(ctx, c, el(ctx, 72 + p.stepB * 6, 118, 9, 4.6), c.fur, el(ctx, 72 + p.stepB * 6, 121, 8, 2.2));
  dotoEars(ctx, c, y0, true, true);
  // 머리 + 크림 주둥이
  const head = el(ctx, 74, 70 + y0, 21, 19);
  part(ctx, c, head, c.fur, el(ctx, 66, 82 + y0, 16, 9));
  ctx.save();
  head();
  ctx.clip();
  ellipse(ctx, 88, 78 + y0, 10, 8);
  ctx.fillStyle = c.belly;
  ctx.fill();
  ctx.restore();
  head();
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = LINE;
  ctx.stroke();
  eye(ctx, c, 82, 68 + y0);
  nose(ctx, c, 94, 75 + y0, false);
  blush(ctx, c, [[80, 78 + y0]]);
  // 도토리를 든 손
  acorn(ctx, c, 80, 96 + y0);
  part(ctx, c, el(ctx, 76, 99 + y0, 4.4, 5.4, -0.3), c.fur);
}

// ---------------------------------------------------------------------------
// 연출: 잠듦(ko)·기절(stun)
// ---------------------------------------------------------------------------

function drawKo(ctx: Ctx, id: KeeperSpriteId, c: Colors): void {
  // 웅크려 잠든 모습 (옆으로 누움)
  if (id === 'doto') part(ctx, c, el(ctx, 42, 102, 18, 14, -0.2), c.fur, el(ctx, 38, 110, 16, 6));
  part(ctx, c, el(ctx, 62, 108, 26, 14), c.fur, el(ctx, 56, 116, 24, 6));
  if (id === 'tori') {
    part(ctx, c, () => starPath(ctx, 38, 106, 9, 7, 5.8), c.belly);
    // 뒤로 누운 긴 귀
    part(ctx, c, el(ctx, 68, 96, 18, 6, 0.18), c.fur, el(ctx, 66, 99, 16, 3, 0.18));
  } else {
    part(ctx, c, () => {
      ctx.beginPath();
      ctx.moveTo(76, 96);
      ctx.quadraticCurveTo(74, 86, 80, 80);
      ctx.quadraticCurveTo(88, 86, 90, 94);
      ctx.closePath();
    }, c.fur);
  }
  part(ctx, c, el(ctx, 84, 106, 16, 14), c.fur, el(ctx, 80, 114, 14, 5));
  // 감은 눈
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(88, 104, 3.4, 0.2, Math.PI - 0.2);
  ctx.stroke();
  blush(ctx, c, [[90, 110]]);
  // 작은 z
  ctx.strokeStyle = Palette.paper;
  ctx.lineWidth = 2;
  for (const [x, y, s] of [
    [98, 82, 5],
    [106, 72, 3.5],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + s, y);
    ctx.lineTo(x, y + s);
    ctx.lineTo(x + s, y + s);
    ctx.stroke();
  }
}

function drawStunStars(ctx: Ctx): void {
  ctx.fillStyle = Palette.amber;
  for (const [x, y] of [
    [48, 30],
    [64, 24],
    [80, 30],
  ]) {
    starPath(ctx, x, y, 5, 5, 2.2);
    ctx.fill();
  }
}

/** 한 칸 (128×128, 발끝 = FEET_Y) */
function drawCell(ctx: Ctx, id: KeeperSpriteId, view: View, p: Phase, flip: boolean): void {
  const c = COLORS[id];
  ctx.save();
  ctx.lineCap = 'round';
  if (flip) {
    ctx.translate(CELL, 0);
    ctx.scale(-1, 1);
  }
  // 숨쉬기: 발끝 기준 세로 늘림
  ctx.translate(CX, FEET_Y);
  ctx.scale(1 - p.breathe * 0.4, 1 + p.breathe);
  ctx.translate(-CX, -FEET_Y);
  if (id === 'tori') {
    if (view === 'side') toriSide(ctx, c, p);
    else toriFront(ctx, c, p, view === 'back');
  } else if (view === 'side') dotoSide(ctx, c, p);
  else if (view === 'back') dotoBack(ctx, c, p);
  else dotoFront(ctx, c, p);
  ctx.restore();
}

/** 시트 한 칸(번호 f)을 128 칸에 */
function drawFrame(ctx: Ctx, id: KeeperSpriteId, f: number): void {
  const row = Math.floor(f / LUMI_COLUMNS);
  const col = f % LUMI_COLUMNS;
  const dir = DIRS[row];
  if (!dir) {
    // 연출 줄: 0 = ko, 1 = stun
    if (col === 0) drawKo(ctx, id, COLORS[id]);
    else if (col === 1) {
      drawCell(ctx, id, 'front', IDLE[0], false);
      drawStunStars(ctx);
    }
    return;
  }
  const { view, flip } = viewOf(dir);
  const idle = col < LUMI_COLS.idle;
  const phase = idle ? IDLE[col % IDLE.length] : WALK[(col - LUMI_COLS.idle) % WALK.length];
  drawCell(ctx, id, view, phase, flip);
}

/** registry의 draw(디자인 64 칸)용 */
export function drawKeeperSpriteFrame(ctx: Ctx, id: KeeperSpriteId, f: number): void {
  ctx.save();
  ctx.scale(64 / CELL, 64 / CELL);
  drawFrame(ctx, id, f);
  ctx.restore();
}

/** 2배 해상도(128 칸) 시트 전체를 그린다 (registry의 build, buildRes 2) */
export async function buildKeeperSheet(id: KeeperSpriteId): Promise<HTMLCanvasElement> {
  const cv = document.createElement('canvas');
  cv.width = LUMI_COLUMNS * CELL;
  cv.height = LUMI_ROWS * CELL;
  const g = cv.getContext('2d') as CanvasRenderingContext2D;
  for (let f = 0; f < LUMI_COLUMNS * LUMI_ROWS; f++) {
    g.save();
    const x = (f % LUMI_COLUMNS) * CELL;
    const y = Math.floor(f / LUMI_COLUMNS) * CELL;
    g.beginPath();
    g.rect(x, y, CELL, CELL);
    g.clip();
    g.translate(x, y);
    drawFrame(g, id, f);
    g.restore();
  }
  return cv;
}

/** 루미와 같은 애니메이션 표를 `${id}-` 접두사로 */
export function keeperAnims(id: KeeperSpriteId): AnimDef[] {
  return lumiAnims().map((a) => ({ ...a, key: a.key.replace(/^lumi-/, `${id}-`) }));
}
