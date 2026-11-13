// 오브젝트 에셋: 큰 등불(켜짐·약함·꺼짐), 처마에 매단 작은 등불(꺼짐·켜짐).
// 기준: Sprite & Asset Reference Sheet의 등불 — 놋쇠 받침 위의 유리 등. 상태는 기획서의 등불 HP 표현.
import { type Ctx, Ink, Palette, ellipse, poly, shadowed, starPath } from './kit';

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
 * 중앙 광원 (2026-11-12 새 기획, 마을의 수호 토템). 임시 코드 그림 176×236 (2026-11-13: 128×176에서 약 1.35배, 더 웅장하게).
 * 비스듬히 내려다본 세 단 돌 제단(이끼·빛 새김·별 문양·초와 꽃 공물) 위 돌 그릇에서, 금이 간 빛의 결정이 떠 있고
 * 작은 결정 둘이 그릇에 뿌리내렸으며, 파편들이 은은한 빛의 고리를 따라 돈다.
 * 0 = 밝음, 1 = 약함(광도 '낮음'), 2 = 꺼짐(결정이 그릇에 내려앉아 잠들고, 파편은 제단에 떨어짐, 빛 없음).
 * 기준점 = 받침 바닥(맨 아래 단이 땅에 닿는 가장 앞) 가운데 (88, 224), 큰 결정 가운데 = (88, 74)
 */
export const CENTRAL = { w: 176, h: 236, footY: 224, coreY: 74, frames: 3 } as const;

const CENTRAL_FRAME = { lit: 0, low: 1, out: 2 } as const;

/** 결정 색: 빛나는 면·밝은 면·가운데·어두운 면, 테두리, 바깥 번짐 */
interface CrystalTone {
  hi: string;
  light: string;
  mid: string;
  dark: string;
  line: string;
  glow: string | null;
  blur: number;
}

const CRYSTAL: readonly CrystalTone[] = [
  { hi: '#FFFDF0', light: '#FFE7A6', mid: '#FFC857', dark: '#E09A40', line: 'rgba(176,112,44,0.75)', glow: '#FFC857', blur: 22 }, // 밝음
  { hi: '#ECD5AC', light: '#D4AC74', mid: '#AE7E4C', dark: '#7C5537', line: 'rgba(96,62,40,0.85)', glow: '#C9935A', blur: 8 }, // 약함
  { hi: '#8E86A8', light: '#6C6489', mid: '#4D4668', dark: '#2F2A44', line: 'rgba(22,18,36,0.85)', glow: null, blur: 0 }, // 꺼짐
];

/** 돌 색: 윗면·앞면 위·앞면 아래·윗면 가장자리 빛 */
interface StoneTone {
  top: string;
  sideHi: string;
  sideLo: string;
  rim: string;
}
const STONE_DAIS: StoneTone = { top: '#736E8E', sideHi: '#5E5878', sideLo: '#433E5A', rim: '#9590AE' };
const STONE_STEP: StoneTone = { top: '#827D9C', sideHi: '#67617F', sideLo: '#4A4562', rim: '#A39EBC' };
const STONE_PILLAR: StoneTone = { top: '#8C87A6', sideHi: '#716B8A', sideLo: '#514B69', rim: '#ACA7C4' };
const STONE_OUTLINE = 'rgba(20,16,34,0.62)';

/**
 * 비스듬히 내려다본 둥근 돌 한 단: 윗면 타원 가운데 (x, top), 반지름 rx·ry, 높이 hgt.
 * rxBottom을 주면 아래가 넓어지는(또는 좁아지는) 기둥. 앞면은 위가 밝고 아래가 어둡다.
 */
function drum(ctx: Ctx, x: number, top: number, rx: number, ry: number, hgt: number, tone: StoneTone, rxBottom = rx): void {
  const ryBottom = (ry * rxBottom) / rx;
  const bottom = top + hgt;
  const side = (): void => {
    ctx.beginPath();
    ctx.moveTo(x - rx, top);
    ctx.lineTo(x - rxBottom, bottom);
    ctx.ellipse(x, bottom, rxBottom, ryBottom, 0, Math.PI, 0, true);
    ctx.lineTo(x + rx, top);
    ctx.ellipse(x, top, rx, ry, 0, 0, Math.PI, true);
    ctx.closePath();
  };
  // 앞면
  const g = ctx.createLinearGradient(0, top, 0, bottom + ryBottom);
  g.addColorStop(0, tone.sideHi);
  g.addColorStop(1, tone.sideLo);
  ctx.fillStyle = g;
  side();
  ctx.fill();
  ctx.strokeStyle = STONE_OUTLINE;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  // 윗면
  ctx.fillStyle = tone.top;
  ellipse(ctx, x, top, rx, ry);
  ctx.fill();
  ctx.stroke();
  // 윗면 앞 가장자리에 받는 빛
  ctx.strokeStyle = tone.rim;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(x, top, rx - 1.2, ry - 1, 0, Math.PI * 0.12, Math.PI * 0.88);
  ctx.stroke();
}

