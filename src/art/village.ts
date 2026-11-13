// 밤 마을 그림 (플레이스홀더 아트). 오브젝트(집·나무뿌리·풀숲·바위·술통·깃발 줄·등불 기둥)는 각각 독립 에셋으로도 내보낸다(registry.ts).
// 공간감과 구도의 기준은 reference/ChatGPT-Images/달빛 숲의 등불지기 고양이.png:
// 살짝 기울여 내려다본 판석 광장(크고 불규칙한 돌, 금, 이끼), 벽면과 지붕 경사가 보이는 집, 툇마루·울타리·술통·깃발 줄,
// 큰 나무뿌리, 잎사귀와 보라 꽃, 먼 쪽(위)이 어두운 깊이감. 같은 모양을 '어둡게 / 빛을 받아' 두 번 칠한다.
// 색은 팔레트에서 섞은 값이고(제안: 기획서에 없음), 모양의 흔들림은 고정 seed라 매번 같다.
import { Rng } from '../core/rng';
import { GameData } from '../data';
import { mix } from './kit';

const W = GameData.game.viewport.width;
const H = GameData.game.viewport.height;

type Ctx = CanvasRenderingContext2D;
type P = [number, number];

export interface Tone {
  ground: string;
  stones: readonly string[];
  stoneHi: string;
  stoneLo: string;
  crack: string;
  moss: string;
  ring: string;
  wall: string;
  wallDark: string;
  plank: string;
  roof: string;
  roofHi: string;
  wood: string;
  woodDark: string;
  leaf: string;
  leafMid: string;
  leafDark: string;
  flower: string;
  flowerHi: string;
  trunk: string;
  trunkHi: string;
  rock: string;
  cloth: string;
  windowOff: string;
  shadow: string;
  /** 먼 쪽(위)을 덮는 어둠 */
  haze: number;
  vignette: number;
}

export const DARK: Tone = {
  ground: '#211d33',
  stones: ['#302b46', '#35304d', '#2b2741', '#332e4a', '#3a3451'],
  stoneHi: 'rgba(196,186,255,0.10)',
  stoneLo: 'rgba(8,6,20,0.35)',
  crack: 'rgba(14,12,28,0.7)',
  moss: '#273c3e',
  ring: '#4b4673',
  wall: '#3a2f45',
  wallDark: '#2a2236',
  plank: 'rgba(14,10,22,0.45)',
  roof: '#2c2740',
  roofHi: '#3b3452',
  wood: '#3b2d3a',
  woodDark: '#2a1f2b',
  leaf: '#2b4a4a',
  leafMid: '#223c3e',
  leafDark: '#182c31',
  flower: '#7d6fc0',
  flowerHi: '#a89cd9',
  trunk: '#2c2233',
  trunkHi: '#3c3045',
  rock: '#3c3854',
  cloth: '#3a3360',
  windowOff: '#1a1526',
  shadow: 'rgba(6,4,14,0.55)',
  haze: 0.6,
  vignette: 0.7,
};

export const LIT: Tone = {
  ground: '#4a2a16',
  stones: ['#a8683a', '#b5733f', '#9a5e34', '#ad6c3c', '#bd7c45'],
  stoneHi: 'rgba(255,214,140,0.5)',
  stoneLo: 'rgba(60,30,14,0.3)',
  crack: 'rgba(70,40,22,0.6)',
  moss: '#6b6a3c',
  ring: '#b98d5e',
  wall: '#946446',
  wallDark: '#714b33',
  plank: 'rgba(70,38,20,0.4)',
  roof: '#6c4733',
  roofHi: '#8a5d40',
  wood: '#8a5c3a',
  woodDark: '#694329',
  leaf: '#6f7a3e',
  leafMid: '#5c6834',
  leafDark: '#47522a',
  flower: '#d6aee6',
  flowerHi: '#f1d6f5',
  trunk: '#6b4630',
  trunkHi: '#8a5c3d',
  rock: '#8f735c',
  cloth: '#8a5a6a',
  windowOff: '#6a442c',
  shadow: 'rgba(40,20,10,0.4)',
  haze: 0,
  vignette: 0,
};

/** 콤보 단계마다 켜지는 마을 불빛. combo 0은 처음부터 켜져 있다 */
export interface VillageLight {
  kind: 'window' | 'lantern';
  x: number;
  y: number;
  w: number;
  h: number;
  combo: number;
}

export const VILLAGE_LIGHTS: readonly VillageLight[] = [
  { kind: 'window', x: 62, y: 128, w: 38, h: 38, combo: 0 },
  { kind: 'window', x: 512, y: 118, w: 30, h: 30, combo: 0 },
  { kind: 'window', x: 88, y: 822, w: 34, h: 44, combo: 0 },
  { kind: 'lantern', x: 112, y: 168, w: 18, h: 26, combo: 5 },
  { kind: 'lantern', x: 150, y: 790, w: 18, h: 26, combo: 10 },
  { kind: 'lantern', x: 500, y: 664, w: 18, h: 26, combo: 10 },
  { kind: 'lantern', x: 516, y: 346, w: 18, h: 26, combo: 20 },
  { kind: 'lantern', x: 24, y: 520, w: 18, h: 26, combo: 20 },
  { kind: 'lantern', x: 334, y: 150, w: 18, h: 26, combo: 30 },
];

// ---------------------------------------------------------------------------
// 판석 광장: 위로 갈수록 작고 납작해지는(기울인 시점) 불규칙한 판석
// ---------------------------------------------------------------------------

interface Flag {
  pts: P[];
  shade: number;
  crack: P[] | null;
  moss: P | null;
}

function inset(pts: P[], k: number): P[] {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
}

/**
 * 판석 격자. perspective면 한 화면 그림처럼 위로 갈수록 작고 납작해지고(홈·메뉴용),
 * 아니면 넓은 마을 전체에 고른 크기로 깐다(카메라가 따라다니는 플레이 마을).
 */
function buildFlags(W: number, H: number, perspective: boolean, seed: number): Flag[] {
  const rng = new Rng(seed);
  const rows: number[] = [];
  let y = -30;
  while (y < H + 60) {
    rows.push(y);
    // 넓은 마을은 행마다 높이를 달리해 격자처럼 보이지 않게
    y += perspective ? 26 + 30 * Math.max(0, y / H) : rng.range(34, 60);
  }
  const grid: P[][] = rows.map((ry) => {
    // 행마다 칸 크기가 다르면 위아래 점이 어긋나 돌이 비틀리므로 넓은 마을은 같은 칸 크기
    const depth = perspective ? 0.55 + 0.45 * Math.max(0, ry / H) : 1;
    const cell = 64 * depth;
    const row: P[] = [];
    for (let x = -cell; x < W + cell * 1.5; x += cell) {
      row.push([x + rng.range(-0.28, 0.28) * cell, ry + rng.range(-0.22, 0.22) * cell * 0.6]);
    }
    return row;
  });
  const flags: Flag[] = [];
  for (let r = 0; r < grid.length - 1; r++) {
    const top = grid[r];
    const bot = grid[r + 1];
    const n = Math.min(top.length, bot.length) - 1;
    for (let i = 0; i < n; i++) {
      const quad: P[] = [top[i], top[i + 1], bot[Math.min(i + 1, bot.length - 1)], bot[i]];
      // 가끔 두 개로 쪼갠 작은 돌
      const split = rng.chance(0.22);
      const parts: P[][] = split
        ? [
            [quad[0], quad[1], [(quad[1][0] + quad[2][0]) / 2, (quad[1][1] + quad[2][1]) / 2], [(quad[0][0] + quad[3][0]) / 2, (quad[0][1] + quad[3][1]) / 2]],
            [[(quad[0][0] + quad[3][0]) / 2, (quad[0][1] + quad[3][1]) / 2], [(quad[1][0] + quad[2][0]) / 2, (quad[1][1] + quad[2][1]) / 2], quad[2], quad[3]],
          ]
        : [quad];
      for (const part of parts) {
        const pts = inset(part, 0.9);
        const [a, b] = [pts[0], pts[2]];
        flags.push({
          pts,
          shade: rng.int(0, 4),
          crack: rng.chance(0.25)
            ? [
                [a[0] + (b[0] - a[0]) * 0.2, a[1] + (b[1] - a[1]) * 0.3],
                [a[0] + (b[0] - a[0]) * rng.range(0.4, 0.6), a[1] + (b[1] - a[1]) * rng.range(0.4, 0.6)],
                [a[0] + (b[0] - a[0]) * 0.75, a[1] + (b[1] - a[1]) * 0.7],
              ]
            : null,
          moss: rng.chance(0.35) ? pts[rng.int(0, pts.length - 1)] : null,
        });
      }
    }
  }
  return flags;
}

const FLAGS = buildFlags(W, H, true, 9137);

