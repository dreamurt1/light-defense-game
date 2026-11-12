// 밤 마을 그림 (플레이스홀더 아트). 오브젝트(집·나무뿌리·풀숲·바위·술통·깃발 줄·등불 기둥)는 각각 독립 에셋으로도 내보낸다(registry.ts).
// 공간감과 구도의 기준은 reference/ChatGPT-Images/달빛 숲의 등불지기 고양이.png:
// 살짝 기울여 내려다본 판석 광장(크고 불규칙한 돌, 금, 이끼), 벽면과 지붕 경사가 보이는 집, 툇마루·울타리·술통·깃발 줄,
// 큰 나무뿌리, 잎사귀와 보라 꽃, 먼 쪽(위)이 어두운 깊이감. 같은 모양을 '어둡게 / 빛을 받아' 두 번 칠한다.
// 색은 팔레트에서 섞은 값이고(제안: 기획서에 없음), 모양의 흔들림은 고정 seed라 매번 같다.
import { Rng } from '../core/rng';
import { GameData } from '../data';

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