/** 이끼 덩이: (x, y)에서 오른쪽으로 w만큼, 위는 둥글고 아래로 조금 늘어진다 */
function moss(ctx: Ctx, x: number, y: number, w: number, out: boolean): void {
  const blobs = [0.12, 0.34, 0.55, 0.78, 0.94];
  const size = [0.2, 0.26, 0.22, 0.24, 0.16];
  ctx.fillStyle = out ? '#3F5446' : '#4B6A4E';
  blobs.forEach((t, i) => {
    ellipse(ctx, x + w * t, y + (i % 2) * 1.2, w * size[i], w * size[i] * 0.62);
    ctx.fill();
  });
  // 늘어진 이끼 두 가닥
  ellipse(ctx, x + w * 0.3, y + 3.2, 1.6, 3.2);
  ctx.fill();
  ellipse(ctx, x + w * 0.7, y + 2.6, 1.4, 2.6);
  ctx.fill();
  // 윗면 밝은 이끼
  ctx.fillStyle = out ? '#55705A' : '#6E9466';
  blobs.forEach((t, i) => {
    if (i % 2) return;
    ellipse(ctx, x + w * t, y - w * size[i] * 0.22, w * size[i] * 0.62, w * size[i] * 0.3);
    ctx.fill();
  });
  // 민트 점 (이슬)
  ctx.fillStyle = out ? 'rgba(158,217,181,0.25)' : 'rgba(158,217,181,0.7)';
  ellipse(ctx, x + w * 0.45, y - 1.6, 1, 1);
  ctx.fill();
}

/**
 * 육각 기둥 모양의 결정 한 개 (가운데 (x, y), 폭 w, 높이 h, 기울기 rot).
 * 왼쪽 면이 밝고 오른쪽 면이 어둡다. glow면 바깥으로 빛이 번진다.
 */
function prism(ctx: Ctx, x: number, y: number, w: number, h: number, rot: number, tone: CrystalTone, glow = true): void {
  const hw = w / 2;
  const top = -h / 2;
  const bot = h / 2;
  const sh = top + h * 0.27;
  const lo = bot - h * 0.22;
  const c = w * 0.17;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const outline = (): void =>
    poly(ctx, [
      [0, top],
      [hw, sh],
      [hw, lo],
      [0, bot],
      [-hw, lo],
      [-hw, sh],
    ]);
  // 바깥 번짐
  if (glow && tone.glow) {
    ctx.save();
    ctx.shadowColor = tone.glow;
    ctx.shadowBlur = tone.blur;
    ctx.fillStyle = tone.mid;
    outline();
    ctx.fill();
    ctx.restore();
  }
  // 왼쪽 면
  let g = ctx.createLinearGradient(-hw, top, 0, bot);
  g.addColorStop(0, tone.light);
  g.addColorStop(1, tone.mid);
  ctx.fillStyle = g;
  poly(ctx, [
    [0, top],
    [-c, sh],
    [-c, lo],
    [0, bot],
    [-hw, lo],
    [-hw, sh],
  ]);
  ctx.fill();
  // 오른쪽 면
  g = ctx.createLinearGradient(0, top, hw, bot);
  g.addColorStop(0, tone.mid);
  g.addColorStop(1, tone.dark);
  ctx.fillStyle = g;
  poly(ctx, [
    [0, top],
    [hw, sh],
    [hw, lo],
    [0, bot],
    [c, lo],
    [c, sh],
  ]);
  ctx.fill();
  // 가운데 면 (가장 밝다)
  g = ctx.createLinearGradient(0, top, 0, bot);
  g.addColorStop(0, tone.hi);
  g.addColorStop(0.55, tone.light);
  g.addColorStop(1, tone.mid);
  ctx.fillStyle = g;
  poly(ctx, [
    [0, top],
    [c, sh],
    [c, lo],
    [0, bot],
    [-c, lo],
    [-c, sh],
  ]);
  ctx.fill();
  // 면 사이 결 + 테두리
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-c, sh);
  ctx.lineTo(-c, lo);
  ctx.moveTo(c, sh);
  ctx.lineTo(c, lo);
  ctx.moveTo(-hw, sh);
  ctx.lineTo(-c, sh);
  ctx.lineTo(0, top);
  ctx.stroke();
  ctx.strokeStyle = tone.line;
  ctx.lineWidth = 1.2;
  outline();
  ctx.stroke();
  ctx.restore();
}