function roundedPoly(ctx: Ctx, pts: P[], r: number): void {
  ctx.beginPath();
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const a: P = [p1[0] + (p0[0] - p1[0]) * 0.18, p1[1] + (p0[1] - p1[1]) * 0.18];
    const b: P = [p1[0] + (p2[0] - p1[0]) * 0.18, p1[1] + (p2[1] - p1[1]) * 0.18];
    if (i === 0) ctx.moveTo(a[0], a[1]);
    else ctx.lineTo(a[0], a[1]);
    ctx.arcTo(p1[0], p1[1], b[0], b[1], r);
  }
  ctx.closePath();
}

function drawPlaza(ctx: Ctx, t: Tone): void {
  drawFlags(ctx, t, FLAGS, W, H);
  drawRing(ctx, t, 318, 640);
}

function drawFlags(ctx: Ctx, t: Tone, flags: readonly Flag[], W: number, H: number): void {
  ctx.fillStyle = t.ground;
  ctx.fillRect(0, 0, W, H);
  for (const f of flags) {
    roundedPoly(ctx, f.pts, 6);
    ctx.fillStyle = t.stones[f.shade];
    ctx.fill();
    // 위쪽 모서리에 빛, 아래쪽에 그늘 → 돌의 두께
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = t.stoneHi;
    ctx.beginPath();
    ctx.moveTo(f.pts[0][0], f.pts[0][1]);
    ctx.lineTo(f.pts[1][0], f.pts[1][1]);
    ctx.stroke();
    ctx.strokeStyle = t.stoneLo;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(f.pts[3][0], f.pts[3][1]);
    ctx.lineTo(f.pts[2][0], f.pts[2][1]);
    ctx.stroke();
    if (f.crack) {
      ctx.strokeStyle = t.crack;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      f.crack.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
  }
  // 돌 틈의 이끼
  ctx.fillStyle = t.moss;
  for (const f of flags) {
    if (!f.moss) continue;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.ellipse(f.moss[0] + (k - 1) * 4, f.moss[1] + (k % 2) * 2, 4.5 - k, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** 바닥에 새긴 둥근 돌 문양 (기울인 시점이라 납작한 타원) */
function drawRing(ctx: Ctx, t: Tone, cx: number, cy: number): void {
  ctx.save();
  ctx.strokeStyle = t.ring;
  ctx.globalAlpha = 0.8;
  for (const [rx, ry, lw] of [
    [92, 52, 6],
    [62, 35, 4],
    [30, 17, 3],
  ]) {
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = t.ring;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 12);
  ctx.lineTo(cx + 10, cy);
  ctx.lineTo(cx, cy + 12);
  ctx.lineTo(cx - 10, cy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 소품
// ---------------------------------------------------------------------------

function poly(ctx: Ctx, pts: P[]): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

function shadowed(ctx: Ctx, t: Tone, draw: () => void, dx = 6, dy = 8, blur = 12): void {
  ctx.save();
  ctx.shadowColor = t.shadow;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = dx;
  ctx.shadowOffsetY = dy;
  draw();
  ctx.restore();
}

/** 잎이 겹겹이 난 풀숲 + 보라 꽃 */
function foliage(ctx: Ctx, t: Tone, cx: number, cy: number, r: number, seed: number, flowers = 5): void {
  const rng = new Rng(seed);
  shadowed(ctx, t, () => {
    ctx.fillStyle = t.leafDark;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }, 3, 6, 10);
  const leaves = Math.round(r * 0.9);
  for (let i = 0; i < leaves; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = rng.range(0, r * 0.85);
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d * 0.7 - r * 0.1;
    const len = rng.range(7, 13) * (0.6 + (r / 60) * 0.5);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + rng.range(-0.6, 0.6));
    ctx.fillStyle = [t.leaf, t.leafMid, t.leafDark][rng.int(0, 2)];
    ctx.beginPath();
    ctx.ellipse(0, 0, len, len * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (let i = 0; i < flowers; i++) {
    const x = cx + rng.range(-r * 0.7, r * 0.7);
    const y = cy + rng.range(-r * 0.5, r * 0.4);
    ctx.fillStyle = t.flower;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = t.flowerHi;
    ctx.beginPath();
    ctx.arc(x, y, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function planks(ctx: Ctx, t: Tone, x0: number, x1: number, y0: number, y1: number, step = 13): void {
  ctx.strokeStyle = t.plank;
  ctx.lineWidth = 1.5;
  for (let x = x0 + step; x < x1; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.stroke();
  }
}

function shingles(ctx: Ctx, t: Tone, pts: P[], rows: number): void {
  // 지붕 면 위에 비늘 기와 줄
  ctx.save();
  poly(ctx, pts);
  ctx.clip();
  const ys = pts.map((p) => p[1]);
  const xs = pts.map((p) => p[0]);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  const step = (bottom - top) / rows;
  ctx.strokeStyle = t.roofHi;
  ctx.lineWidth = 2;
  for (let y = top + step; y < bottom; y += step) {
    ctx.beginPath();
    for (let x = Math.min(...xs) - 10; x < Math.max(...xs) + 10; x += 14) {
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 7, y + 6, x + 14, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function lanternPost(ctx: Ctx, t: Tone, x: number, top: number, bottom: number): void {
  shadowed(ctx, t, () => {
    ctx.fillStyle = t.woodDark;
    ctx.fillRect(x - 3, top, 6, bottom - top);
    ctx.fillRect(x - 12, top - 3, 24, 5);
  }, 4, 5, 6);
}

function windowFrame(ctx: Ctx, t: Tone, l: VillageLight): void {
  ctx.save();
  const round = l.w === l.h;
  ctx.fillStyle = t.woodDark;
  ctx.beginPath();
  if (round) ctx.arc(l.x, l.y, l.w / 2 + 3, 0, Math.PI * 2);
  else ctx.roundRect(l.x - l.w / 2 - 3, l.y - l.h / 2 - 3, l.w + 6, l.h + 6, [l.w / 2 + 3, l.w / 2 + 3, 3, 3]);
  ctx.fill();
  ctx.fillStyle = t.windowOff;
  ctx.beginPath();
  if (round) ctx.arc(l.x, l.y, l.w / 2 - 3, 0, Math.PI * 2);
  else ctx.roundRect(l.x - l.w / 2 + 3, l.y - l.h / 2 + 3, l.w - 6, l.h - 6, [l.w / 2 - 3, l.w / 2 - 3, 2, 2]);
  ctx.fill();
  ctx.strokeStyle = t.woodDark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(l.x, l.y - l.h / 2 + 2);
  ctx.lineTo(l.x, l.y + l.h / 2 - 2);
  ctx.moveTo(l.x - l.w / 2 + 2, l.y);
  ctx.lineTo(l.x + l.w / 2 - 2, l.y);
  ctx.stroke();
  ctx.restore();
}

function barrel(ctx: Ctx, t: Tone, x: number, y: number): void {
  shadowed(ctx, t, () => {
    ctx.fillStyle = t.wood;
    ctx.beginPath();
    ctx.roundRect(x - 15, y - 22, 30, 34, 8);
    ctx.fill();
  }, 4, 6, 8);
  ctx.fillStyle = t.woodDark;
  ctx.beginPath();
  ctx.ellipse(x, y - 22, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = t.woodDark;
  ctx.lineWidth = 2.5;
  for (const yy of [y - 12, y + 2]) {
    ctx.beginPath();
    ctx.moveTo(x - 15, yy);
    ctx.lineTo(x + 15, yy);
    ctx.stroke();
  }
}

function rock(ctx: Ctx, t: Tone, x: number, y: number, r: number): void {
  shadowed(ctx, t, () => {
    ctx.fillStyle = t.rock;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.35, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }, 3, 5, 6);
  ctx.strokeStyle = t.stoneHi;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.2, r * 0.85, 0, Math.PI * 1.1, Math.PI * 1.8);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// 가장자리 오브젝트 (레퍼런스의 배치: 위 왼쪽 툇마루 집, 위 오른쪽 옆집, 위쪽 숲,
// 왼쪽·오른쪽 풀숲과 등불 기둥, 아래 왼쪽 큰 지붕 집과 깃발 줄, 아래 오른쪽 큰 나무뿌리).
// 집·나무처럼 자리가 정해진 것은 마을 좌표로 그리고, 에셋으로 내보낼 때 bounds만큼 잘라 낸다.
// ---------------------------------------------------------------------------

/** 위 왼쪽 집: 벽면(약간 기운 사다리꼴) + 처마 + 툇마루 + 난간 + 등불 기둥 */
function housePorch(ctx: Ctx, t: Tone): void {
  const wall: P[] = [
    [-10, 58],
    [150, 70],
    [150, 196],
    [-10, 206],
  ];
  shadowed(ctx, t, () => {
    ctx.fillStyle = t.wall;
    poly(ctx, wall);
    ctx.fill();
  });
  ctx.save();
  poly(ctx, wall);
  ctx.clip();
  planks(ctx, t, -10, 150, 50, 210);
  ctx.restore();
  const roof: P[] = [
    [-10, 20],
    [170, 34],
    [158, 74],
    [-10, 62],
  ];
  ctx.fillStyle = t.roof;
  poly(ctx, roof);
  ctx.fill();
  shingles(ctx, t, roof, 3);
  const deck: P[] = [
    [-10, 204],
    [152, 194],
    [206, 238],
    [-10, 262],
  ];
  shadowed(ctx, t, () => {
    ctx.fillStyle = t.wood;
    poly(ctx, deck);
    ctx.fill();
  }, 4, 8, 10);
  ctx.save();
  poly(ctx, deck);
  ctx.clip();
  ctx.strokeStyle = t.plank;
  ctx.lineWidth = 1.5;
  for (let k = 1; k < 5; k++) {
    ctx.beginPath();
    ctx.moveTo(-10, 204 + k * 12);
    ctx.lineTo(220, 194 + k * 11);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = t.woodDark;
  for (let k = 0; k <= 6; k++) ctx.fillRect(-4 + k * 34, 262 - k * 4.5 - 24, 5, 26);
  ctx.strokeStyle = t.woodDark;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-10, 242);
  ctx.lineTo(212, 214);
  ctx.stroke();
  lanternPost(ctx, t, 128, 150, 196);
  windowFrame(ctx, t, VILLAGE_LIGHTS[0]);
}

/** 술통과 깃발 */
function barrelBanner(ctx: Ctx, t: Tone): void {
  barrel(ctx, t, 214, 262);
  ctx.fillStyle = t.woodDark;
  ctx.fillRect(236, 208, 4, 60);
  ctx.fillStyle = t.cloth;
  poly(ctx, [
    [240, 212],
    [266, 212],
    [266, 246],
    [253, 238],
    [240, 246],
  ]);
  ctx.fill();
}

/** 위 오른쪽 옆집 */
function houseSide(ctx: Ctx, t: Tone): void {
  const wall: P[] = [
    [470, 50],
    [560, 40],
    [560, 186],
    [478, 196],
  ];
  shadowed(ctx, t, () => {
    ctx.fillStyle = t.wall;
    poly(ctx, wall);
    ctx.fill();
  }, -6, 8);
  ctx.save();
  poly(ctx, wall);
  ctx.clip();
  planks(ctx, t, 470, 560, 40, 200);
  ctx.restore();
  windowFrame(ctx, t, VILLAGE_LIGHTS[1]);
}

/** 아래 오른쪽 큰 나무: 줄기와 화면 안쪽으로 뻗은 뿌리, 등불을 매단 가지 */
function treeRoots(ctx: Ctx, t: Tone): void {
  shadowed(ctx, t, () => {
    ctx.fillStyle = t.trunk;
    ctx.beginPath();
    ctx.moveTo(560, 590);
    ctx.quadraticCurveTo(470, 620, 452, 700);
    ctx.quadraticCurveTo(436, 780, 372, 850);
    ctx.quadraticCurveTo(330, 900, 318, 970);
    ctx.lineTo(560, 970);
    ctx.closePath();
    ctx.fill();
  }, -6, 8, 14);
  ctx.strokeStyle = t.trunk;
  ctx.lineCap = 'round';
  for (const [w, pts] of [
    [14, [[470, 760], [400, 790], [350, 860]]],
    [9, [[440, 830], [380, 870], [356, 940]]],
    [8, [[500, 700], [460, 690], [420, 720]]],
  ] as [number, P[]][]) {
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
    ctx.stroke();
  }
  ctx.strokeStyle = t.trunkHi;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(548, 620);
  ctx.quadraticCurveTo(478, 650, 466, 720);
  ctx.stroke();
  ctx.strokeStyle = t.trunk;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(540, 630);
  ctx.quadraticCurveTo(512, 632, 500, 646);
  ctx.stroke();
}

/** 아래 왼쪽 집: 화면 안쪽으로 기운 큰 지붕 + 벽 */
function houseRoof(ctx: Ctx, t: Tone): void {
  const roof: P[] = [
    [-10, 610],
    [150, 652],
    [270, 748],
    [246, 772],
    [-10, 772],
  ];
  shadowed(ctx, t, () => {
    ctx.fillStyle = t.roof;
    poly(ctx, roof);
    ctx.fill();
  }, 4, -6, 12);
  shingles(ctx, t, roof, 6);
  ctx.strokeStyle = t.woodDark;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(150, 652);
  ctx.lineTo(270, 748);
  ctx.stroke();
  const wall: P[] = [
    [-10, 772],
    [246, 772],
    [252, 970],
    [-10, 970],
  ];
  ctx.fillStyle = t.wall;
  poly(ctx, wall);
  ctx.fill();
  ctx.save();
  poly(ctx, wall);
  ctx.clip();
  planks(ctx, t, -10, 252, 772, 970, 15);
  ctx.restore();
  ctx.fillStyle = t.wallDark;
  ctx.fillRect(-10, 772, 262, 8);
  windowFrame(ctx, t, VILLAGE_LIGHTS[2]);
}

/** 깃발 줄 */
function bunting(ctx: Ctx, t: Tone): void {
  ctx.strokeStyle = t.woodDark;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(176, 770);
  ctx.quadraticCurveTo(232, 800, 300, 786);
  ctx.stroke();
  ctx.fillStyle = t.cloth;
  for (const [x, y] of [
    [198, 783],
    [226, 792],
    [256, 793],
    [284, 789],
  ]) {
    poly(ctx, [
      [x - 8, y - 2],
      [x + 8, y - 2],
      [x + 8, y + 16],
      [x, y + 11],
      [x - 8, y + 16],
    ]);
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// 오두막 3종 (2026-11-13 라이언: 마을 곳곳에 집). 마을 안 장애물로 세우는 독립 그림이다
// (data/map.json kind 'house' + variant → entities/MapProps.ts placeHouse가 그림 아래 가운데를 판정 사각형 밑변 + 6에 세움).
// 살짝 기울여 내려다본 2.5D: 정면 벽(높이 그대로) + 위에서 보이는 지붕 면(깊이도 화면 위로 같은 길이).
// 판정 사각형(밑동 폭 140~160, 깊이 60)에 맞춰 벽 밑변 폭 ≈ 판정 폭, 지붕 깊이 ≈ 60 + 처마.
// 그림 아래 끝 = 땅에 닿는 곳(벽 밑 gy + 접지 그림자 6). 그림자는 아래로만 드리워 좌우로 뒤집어도(flip) 어색하지 않다.
// 창은 두 톤 모두 호박빛(어둠 속 따뜻한 불빛)이고 자리는 COTTAGE_WINDOWS로 내보내 게임이 빛을 얹는다.
// 모양·색은 제안(기획서에 없음): 0 = 둥근 창·굴뚝·문간 등불, 1 = 좁고 높은 두 창·차양·꽃상자·연통, 2 = 넓은 집·문간 지붕·디딤돌·상자·매단 등불
// ---------------------------------------------------------------------------

const AMBER = '#FFC857';
const AMBER_SOFT = '#F2B880';
const AMBER_HOT = '#FFEBB8';
const GLOW = (a: number): string => `rgba(255,200,87,${a})`;

interface CottageWindow {
  x: number;
  y: number;
  w: number;
  h: number;
  shape: 'round' | 'arch' | 'square';
}

interface CottageSpec {
  /** 그림 크기 */
  w: number;
  h: number;
  /** 벽 밑(땅) y. 그림 아래 끝보다 6 위 */
  gy: number;
  windows: readonly CottageWindow[];
  /** 등불 유리 가운데 */
  lamps: readonly P[];
}

const COTTAGES: readonly CottageSpec[] = [
  {
    w: 204,
    h: 228,
    gy: 222,
    windows: [
      { x: 140, y: 174, w: 30, h: 30, shape: 'round' },
      { x: 102, y: 114, w: 18, h: 18, shape: 'round' },
    ],
    lamps: [[39, 162]],
  },
  {
    w: 190,
    h: 236,
    gy: 230,
    windows: [
      { x: 51, y: 170, w: 24, h: 30, shape: 'arch' },
      { x: 139, y: 170, w: 24, h: 30, shape: 'arch' },
    ],
    lamps: [],
  },
  {
    w: 224,
    h: 230,
    gy: 224,
    windows: [
      { x: 58, y: 172, w: 30, h: 28, shape: 'square' },
      { x: 168, y: 172, w: 30, h: 28, shape: 'square' },
    ],
    lamps: [[140, 175]],
  },
];

/** 오두막 창 가운데: 그림 아래 가운데 기준(y는 위가 음수). 좌우로 뒤집어 세우면 x 부호를 바꿔 쓴다 */
export const COTTAGE_WINDOWS: readonly (readonly { x: number; y: number }[])[] = COTTAGES.map((c) =>
  c.windows.map((w) => ({ x: w.x - c.w / 2, y: w.y - c.h })),
);

/** 오두막 등불(문간 등불·매단 등불) 유리 가운데: COTTAGE_WINDOWS와 같은 기준 */
export const COTTAGE_LAMPS: readonly (readonly { x: number; y: number }[])[] = COTTAGES.map((c) =>
  c.lamps.map(([x, y]) => ({ x: x - c.w / 2, y: y - c.h })),
);

/** rgba 색의 투명한 끝 (그라데이션용) */
function clearOf(rgba: string): string {
  return rgba.replace(/[\d.]+\)\s*$/, '0)');
}

function withClip(ctx: Ctx, pts: P[], draw: () => void): void {
  ctx.save();
  poly(ctx, pts);
  ctx.clip();
  draw();
  ctx.restore();
}

function polyline(ctx: Ctx, pts: P[]): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
}

/** 땅에 닿는 부드러운 그림자: 벽 밑 gy를 가운데로 위아래 ry (그림 아래 끝을 넘지 않음) */
function groundShadow(ctx: Ctx, t: Tone, x0: number, x1: number, gy: number, ry = 6): void {
  const rx = (x1 - x0) / 2;
  ctx.save();
  ctx.translate((x0 + x1) / 2, gy);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, t.shadow);
  g.addColorStop(0.8, t.shadow);
  g.addColorStop(1, clearOf(t.shadow));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 판자벽: 세로 판자 또는 가로 비늘판, 땅 쪽은 조금 어둡게 */
function boardWall(ctx: Ctx, t: Tone, pts: P[], color: string, kind: 'vertical' | 'clapboard', step: number): void {
  ctx.fillStyle = color;
  poly(ctx, pts);
  ctx.fill();
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  withClip(ctx, pts, () => {
    if (kind === 'vertical') {
      planks(ctx, t, x0, x1, y0, y1, step);
    } else {
      for (let y = y1 - step; y > y0; y -= step) {
        ctx.strokeStyle = t.plank;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.stroke();
        ctx.strokeStyle = t.stoneHi;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x0, y + 1.6);
        ctx.lineTo(x1, y + 1.6);
        ctx.stroke();
      }
    }
    const g = ctx.createLinearGradient(0, y1 - 44, 0, y1);
    g.addColorStop(0, clearOf(t.stoneLo));
    g.addColorStop(1, t.stoneLo);
    ctx.fillStyle = g;
    ctx.fillRect(x0, y1 - 44, x1 - x0, 44);
  });
}

/** 처마가 벽에 드리우는 그늘: 지붕 앞 선을 조금 내려 벽 안에만 */
function eaveShade(ctx: Ctx, t: Tone, wall: P[], edge: P[], drop = 6, width = 12): void {
  withClip(ctx, wall, () => {
    ctx.strokeStyle = t.stoneLo;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    polyline(
      ctx,
      edge.map(([x, y]): P => [x, y + drop]),
    );
    ctx.stroke();
  });
}

/** 벽 밑 주춧돌 (rows줄) */
function foundation(ctx: Ctx, t: Tone, x0: number, x1: number, gy: number, h: number, seed: number, rows = 1): void {
  const rng = new Rng(seed);
  ctx.fillStyle = t.stones[2];
  ctx.fillRect(x0, gy - h * rows, x1 - x0, h * rows);
  for (let r = 0; r < rows; r++) {
    const top = gy - h * (r + 1);
    let x = x0 - (r % 2 ? 8 : 0);
    while (x < x1) {
      const w = rng.range(13, 22);
      const a = Math.max(x, x0) + 1;
      const b = Math.min(x + w, x1) - 1;
      if (b - a > 3) {
        ctx.fillStyle = t.stones[rng.int(0, 4)];
        ctx.beginPath();
        ctx.roundRect(a, top + 1, b - a, h - 2, 3);
        ctx.fill();
        ctx.fillStyle = t.stoneHi;
        ctx.fillRect(a + 2, top + 1, b - a - 4, 1.5);
      }
      x += w;
    }
  }
}

function windowPath(ctx: Ctx, shape: CottageWindow['shape'], cx: number, cy: number, rw: number, rh: number): void {
  ctx.beginPath();
  if (shape === 'round') ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
  else if (shape === 'arch') ctx.roundRect(cx - rw, cy - rh, rw * 2, rh * 2, [rw, rw, 2, 2]);
  else ctx.roundRect(cx - rw, cy - rh, rw * 2, rh * 2, 2);
}

/** 창·등불 둘레 벽에 번지는 불빛 (벽 안에만) */
function wallGlow(ctx: Ctx, wall: P[], spots: readonly { x: number; y: number; r: number }[]): void {
  withClip(ctx, wall, () => {
    for (const s of spots) {
      const g = ctx.createRadialGradient(s.x, s.y, s.r * 0.25, s.x, s.y, s.r);
      g.addColorStop(0, GLOW(0.32));
      g.addColorStop(1, GLOW(0));
      ctx.fillStyle = g;
      ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
    }
  });
}

/** 호박빛 창: 나무틀 + 빛나는 유리 + 십자 창살 (+ 창턱) */
function glowWindow(ctx: Ctx, t: Tone, win: CottageWindow, sill = true): void {
  const { x, y, w, h, shape } = win;
  ctx.fillStyle = t.woodDark;
  windowPath(ctx, shape, x, y, w / 2 + 3.5, h / 2 + 3.5);
  ctx.fill();
  const g = ctx.createRadialGradient(x - w * 0.12, y + h * 0.12, 1, x, y, Math.max(w, h) * 0.72);
  g.addColorStop(0, AMBER_HOT);
  g.addColorStop(0.5, AMBER);
  g.addColorStop(1, AMBER_SOFT);
  ctx.fillStyle = g;
  windowPath(ctx, shape, x, y, w / 2, h / 2);
  ctx.fill();
  ctx.save();
  windowPath(ctx, shape, x, y, w / 2, h / 2);
  ctx.clip();
  // 틀의 깊이: 유리 위쪽에 얇은 그늘
  ctx.fillStyle = 'rgba(122,62,22,0.28)';
  ctx.fillRect(x - w / 2, y - h / 2, w, 3.5);
  ctx.strokeStyle = t.woodDark;
  ctx.lineWidth = 2.4;
  const midY = shape === 'arch' ? y + h * 0.06 : y;
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2);
  ctx.lineTo(x, y + h / 2);
  ctx.moveTo(x - w / 2, midY);
  ctx.lineTo(x + w / 2, midY);
  ctx.stroke();
  ctx.restore();
  if (sill && shape !== 'round') {
    ctx.fillStyle = t.woodDark;
    ctx.fillRect(x - w / 2 - 6, y + h / 2 + 2, w + 12, 5);
    ctx.fillStyle = t.stoneHi;
    ctx.fillRect(x - w / 2 - 6, y + h / 2 + 2, w + 12, 1.5);
  }
}

/** 아치 문: 틀 + 판자 + 손잡이, 문 밑 틈으로 새는 불빛 (peek = 문에 난 작은 둥근 창) */
function cottageDoor(ctx: Ctx, t: Tone, cx: number, gy: number, w: number, h: number, peek = false): void {
  const r = w / 2;
  ctx.fillStyle = t.woodDark;
  ctx.beginPath();
  ctx.roundRect(cx - r - 4, gy - h - 4, w + 8, h + 4, [r + 4, r + 4, 0, 0]);
  ctx.fill();
  ctx.fillStyle = t.wood;
  ctx.beginPath();
  ctx.roundRect(cx - r, gy - h, w, h, [r, r, 0, 0]);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cx - r, gy - h, w, h, [r, r, 0, 0]);
  ctx.clip();
  planks(ctx, t, cx - r, cx + r, gy - h, gy, 7);
  const g = ctx.createLinearGradient(0, gy - h, 0, gy - h + 16);
  g.addColorStop(0, t.stoneLo);
  g.addColorStop(1, clearOf(t.stoneLo));
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, gy - h, w, 16);
  ctx.fillStyle = GLOW(0.85);
  ctx.fillRect(cx - r + 2, gy - 2.5, w - 4, 2);
  if (peek) {
    ctx.fillStyle = t.woodDark;
    ctx.beginPath();
    ctx.arc(cx, gy - h + r + 4, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = AMBER;
    ctx.beginPath();
    ctx.arc(cx, gy - h + r + 4, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#C99A4E';
  ctx.beginPath();
  ctx.arc(cx + r * 0.55, gy - h * 0.44, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

/** 문 앞 디딤돌: 윗면 + 앞면 (땅보다 4 앞으로) */
function doorStep(ctx: Ctx, t: Tone, cx: number, gy: number, w: number): void {
  ctx.fillStyle = t.stones[1];
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, gy - 1, w, 5, 2);
  ctx.fill();
  ctx.fillStyle = t.stones[4];
  ctx.beginPath();
  ctx.roundRect(cx - w / 2 + 1, gy - 5, w - 2, 5, 2);
  ctx.fill();
  ctx.fillStyle = t.stoneHi;
  ctx.fillRect(cx - w / 2 + 3, gy - 5, w - 6, 1.5);
}

/**
 * 지붕 면: 칠한 뒤 처마(o → o+u)와 나란한 비늘 기와 줄을 깊이 방향(v, 화면 위)으로 rows줄,
 * 뒤쪽(용마루 쪽)은 조금 어둡게
 */
function roofFace(ctx: Ctx, t: Tone, pts: P[], color: string, o: P, u: P, v: P, rows: number): void {
  ctx.fillStyle = color;
  poly(ctx, pts);
  ctx.fill();
  withClip(ctx, pts, () => {
    const len = Math.hypot(u[0], u[1]);
    const [ux, uy] = [u[0] / len, u[1] / len];
    const vl = Math.hypot(v[0], v[1]);
    const [vx, vy] = [v[0] / vl, v[1] / vl];
    const tile = 13;
    const row = (j: number, off: number): void => {
      const f = (j + 0.35) / rows;
      const shift = j % 2 ? tile / 2 : 0;
      const bx = o[0] + v[0] * f - ux * (tile * 2 + shift) - vx * off;
      const by = o[1] + v[1] * f - uy * (tile * 2 + shift) - vy * off;
      ctx.beginPath();
      for (let s = 0; s < len + tile * 4; s += tile) {
        const ax = bx + ux * s;
        const ay = by + uy * s;
        // 기와 아래 끝은 처마 쪽(-v)으로 볼록
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(ax + (ux * tile) / 2 - vx * 6, ay + (uy * tile) / 2 - vy * 6, ax + ux * tile, ay + uy * tile);
      }
      ctx.stroke();
    };
    for (let j = 0; j < rows; j++) {
      // 기와 끝 아래 그늘 → 밝은 끝선: 겹친 기와의 두께
      ctx.strokeStyle = t.stoneLo;
      ctx.lineWidth = 2.6;
      row(j, 2);
      ctx.strokeStyle = t.roofHi;
      ctx.lineWidth = 1.8;
      row(j, 0);
    }
    const g = ctx.createLinearGradient(o[0], o[1], o[0] + v[0], o[1] + v[1]);
    g.addColorStop(0, clearOf(t.stoneLo));
    g.addColorStop(1, t.stoneLo);
    ctx.fillStyle = g;
    poly(ctx, pts);
    ctx.fill();
  });
}

/** 나무 테두리 선 (처마 끝·용마루) + 위에 밝은 한 줄 */
function trim(ctx: Ctx, t: Tone, pts: P[], width: number, hi = true): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = t.woodDark;
  ctx.lineWidth = width;
  polyline(ctx, pts);
  ctx.stroke();
  if (hi) {
    ctx.strokeStyle = t.roofHi;
    ctx.lineWidth = 1.4;
    polyline(
      ctx,
      pts.map(([x, y]): P => [x, y - width / 2 + 0.8]),
    );
    ctx.stroke();
  }
}

/** 지붕 뒤 가장자리에 걸리는 달빛 */
function moonRim(ctx: Ctx, t: Tone, pts: P[]): void {
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = t.flowerHi;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  polyline(ctx, pts);
  ctx.stroke();
  ctx.restore();
}

/** 돌 굴뚝: 앞면(밑변은 지붕 면을 따라 기욺) + 갓 + 윗면(연기 구멍) */
function chimney(ctx: Ctx, t: Tone, x: number, w: number, top: number, baseL: number, baseR: number, depth: number): void {
  const front: P[] = [
    [x, top],
    [x + w, top],
    [x + w, baseR],
    [x, baseL],
  ];
  ctx.fillStyle = t.rock;
  poly(ctx, front);
  ctx.fill();
  withClip(ctx, front, () => {
    ctx.strokeStyle = t.stoneLo;
    ctx.lineWidth = 1.5;
    for (let y = top + 8, k = 0; y < Math.max(baseL, baseR); y += 8, k++) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      const jx = x + (k % 2 ? w * 0.35 : w * 0.68);
      ctx.moveTo(jx, y - 8);
      ctx.lineTo(jx, y);
      ctx.stroke();
    }
    ctx.fillStyle = t.stoneHi;
    ctx.fillRect(x, top, 2.5, Math.max(baseL, baseR) - top);
  });
  // 갓과 윗면
  ctx.fillStyle = t.woodDark;
  ctx.fillRect(x - 3, top - 1, w + 6, 5);
  ctx.fillStyle = t.stones[4];
  ctx.fillRect(x - 3, top - 1 - depth, w + 6, depth);
  ctx.fillStyle = '#120e1c';
  ctx.beginPath();
  ctx.roundRect(x + 2, top - depth + 1.5, w - 4, depth - 4, 2);
  ctx.fill();
}

/** 작은 등불 (문간·처마에 매닮): 갓 + 호박빛 유리 + 받침 */
function cottageLantern(ctx: Ctx, t: Tone, cx: number, cy: number): void {
  ctx.fillStyle = t.woodDark;
  poly(ctx, [
    [cx - 7.5, cy - 8],
    [cx + 7.5, cy - 8],
    [cx + 4, cy - 13],
    [cx - 4, cy - 13],
  ]);
  ctx.fill();
  ctx.fillRect(cx - 1.5, cy - 16, 3, 3);
  const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 9);
  g.addColorStop(0, '#FFF6DA');
  g.addColorStop(0.55, AMBER);
  g.addColorStop(1, AMBER_SOFT);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(cx - 5, cy - 8, 10, 14, 2);
  ctx.fill();
  ctx.strokeStyle = t.woodDark;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 8);
  ctx.lineTo(cx, cy + 6);
  ctx.stroke();
  ctx.fillStyle = t.woodDark;
  ctx.fillRect(cx - 6, cy + 6, 12, 3);
}

/** 창 아래 꽃상자: 잎과 보라 꽃 */
function flowerBox(ctx: Ctx, t: Tone, cx: number, y: number, w: number, seed: number): void {
  const rng = new Rng(seed);
  for (let i = 0; i < 9; i++) {
    const x = cx - w / 2 + 3 + (i / 8) * (w - 6) + rng.range(-1.5, 1.5);
    ctx.fillStyle = [t.leaf, t.leafMid, t.leafDark][rng.int(0, 2)];
    ctx.beginPath();
    ctx.ellipse(x, y - 2 - rng.range(0, 3), rng.range(3.5, 5.5), rng.range(2.2, 3.2), rng.range(-0.8, 0.8), 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 4; i++) {
    const x = cx - w / 2 + 6 + (i / 3) * (w - 12) + rng.range(-1, 1);
    const fy = y - 5 - rng.range(0, 3);
    ctx.fillStyle = t.flower;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 2.2, fy + Math.sin(a) * 2.2, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = t.flowerHi;
    ctx.beginPath();
    ctx.arc(x, fy, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = t.wood;
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, y, w, 9, 2);
  ctx.fill();
  ctx.fillStyle = t.woodDark;
  ctx.fillRect(cx - w / 2, y, w, 2);
  ctx.fillRect(cx - w / 2, y + 7, w, 2);
}

/** 문 위 천 차양: 벽에 붙은 위는 좁고 앞으로 내민 아래는 넓게, 줄무늬, 아래 끝은 물결 */
function awning(ctx: Ctx, t: Tone, cx: number, top: number, bottom: number, w: number): void {
  const half = w / 2;
  const n = 5;
  const step = (w + 4) / n;
  const shape = (): void => {
    ctx.beginPath();
    ctx.moveTo(cx - half + 5, top);
    ctx.lineTo(cx + half - 5, top);
    ctx.lineTo(cx + half + 2, bottom);
    for (let i = 0; i < n; i++) {
      const x0 = cx + half + 2 - i * step;
      ctx.quadraticCurveTo(x0 - step / 2, bottom + 6, x0 - step, bottom);
    }
    ctx.closePath();
  };
  // 벽에 드리운 그늘
  ctx.fillStyle = t.stoneLo;
  ctx.fillRect(cx - half + 2, bottom, w - 4, 7);
  ctx.fillStyle = t.cloth;
  shape();
  ctx.fill();
  ctx.save();
  shape();
  ctx.clip();
  ctx.fillStyle = mix(t.cloth, t.flowerHi, 0.3);
  for (let i = 0; i < n; i += 2) {
    const x0 = cx - half - 2 + i * step;
    poly(ctx, [
      [x0 + 3, top],
      [x0 + step - 1, top],
      [x0 + step + 1, bottom + 8],
      [x0 - 1, bottom + 8],
    ]);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = t.woodDark;
  ctx.fillRect(cx - half + 3, top - 2, w - 6, 3);
}

/** 나무 상자: 앞면 + 윗면, 테두리 판자와 빗장 */
function crate(ctx: Ctx, t: Tone, x: number, bottom: number, w: number, h: number, depth: number): void {
  groundShadow(ctx, t, x - 3, x + w + 3, bottom, 2);
  const top = bottom - h;
  ctx.fillStyle = mix(t.wood, t.flowerHi, 0.12);
  ctx.fillRect(x, top - depth, w, depth);
  ctx.strokeStyle = t.plank;
  ctx.lineWidth = 1.2;
  for (let k = 1; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(x, top - (depth * k) / 3);
    ctx.lineTo(x + w, top - (depth * k) / 3);
    ctx.stroke();
  }
  ctx.fillStyle = t.wood;
  ctx.fillRect(x, top, w, h);
  ctx.strokeStyle = t.woodDark;
  ctx.lineWidth = 2.4;
  ctx.strokeRect(x + 1.2, top + 1.2, w - 2.4, h - 2.4);
  ctx.beginPath();
  ctx.moveTo(x + 2, top + 2);
  ctx.lineTo(x + w - 2, bottom - 2);
  ctx.stroke();
  ctx.fillStyle = t.stoneHi;
  ctx.fillRect(x, top - depth, w, 1.2);
}

/** 0: 둥근 창 오두막 — 앞을 향한 박공(세모 벽), 둥근 창 둘, 문간 등불, 돌 굴뚝 */
function cottage0(ctx: Ctx, t: Tone): void {
  const c = COTTAGES[0];
  const { gy } = c;
  const cx = 102;
  const L = 24;
  const R = 180;
  const s = 54 / 78; // 박공 경사
  const apex: P = [cx, 79];
  const edgeY = (x: number): number => apex[1] + Math.abs(x - cx) * s;
  const eaveL: P = [8, edgeY(8)];
  const eaveR: P = [196, edgeY(196)];
  const D = 64; // 지붕 깊이 (판정 깊이 60 + 처마)
  const roof = mix(t.roof, t.ring, 0.42);
  const wall: P[] = [[L, gy], [R, gy], [R, edgeY(R)], apex, [L, edgeY(L)]];

  groundShadow(ctx, t, L - 12, R + 12, gy);
  boardWall(ctx, t, wall, t.wall, 'vertical', 12);
  // 박공(위 세모)은 가로 비늘판 + 띠 나무
  const gable: P[] = [[L, 142], [R, 142], [R, edgeY(R)], apex, [L, edgeY(L)]];
  boardWall(ctx, t, gable, mix(t.wall, t.roof, 0.35), 'clapboard', 8);
  ctx.fillStyle = t.woodDark;
  ctx.fillRect(L, 140, R - L, 5);
  foundation(ctx, t, L - 2, R + 2, gy, 9, 701);
  wallGlow(ctx, wall, [
    ...c.windows.map((w) => ({ x: w.x, y: w.y, r: w.w * 1.25 })),
    ...c.lamps.map(([x, y]) => ({ x, y, r: 24 })),
  ]);
  eaveShade(ctx, t, wall, [eaveL, apex, eaveR]);
  for (const w of c.windows) glowWindow(ctx, t, w);
  cottageDoor(ctx, t, 72, gy, 32, 54);
  doorStep(ctx, t, 72, gy, 44);
  // 문간 등불: 벽에 박은 쇠고리에 매닮
  const [lx, ly] = c.lamps[0];
  ctx.strokeStyle = t.woodDark;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(lx - 8, ly - 24);
  ctx.lineTo(lx, ly - 24);
  ctx.lineTo(lx, ly - 16);
  ctx.stroke();
  cottageLantern(ctx, t, lx, ly);

  // 지붕: 용마루가 앞뒤로 달리는 두 면
  const back = (p: P): P => [p[0], p[1] - D];
  roofFace(ctx, t, [eaveL, apex, back(apex), back(eaveL)], roof, eaveL, [apex[0] - eaveL[0], apex[1] - eaveL[1]], [0, -D], 5);
  roofFace(ctx, t, [apex, eaveR, back(eaveR), back(apex)], mix(roof, t.woodDark, 0.3), apex, [eaveR[0] - apex[0], eaveR[1] - apex[1]], [0, -D], 5);
  trim(ctx, t, [apex, back(apex)], 5);
  trim(ctx, t, [back(eaveL), eaveL], 3, false);
  trim(ctx, t, [back(eaveR), eaveR], 3, false);
  moonRim(ctx, t, [back(eaveL), back(apex), back(eaveR)]);
  // 굴뚝: 오른쪽 면 위, 밑변은 지붕 면을 따라
  chimney(ctx, t, 138, 20, 30, edgeY(138) - 30, edgeY(158) - 30, 12);
  trim(ctx, t, [eaveL, apex, eaveR], 6);
}

/** 1: 좁고 높은 두 창 오두막 — 가파른 우진각 지붕, 문 위 천 차양, 창 아래 꽃상자, 쇠 연통 */
function cottage1(ctx: Ctx, t: Tone): void {
  const c = COTTAGES[1];
  const { gy } = c;
  const cx = 95;
  const L = 23;
  const R = 167;
  const wallTop = 130;
  const eave = 138; // 앞 처마 (벽 앞으로 8 내밂)
  const ridge = 40;
  const back = 62; // 뒤 처마
  const [eL, eR] = [7, 183];
  const [rL, rR] = [45, 145];
  const roof = mix(t.roof, t.leaf, 0.5);
  const wall: P[] = [[L, gy], [R, gy], [R, wallTop], [L, wallTop]];

  groundShadow(ctx, t, L - 12, R + 12, gy);
  boardWall(ctx, t, wall, mix(t.wall, t.cloth, 0.3), 'clapboard', 9);
  // 모서리 기둥
  ctx.fillStyle = t.woodDark;
  ctx.fillRect(L, wallTop, 5, gy - wallTop);
  ctx.fillRect(R - 5, wallTop, 5, gy - wallTop);
  foundation(ctx, t, L - 2, R + 2, gy, 9, 702);
  wallGlow(
    ctx,
    wall,
    c.windows.map((w) => ({ x: w.x, y: w.y, r: w.w * 1.4 })),
  );
  eaveShade(ctx, t, wall, [[eL, eave], [eR, eave]], 2, 14);
  for (const w of c.windows) {
    glowWindow(ctx, t, w, false);
    flowerBox(ctx, t, w.x, w.y + w.h / 2 + 4, w.w + 12, 703 + w.x);
  }
  cottageDoor(ctx, t, cx, gy, 30, 54, true);
  doorStep(ctx, t, cx, gy, 40);
  awning(ctx, t, cx, gy - 70, gy - 58, 44);

  // 쇠 연통: 지붕 앞면에 박혀 위로 솟음 (지붕 위에 그리고, 박힌 자리에 그늘)
  const roofFront: P[] = [[eL, eave], [eR, eave], [rR, ridge], [rL, ridge]];
  const hipL: P[] = [[eL, eave], [rL, ridge], [eL, back]];
  const hipR: P[] = [[eR, eave], [eR, back], [rR, ridge]];
  const v: P = [0, ridge - eave];
  roofFace(ctx, t, hipL, mix(roof, t.woodDark, 0.15), [eL, eave], [eR - eL, 0], v, 7);
  roofFace(ctx, t, hipR, mix(roof, t.woodDark, 0.35), [eL, eave], [eR - eL, 0], v, 7);
  roofFace(ctx, t, roofFront, roof, [eL, eave], [eR - eL, 0], v, 7);
  trim(ctx, t, [[rL, ridge], [rR, ridge]], 5);
  trim(ctx, t, [[eL, eave], [rL, ridge]], 3.5, false);
  trim(ctx, t, [[eR, eave], [rR, ridge]], 3.5, false);
  moonRim(ctx, t, [[eL, back], [rL, ridge], [rR, ridge], [eR, back]]);

  const px = 122;
  const pipeBase = 70;
  ctx.fillStyle = t.stoneLo;
  ctx.beginPath();
  ctx.ellipse(px + 5, pipeBase, 9, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = mix(t.rock, t.woodDark, 0.4);
  ctx.fillRect(px, 24, 10, pipeBase - 24);
  ctx.fillStyle = t.stoneHi;
  ctx.fillRect(px, 24, 2.5, pipeBase - 24);
  ctx.fillStyle = t.woodDark;
  for (const y of [38, 56]) ctx.fillRect(px - 1, y, 12, 3);
  // 연통 갓
  poly(ctx, [
    [px - 6, 24],
    [px + 16, 24],
    [px + 10, 16],
    [px, 16],
  ]);
  ctx.fill();
  ctx.fillStyle = t.roofHi;
  ctx.fillRect(px - 6, 22.5, 22, 1.5);
  trim(ctx, t, [[eL, eave], [eR, eave]], 6);
}

/** 2: 넓은 오두막 — 옆으로 긴 박공지붕 + 문간 작은 지붕(앞을 향한 박공), 아래는 돌벽, 디딤돌, 매단 등불, 나무 상자, 용마루 뒤 굴뚝 */
function cottage2(ctx: Ctx, t: Tone): void {
  const c = COTTAGES[2];
  const { gy } = c;
  const cx = 112;
  const L = 28;
  const R = 196;
  const wallTop = 138;
  const eave = 146;
  const ridge = 64;
  const [eL, eR] = [12, 212];
  const roof = mix(t.roof, t.rock, 0.55);
  const wall: P[] = [[L, gy], [R, gy], [R, wallTop], [L, wallTop]];

  groundShadow(ctx, t, L - 12, R + 12, gy);
  boardWall(ctx, t, wall, mix(t.wall, t.wood, 0.25), 'vertical', 13);
  // 아래 돌벽 두 줄 + 띠 나무
  foundation(ctx, t, L - 2, R + 2, gy, 12, 704, 2);
  ctx.fillStyle = t.woodDark;
  ctx.fillRect(L - 2, gy - 27, R - L + 4, 4);
  wallGlow(ctx, wall, [
    ...c.windows.map((w) => ({ x: w.x, y: w.y, r: w.w * 1.3 })),
    ...c.lamps.map(([x, y]) => ({ x, y, r: 26 })),
  ]);
  eaveShade(ctx, t, wall, [[eL, eave], [eR, eave]], 2, 14);
  for (const w of c.windows) glowWindow(ctx, t, w);
  cottageDoor(ctx, t, cx, gy, 34, 58, true);
  doorStep(ctx, t, cx, gy, 52);

  // 굴뚝: 용마루 뒤에 서서 위만 보인다 (지붕보다 먼저)
  chimney(ctx, t, 44, 20, 30, 80, 80, 10);
  // 긴 지붕 앞면: 양 끝 위 모서리를 깎은 반박공(작은 옆 면이 보임)
  const cut = 16;
  const v2: P = [0, ridge - eave];
  roofFace(ctx, t, [[eL, ridge + cut], [eL + cut, ridge], [eL, ridge + 3]], mix(roof, t.woodDark, 0.2), [eL, eave], [eR - eL, 0], v2, 6);
  roofFace(ctx, t, [[eR, ridge + cut], [eR, ridge + 3], [eR - cut, ridge]], mix(roof, t.woodDark, 0.4), [eL, eave], [eR - eL, 0], v2, 6);
  roofFace(
    ctx,
    t,
    [[eL, eave], [eR, eave], [eR, ridge + cut], [eR - cut, ridge], [eL + cut, ridge], [eL, ridge + cut]],
    roof,
    [eL, eave],
    [eR - eL, 0],
    v2,
    6,
  );
  trim(ctx, t, [[eL + cut, ridge], [eR - cut, ridge]], 5);
  moonRim(ctx, t, [[eL, ridge + 3], [eL + cut, ridge - 3], [eR - cut, ridge - 3], [eR, ridge + 3]]);
  trim(ctx, t, [[eL, eave], [eL, ridge + cut], [eL + cut, ridge]], 3.5, false);
  trim(ctx, t, [[eR, eave], [eR, ridge + cut], [eR - cut, ridge]], 3.5, false);
  trim(ctx, t, [[eL, eave], [eR, eave]], 6);

  // 문간 작은 지붕: 앞을 향한 박공, 뒤는 긴 지붕에 묻힘
  const pa: P = [cx, 126];
  const pl: P = [cx - 34, 156];
  const pr: P = [cx + 34, 156];
  const PD = 24;
  const up = (p: P): P => [p[0], p[1] - PD];
  ctx.fillStyle = t.wood;
  poly(ctx, [pl, pa, pr]);
  ctx.fill();
  withClip(ctx, [pl, pa, pr], () => {
    planks(ctx, t, pl[0], pr[0], pa[1], pl[1], 8);
    ctx.fillStyle = t.stoneLo;
    ctx.fillRect(pl[0], pa[1], pr[0] - pl[0], pl[1] - pa[1]);
  });
  // 박공 가운데 반달 장식
  ctx.fillStyle = t.woodDark;
  ctx.beginPath();
  ctx.arc(cx, pl[1] - 2, 9, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = AMBER_SOFT;
  ctx.beginPath();
  ctx.arc(cx, pl[1] - 2, 6, Math.PI, 0);
  ctx.fill();
  // 버팀목
  ctx.strokeStyle = t.woodDark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pl[0] + 4, pl[1]);
  ctx.lineTo(pl[0] + 10, pl[1] + 10);
  ctx.moveTo(pr[0] - 4, pr[1]);
  ctx.lineTo(pr[0] - 10, pr[1] + 10);
  ctx.stroke();
  ctx.fillStyle = t.woodDark;
  ctx.fillRect(pl[0], pl[1] - 1, pr[0] - pl[0], 4);
  // 긴 지붕과 만나는 골의 그늘
  ctx.strokeStyle = t.stoneLo;
  ctx.lineWidth = 5;
  polyline(ctx, [up(pl), up(pa), up(pr)]);
  ctx.stroke();
  roofFace(ctx, t, [pl, pa, up(pa), up(pl)], roof, pl, [pa[0] - pl[0], pa[1] - pl[1]], [0, -PD], 2);
  roofFace(ctx, t, [pa, pr, up(pr), up(pa)], mix(roof, t.woodDark, 0.3), pa, [pr[0] - pa[0], pr[1] - pa[1]], [0, -PD], 2);
  trim(ctx, t, [pa, up(pa)], 4);
  trim(ctx, t, [pl, pa, pr], 5);

  // 처마에 매단 등불
  const [lx, ly] = c.lamps[0];
  ctx.strokeStyle = t.woodDark;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(lx, pl[1] + 2);
  ctx.lineTo(lx, ly - 15);
  ctx.stroke();
  cottageLantern(ctx, t, lx, ly);

  // 문 옆 나무 상자
  crate(ctx, t, 176, gy + 3, 28, 24, 9);
  crate(ctx, t, 203, gy + 4, 15, 14, 6);
}

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 독립 에셋으로 내보내는 마을 오브젝트. bounds는 마을 좌표에서 잘라 낼 영역(그림자 포함) */
export interface VillageObject {
  key: string;
  label: string;
  bounds: Bounds;
  draw(ctx: Ctx, t: Tone): void;
}

export const VILLAGE_OBJECTS: readonly VillageObject[] = [
  { key: 'house-porch', label: '툇마루 집', bounds: { x: -10, y: 14, w: 240, h: 262 }, draw: housePorch },
  { key: 'house-side', label: '옆집', bounds: { x: 456, y: 34, w: 104, h: 178 }, draw: houseSide },
  { key: 'house-roof', label: '큰 지붕 집', bounds: { x: -10, y: 596, w: 290, h: 364 }, draw: houseRoof },
  { key: 'tree-roots', label: '큰 나무뿌리', bounds: { x: 300, y: 580, w: 260, h: 380 }, draw: treeRoots },
  { key: 'barrel-banner', label: '술통과 깃발', bounds: { x: 190, y: 200, w: 84, h: 82 }, draw: barrelBanner },
  { key: 'bunting', label: '깃발 줄', bounds: { x: 168, y: 764, w: 140, h: 50 }, draw: bunting },
  { key: 'bush', label: '풀숲', bounds: { x: 0, y: 0, w: 128, h: 108 }, draw: (c, t) => foliage(c, t, 64, 52, 46, 34, 6) },
  { key: 'rock', label: '바위', bounds: { x: 0, y: 0, w: 64, h: 52 }, draw: (c, t) => rock(c, t, 30, 24, 14) },
  { key: 'lamp-post', label: '등불 기둥', bounds: { x: 0, y: 0, w: 44, h: 116 }, draw: (c, t) => lanternPost(c, t, 20, 14, 104) },
  // 마을 안 오두막 (2026-11-13): 그림 아래 가운데 = 땅에 닿는 곳
  ...[cottage0, cottage1, cottage2].map(
    (draw, i): VillageObject => ({
      key: `cottage-${i}`,
      label: ['둥근 창 오두막', '좁은 두 창 오두막', '넓은 오두막'][i],
      bounds: { x: 0, y: 0, w: COTTAGES[i].w, h: COTTAGES[i].h },
      draw,
    }),
  ),
];

/** 마을 합성: 오브젝트를 레퍼런스 배치대로 놓는다 (그리는 순서 = 앞뒤) */
function drawEdges(ctx: Ctx, t: Tone): void {
  // 위쪽 숲 (가장 먼 곳)
  foliage(ctx, t, 230, 60, 54, 31, 4);
  foliage(ctx, t, 320, 44, 50, 32, 3);
  foliage(ctx, t, 410, 66, 56, 33, 5);
  rock(ctx, t, 300, 118, 18);
  housePorch(ctx, t);
  barrelBanner(ctx, t);
  foliage(ctx, t, 50, 300, 46, 34, 6);
  rock(ctx, t, 112, 318, 14);
  houseSide(ctx, t);
  foliage(ctx, t, 470, 208, 30, 35, 3);
  // 오른쪽 풀숲과 등불 기둥
  foliage(ctx, t, 522, 280, 40, 36, 5);
  lanternPost(ctx, t, 516, 326, 410);
  foliage(ctx, t, 524, 450, 34, 37, 3);
  // 왼쪽 풀숲과 등불 기둥
  foliage(ctx, t, 18, 430, 40, 38, 5);
  lanternPost(ctx, t, 24, 500, 584);
  foliage(ctx, t, 22, 620, 38, 39, 4);
  rock(ctx, t, 92, 470, 11);
  treeRoots(ctx, t);
  foliage(ctx, t, 520, 590, 40, 40, 4);
  foliage(ctx, t, 452, 830, 30, 41, 5);
  foliage(ctx, t, 330, 902, 26, 42, 3);
  houseRoof(ctx, t);
  bunting(ctx, t);
}

export function drawVillage(ctx: Ctx, t: Tone): void {
  drawPlaza(ctx, t);
  drawEdges(ctx, t);
  if (t.haze > 0) {
    // 먼 쪽(위)일수록 어둡게: 기울인 시점의 깊이감
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.5);
    g.addColorStop(0, `rgba(12,10,28,${t.haze})`);
    g.addColorStop(1, 'rgba(12,10,28,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H * 0.5);
  }
  if (t.vignette > 0) {
    const g = ctx.createRadialGradient(W * 0.48, H * 0.6, H * 0.2, W * 0.48, H * 0.6, H * 0.72);
    g.addColorStop(0, 'rgba(10,8,24,0)');
    g.addColorStop(1, `rgba(10,8,24,${t.vignette})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

// ---------------------------------------------------------------------------
// 넓은 마을 (2026-11-04 라이언 지시: 브롤스타즈처럼 정사각으로 넓게, 숨을 수 있는 풀숲과 장애물).
// 바닥 그림에는 고른 판석·둘레(위는 집 줄, 옆·아래는 덤불 띠)·바닥 문양만 굽는다.
// 풀숲·장애물은 판정이 있어 따로 세우는 오브젝트다(entities/MapProps.ts, 배치는 data/map.json).
// 생성 그림(바닥 타일·소품)이 오면 이 코드 그림을 대신한다. 배치는 제안: 기획서에 없음
// ---------------------------------------------------------------------------

const WW = GameData.game.world.width;
const WH = GameData.game.world.height;
const INSET = GameData.game.keeper.walkInset;
const MAP = GameData.map;

interface Placement {
  key: string;
  x: number;
  y: number;
  flip?: boolean;
}

/** 둘레 배치: 위쪽은 집과 술통이 줄지어 서고(걷는 곳 뒤), 옆·아래는 덤불·바위·등불 기둥 띠(걷는 곳 바깥) */
function buildPerimeter(): Placement[] {
  const rng = new Rng(5521);
  const out: Placement[] = [];
  // 위: 집 줄 (아래 끝이 걷기 영역 윗선 근처)
  const TOP_ROW: { key: string; y: number; w: number }[] = [
    { key: 'house-porch', y: 0, w: 240 },
    { key: 'barrel-banner', y: 180, w: 84 },
    { key: 'house-side', y: 40, w: 104 },
    { key: 'bush', y: 130, w: 128 },
    { key: 'house-porch', y: 0, w: 240 },
    { key: 'lamp-post', y: 130, w: 44 },
    { key: 'house-side', y: 40, w: 104 },
    { key: 'rock', y: 190, w: 64 },
  ];
  let x = -10;
  let i = 0;
  while (x < WW) {
    const item = TOP_ROW[i % TOP_ROW.length];
    out.push({ key: item.key, x, y: item.y, flip: i % 2 === 1 });
    x += item.w + rng.range(4, 26);
    i++;
  }
  // 옆: 덤불 띠, 사이사이 바위·등불 기둥
  for (let y = INSET.top + 10; y < WH - 120; y += rng.range(95, 130)) {
    const pick = rng.int(0, 5);
    const key = pick === 0 ? 'lamp-post' : pick === 1 ? 'rock' : 'bush';
    const w = key === 'bush' ? 128 : key === 'rock' ? 64 : 44;
    out.push({ key, x: -64 + rng.range(0, 14), y });
    out.push({ key, x: WW - w + 64 - rng.range(0, 14), y: y + rng.range(-20, 20), flip: true });
  }
  // 아래: 덤불 띠와 양 끝의 큰 나무뿌리
  for (let bx = 60; bx < WW - 60; bx += rng.range(100, 130)) {
    out.push({ key: rng.chance(0.2) ? 'rock' : 'bush', x: bx, y: WH - 95 + rng.range(-8, 8) });
  }
  out.push({ key: 'tree-roots', x: -40, y: WH - 230 });
  out.push({ key: 'tree-roots', x: WW - 220, y: WH - 230, flip: true });
  // 위쪽 집 앞 깃발 줄
  for (let bx = 300; bx < WW - 200; bx += 700) out.push({ key: 'bunting', x: bx, y: 215 });
  return out;
}

export const WORLD_LAYOUT: readonly Placement[] = buildPerimeter();

const OBJECT_BY_KEY = new Map(VILLAGE_OBJECTS.map((o) => [o.key, o]));

/** 오브젝트 좌표의 한 점을 마을 좌표로 */
function placePoint(p: Placement, o: VillageObject, x: number, y: number): P {
  return [p.flip ? p.x + (o.bounds.x + o.bounds.w - x) : p.x + (x - o.bounds.x), p.y + (y - o.bounds.y)];
}

/** 등불 기둥 오브젝트(0,0,44,116)의 매단 등불 자리 */
export const LAMP_POST_LIGHT = { x: 20, y: 34 } as const;
/** 등불 기둥 오브젝트에서 기둥 밑동(장애물 판정 사각형의 가운데 아래)까지 */
export const LAMP_POST_FOOT = { x: 20, y: 104 } as const;
/** 콤보 단계마다 하나씩 켜지는 등불의 순서 (창문은 처음부터 켜짐) */
const LANTERN_TIERS = [5, 10, 20, 30];

function buildWorldLights(): VillageLight[] {
  const lights: VillageLight[] = [];
  let k = 0;
  const lantern = (x: number, y: number) => lights.push({ kind: 'lantern', x, y, w: 18, h: 26, combo: LANTERN_TIERS[k++ % LANTERN_TIERS.length] });
  for (const p of WORLD_LAYOUT) {
    const o = OBJECT_BY_KEY.get(p.key);
    if (!o) continue;
    if (p.key === 'lamp-post') {
      lantern(...placePoint(p, o, LAMP_POST_LIGHT.x, LAMP_POST_LIGHT.y));
      continue;
    }
    // 이 오브젝트 안에 있던 한 화면 마을의 창문·등불을 함께 옮긴다
    for (const l of VILLAGE_LIGHTS) {
      const inside = l.x >= o.bounds.x && l.x <= o.bounds.x + o.bounds.w && l.y >= o.bounds.y && l.y <= o.bounds.y + o.bounds.h;
      if (!inside) continue;
      const [x, y] = placePoint(p, o, l.x, l.y);
      if (l.kind === 'window') lights.push({ ...l, x, y, combo: 0 });
      else lantern(x, y);
    }
  }
  // 마을 안 등불 기둥(장애물, map.json): 밑동 사각형에서 기둥 위 매단 등불 자리로
  for (const ob of MAP.obstacles) {
    if (ob.kind !== 'lamp') continue;
    const footX = ob.x + ob.w / 2;
    const footY = ob.y + ob.h;
    lantern(footX + LAMP_POST_LIGHT.x - LAMP_POST_FOOT.x, footY + LAMP_POST_LIGHT.y - LAMP_POST_FOOT.y);
  }
  return lights;
}

/** 넓은 마을의 창문·등불 (콤보 단계마다 켜짐) */
export const WORLD_LIGHTS: readonly VillageLight[] = buildWorldLights();

/** 넓은 마을 판석은 그릴 때만 만든다(게임은 이 그림을 파일로 불러오므로 실행 중에는 필요 없음) */
let worldFlags: Flag[] | null = null;

export function drawWorld(ctx: Ctx, t: Tone): void {
  worldFlags ??= buildFlags(WW, WH, false, 4211);
  drawFlags(ctx, t, worldFlags, WW, WH);
  for (const r of MAP.rings) drawRing(ctx, t, r.x, r.y);
  for (const p of WORLD_LAYOUT) {
    const o = OBJECT_BY_KEY.get(p.key);
    if (!o) continue;
    ctx.save();
    if (p.flip) {
      ctx.translate(p.x + o.bounds.w, p.y);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(p.x, p.y);
    }
    ctx.translate(-o.bounds.x, -o.bounds.y);
    o.draw(ctx, t);
    ctx.restore();
  }
  // 마을 가장자리일수록 조금 어둡게: 바깥은 숲
  if (t.vignette > 0) {
    const g = ctx.createRadialGradient(WW / 2, WH / 2, WW * 0.36, WW / 2, WH / 2, WW * 0.72);
    g.addColorStop(0, 'rgba(10,8,24,0)');
    g.addColorStop(1, `rgba(10,8,24,${t.vignette * 0.8})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, WW, WH);
  }
}