/** 결정에 난 금 (어둠의 습격으로 생긴 균열, XMind): 밝을 때는 금 사이로 빛이 샌다 */
function crack(ctx: Ctx, x: number, y: number, w: number, h: number, frame: number): void {
  const pts: [number, number][] = [
    [0.16, -0.31],
    [-0.02, -0.17],
    [0.1, -0.05],
    [-0.07, 0.09],
    [0.03, 0.22],
  ];
  const path = (): void => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(x + px * w, y + py * h) : ctx.moveTo(x + px * w, y + py * h)));
    // 작은 갈래
    ctx.moveTo(x + 0.1 * w, y - 0.05 * h);
    ctx.lineTo(x + 0.24 * w, y + 0.02 * h);
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = frame === CENTRAL_FRAME.out ? 'rgba(18,14,30,0.9)' : frame === CENTRAL_FRAME.low ? 'rgba(110,70,44,0.85)' : 'rgba(184,116,46,0.8)';
  ctx.lineWidth = 2.4;
  path();
  ctx.stroke();
  if (frame !== CENTRAL_FRAME.out) {
    ctx.strokeStyle = frame === CENTRAL_FRAME.lit ? 'rgba(255,255,250,0.95)' : 'rgba(255,236,200,0.55)';
    ctx.lineWidth = 0.9;
    path();
    ctx.stroke();
  }
  ctx.restore();
}

/** 결정 둘레의 빛 고리 (기울어진 타원). back = 결정 뒤로 지나는 위쪽 반, 아니면 앞쪽 반 */
function haloRing(ctx: Ctx, x: number, y: number, frame: number, back: boolean): void {
  if (frame === CENTRAL_FRAME.out) return;
  const a = frame === CENTRAL_FRAME.lit ? 1 : 0.45;
  const rx = 62;
  const ry = 15;
  const from = back ? Math.PI : 0;
  const to = back ? Math.PI * 2 : Math.PI;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = `rgba(255,200,87,${0.16 * a})`;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, from, to);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,226,160,${(back ? 0.42 : 0.7) * a})`;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, from, to);
  ctx.stroke();
  // 고리 위 작은 빛 구슬
  ctx.fillStyle = `rgba(255,246,218,${(back ? 0.55 : 0.9) * a})`;
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * Math.PI * 2 + 0.2;
    const s = Math.sin(t);
    if (back ? s > 0 : s <= 0) continue;
    ellipse(ctx, x + Math.cos(t) * rx, y + s * ry, 1.5, 1.5);
    ctx.fill();
  }
  ctx.restore();
}

/** 작은 빛 반짝임 (네 갈래 별) */
function twinkle(ctx: Ctx, x: number, y: number, r: number, alpha: number): void {
  ctx.fillStyle = `rgba(255,248,224,${alpha})`;
  starPath(ctx, x, y, 4, r, r * 0.28);
  ctx.fill();
}

/** 공물 초: 바닥 (x, y), 꺼짐이면 심지만 */
function candle(ctx: Ctx, x: number, y: number, hgt: number, frame: number): void {
  ctx.fillStyle = frame === CENTRAL_FRAME.out ? '#B9B2C4' : Palette.paper;
  ctx.beginPath();
  ctx.roundRect(x - 2.4, y - hgt, 4.8, hgt, 1.2);
  ctx.fill();
  ctx.strokeStyle = STONE_OUTLINE;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.strokeStyle = '#3A2A1E';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(x, y - hgt);
  ctx.lineTo(x, y - hgt - 1.6);
  ctx.stroke();
  if (frame === CENTRAL_FRAME.out) return;
  ctx.save();
  ctx.shadowColor = Palette.amber;
  ctx.shadowBlur = frame === CENTRAL_FRAME.lit ? 8 : 4;
  ctx.fillStyle = frame === CENTRAL_FRAME.lit ? '#FFE08A' : '#E8B56E';
  ctx.beginPath();
  ctx.moveTo(x, y - hgt - 6.5);
  ctx.quadraticCurveTo(x + 2.4, y - hgt - 2.4, x, y - hgt - 1);
  ctx.quadraticCurveTo(x - 2.4, y - hgt - 2.4, x, y - hgt - 6.5);
  ctx.fill();
  ctx.restore();
}

/** 라벤더 들꽃 몇 송이와 작은 조약돌 */
function flowers(ctx: Ctx, x: number, y: number, out: boolean): void {
  ctx.fillStyle = '#5F5A78';
  ellipse(ctx, x + 9, y + 1, 3.2, 2.2);
  ctx.fill();
  ellipse(ctx, x + 13.5, y - 1.5, 2.2, 1.6);
  ctx.fill();
  ctx.strokeStyle = out ? '#3F5446' : '#5C7F55';
  ctx.lineWidth = 1;
  const heads: [number, number][] = [
    [-3, -7],
    [1, -9],
    [4, -6],
  ];
  ctx.beginPath();
  heads.forEach(([dx, dy]) => {
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + dy);
  });
  ctx.stroke();
  ctx.fillStyle = out ? '#6E6690' : Palette.lavender;
  heads.forEach(([dx, dy]) => {
    ellipse(ctx, x + dx, y + dy, 2, 2);
    ctx.fill();
  });
  ctx.fillStyle = out ? 'rgba(246,241,231,0.35)' : 'rgba(246,241,231,0.85)';
  heads.forEach(([dx, dy]) => {
    ellipse(ctx, x + dx, y + dy, 0.7, 0.7);
    ctx.fill();
  });
}

/** 가운데 단 앞면에 새긴 빛 글자 (점·막대·마름모가 번갈아) */
function runes(ctx: Ctx, x: number, top: number, rx: number, ry: number, hgt: number, frame: number): void {
  const color =
    frame === CENTRAL_FRAME.lit ? 'rgba(255,214,140,0.95)' : frame === CENTRAL_FRAME.low ? 'rgba(232,184,120,0.65)' : 'rgba(150,140,180,0.38)';
  ctx.save();
  if (frame === CENTRAL_FRAME.lit) {
    ctx.shadowColor = Palette.amber;
    ctx.shadowBlur = 5;
  }
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  const kinds = [2, 0, 1, 2, 1, 0, 2];
  kinds.forEach((kind, i) => {
    const t = Math.PI * (0.2 + (0.6 * i) / (kinds.length - 1));
    const gx = x + Math.cos(t) * rx * 0.97;
    const gy = top + Math.sin(t) * ry + hgt * 0.52;
    const k = 0.55 + 0.45 * Math.sin(t); // 옆으로 갈수록 좁아 보임
    if (kind === 0) {
      ellipse(ctx, gx, gy, 1.3 * k, 1.3);
      ctx.fill();
    } else if (kind === 1) {
      // 작은 네 갈래 별 (십자처럼 보이지 않게 가운데가 가늘다)
      ctx.save();
      ctx.translate(gx, gy);
      ctx.scale(k, 1);
      starPath(ctx, 0, 0, 4, 3.4, 0.9);
      ctx.fill();
      ctx.restore();
    } else {
      poly(ctx, [
        [gx, gy - 3.4],
        [gx + 2.2 * k, gy],
        [gx, gy + 3.4],
        [gx - 2.2 * k, gy],
      ]);
      ctx.fill();
    }
  });
  ctx.restore();
}

export function drawCentralSource(ctx: Ctx, frame: number): void {
  const { w, footY, coreY } = CENTRAL;
  const cx = w / 2;
  const out = frame === CENTRAL_FRAME.out;
  const lit = frame === CENTRAL_FRAME.lit;
  const tone = CRYSTAL[frame];

  // ── 돌 제단 세 단 (아래부터) ──
  // 1단: 낮고 넓은 받침 (바닥 타원의 가장 앞 = footY)
  const dais = { rx: 74, ry: 19, hgt: 11 };
  const daisTop = footY - dais.ry - dais.hgt; // 194
  drum(ctx, cx, daisTop, dais.rx, dais.ry, dais.hgt, STONE_DAIS);
  // 1단 앞면에 판 홈 한 줄
  ctx.strokeStyle = 'rgba(30,24,46,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, daisTop + dais.hgt * 0.55, dais.rx, dais.ry, 0, Math.PI * 0.08, Math.PI * 0.92);
  ctx.stroke();
  // 2단: 빛 글자를 새긴 둥근 단
  const step = { rx: 56, ry: 14.5, hgt: 15 };
  const stepTop = daisTop - step.hgt; // 179
  drum(ctx, cx, stepTop, step.rx, step.ry, step.hgt, STONE_STEP);
  runes(ctx, cx, stepTop, step.rx, step.ry, step.hgt, frame);
  // 3단: 아래가 조금 넓은 기둥 + 별 문양
  const pillarTop = stepTop - 24; // 155
  drum(ctx, cx, pillarTop, 28, 7.5, 24, STONE_PILLAR, 34);
  // 기둥 세로 홈
  ctx.strokeStyle = 'rgba(30,24,46,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const k of [-0.62, 0.62]) {
    ctx.moveTo(cx + 28 * k, pillarTop + 9);
    ctx.lineTo(cx + 34 * k, stepTop + 6);
  }
  ctx.stroke();
  // 별 문양: 새긴 원 + 네 갈래 별
  const starY = pillarTop + 20;
  ctx.strokeStyle = 'rgba(26,20,40,0.5)';
  ctx.lineWidth = 1.6;
  ellipse(ctx, cx, starY, 9.5, 8.5);
  ctx.stroke();
  ctx.strokeStyle = out ? 'rgba(170,160,200,0.25)' : 'rgba(255,214,140,0.45)';
  ctx.lineWidth = 0.9;
  ellipse(ctx, cx, starY + 0.6, 9.5, 8.5);
  ctx.stroke();
  ctx.save();
  if (!out) {
    ctx.shadowColor = Palette.amber;
    ctx.shadowBlur = lit ? 8 : 4;
  }
  ctx.fillStyle = out ? 'rgba(150,140,180,0.45)' : lit ? '#FFD88A' : '#D9A86A';
  starPath(ctx, cx, starY, 4, 7, 2.1);
  ctx.fill();
  ctx.restore();
  // 기둥 머리 (넓은 판돌)
  const capTop = pillarTop - 7; // 148
  drum(ctx, cx, capTop, 40, 10.5, 7, STONE_STEP);

  // 이끼
  moss(ctx, cx + 16, daisTop + 18, 22, out);
  moss(ctx, cx - 74, daisTop + 4, 14, out);
  moss(ctx, cx + 30, stepTop + 10, 16, out);
  moss(ctx, cx - 33, stepTop + 7, 12, out);
  moss(ctx, cx - 36, capTop + 5, 10, out);

  // 공물: 초 셋, 들꽃
  candle(ctx, cx - 58, daisTop + 9, 8, frame);
  candle(ctx, cx - 47, daisTop + 13, 6, frame);
  candle(ctx, cx + 47, daisTop + 13, 7, frame);
  flowers(ctx, cx + 56, daisTop + 9, out);

  // 결정의 빛이 돌에 내려앉는다 (꺼지면 차갑게 가라앉음): 지금까지 그린 돌에만 덧칠
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const warm = ctx.createRadialGradient(cx, capTop - 6, 4, cx, capTop - 6, 110);
  if (out) {
    warm.addColorStop(0, 'rgba(24,20,48,0.22)');
    warm.addColorStop(1, 'rgba(24,20,48,0.22)');
  } else {
    const a = lit ? 0.42 : 0.18;
    warm.addColorStop(0, `rgba(255,206,120,${a})`);
    warm.addColorStop(0.55, `rgba(255,190,100,${a * 0.45})`);
    warm.addColorStop(1, 'rgba(255,190,100,0)');
  }
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, w, CENTRAL.h);
  ctx.restore();

  // ── 결정 ──
  const core = out ? coreY + 13 : coreY; // 꺼지면 결정이 그릇에 내려앉는다
  const main = { w: 46, h: 100 };
  const ringY = coreY + 8;
  // 결정 뒤의 부드러운 빛
  if (!out) {
    const aura = ctx.createRadialGradient(cx, core, 6, cx, core, 74);
    aura.addColorStop(0, `rgba(255,214,130,${lit ? 0.5 : 0.2})`);
    aura.addColorStop(0.5, `rgba(255,200,87,${lit ? 0.18 : 0.07})`);
    aura.addColorStop(1, 'rgba(255,200,87,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(cx - 80, core - 80, 160, 160);
  }
  haloRing(ctx, cx, ringY, frame, true);

  // 돌 그릇: 안쪽 + 뿌리내린 작은 결정 둘 + 앞 가장자리
  const bowlY = capTop - 12; // 136
  const bowlSide = ctx.createLinearGradient(0, bowlY, 0, bowlY + 12.5);
  bowlSide.addColorStop(0, STONE_PILLAR.sideHi);
  bowlSide.addColorStop(1, STONE_PILLAR.sideLo);
  ctx.fillStyle = bowlSide;
  ctx.beginPath();
  ctx.ellipse(cx, bowlY, 26, 12.5, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = STONE_OUTLINE;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = STONE_PILLAR.top;
  ellipse(ctx, cx, bowlY, 26, 6.5);
  ctx.fill();
  ctx.stroke();
  const inner = ctx.createRadialGradient(cx, bowlY, 2, cx, bowlY, 24);
  inner.addColorStop(0, out ? '#2A2438' : lit ? '#FFE9B0' : '#C99A62');
  inner.addColorStop(1, out ? '#1E1A2C' : lit ? '#B8742E' : '#5E4636');
  ctx.fillStyle = inner;
  ellipse(ctx, cx, bowlY - 0.5, 22, 4.8);
  ctx.fill();
  prism(ctx, cx - 19, bowlY - 15, 15, 36, -0.42, tone, !out);
  prism(ctx, cx + 18, bowlY - 12, 13, 30, 0.4, tone, !out);
  if (out) {
    prism(ctx, cx, core, main.w, main.h, 0, tone, false);
    crack(ctx, cx, core, main.w, main.h, frame);
  }
  // 그릇 앞 가장자리 (두께)
  ctx.fillStyle = STONE_PILLAR.top;
  ctx.beginPath();
  ctx.ellipse(cx, bowlY, 26, 6.5, 0, 0, Math.PI);
  ctx.ellipse(cx, bowlY - 0.5, 22, 4.8, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = STONE_OUTLINE;
  ctx.lineWidth = 1;
  ctx.stroke();

  if (!out) {
    // 떠 있는 큰 결정 + 금
    prism(ctx, cx, core, main.w, main.h, 0, tone);
    crack(ctx, cx, core, main.w, main.h, frame);
    // 결정 위쪽 반짝임
    if (lit) twinkle(ctx, cx - 9, core - 30, 4.5, 0.95);
  }
  haloRing(ctx, cx, ringY, frame, false);

  // 파편: 밝으면 고리를 따라 떠 있고, 꺼지면 제단에 떨어져 누워 있다
  const shards: { x: number; y: number; w: number; h: number; rot: number; fx: number; fy: number; frot: number }[] = [
    { x: cx - 54, y: coreY + 14, w: 13, h: 24, rot: -0.28, fx: cx - 45, fy: stepTop + 1, frot: -1.3 },
    { x: cx + 54, y: coreY + 2, w: 11, h: 20, rot: 0.3, fx: cx + 45, fy: stepTop - 1, frot: 1.32 },
    { x: cx + 36, y: coreY - 42, w: 8, h: 15, rot: 0.22, fx: cx + 63, fy: daisTop - 1, frot: 1.45 },
    { x: cx - 38, y: coreY - 34, w: 7, h: 12, rot: -0.35, fx: cx - 66, fy: daisTop - 3, frot: -1.5 },
  ];
  for (const s of shards) {
    if (out) prism(ctx, s.fx, s.fy, s.w, s.h, s.frot, tone, false);
    else prism(ctx, s.x, s.y, s.w, s.h, s.rot, tone);
  }
  if (lit) {
    twinkle(ctx, cx + 50, coreY - 22, 3.2, 0.8);
    twinkle(ctx, cx - 56, coreY - 8, 2.6, 0.7);
    twinkle(ctx, cx + 18, coreY - 60, 2.4, 0.75);
  }

  // 바닥 그림자 (맨 뒤에 깔기)
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = 'rgba(5,4,12,0.4)';
  ellipse(ctx, cx + 3, footY - 17, 80, 20);
  ctx.fill();
  ctx.fillStyle = 'rgba(5,4,12,0.2)';
  ellipse(ctx, cx + 3, footY - 15, 86, 24);
  ctx.fill();
  ctx.restore();
}
