// 2026-11-13 컨셉 시연판: 토리(토끼)·도토(다람쥐) 플레이용 8방향 시트 (임시 코드 그림).
// 루미 시트(lumi-8dir)와 같은 배치: 줄 = 방향(e·se·s·sw·w·nw·n·ne) + 연출 줄(ko·stun), 칸 = 대기 4 + 걷기 4.
// 애니메이션 이름도 같은 규칙: `${id}-idle-<방향>`, `${id}-walk-<방향>`, `${id}-ko`, `${id}-stun`.
//
// 2026-11-13 다듬기(라이언: 살아 있는 것은 어색하지 않게 움직이는 임시 스프라이트로, 루미처럼):
// 몸을 작은 입체(타원체·구 사슬)로 두고 바라보는 각도로 돌려 그린다. 정면 s · 앞 3/4 se · 옆 e · 뒤 3/4 ne · 뒤 n
// 다섯 각도를 그리고, 왼쪽 계열(sw·w·nw)은 se·e·ne를 좌우로 뒤집는다(루미 걷기 팩도 225·270·315를 뒤집은 그림).
// 걷기 4칸 = 디딤 → 지나감 → 반대 디딤 → 지나감: 발이 번갈아 앞뒤로 가고 들리며, 몸은 지나갈 때 뜨고 디딜 때 살짝 눌린다.
// 팔(토리)은 반대쪽 발과 함께 흔들고, 귀(토리)·큰 꼬리(도토)·도토리는 몸보다 한 칸 늦게 따라온다.
// 대기 4칸 = 숨쉬기 + 귀 쫑긋(토리)·꼬리 살랑(도토).
// 좌표는 128×128 칸 기준(루미 원본 칸과 같음), 발끝 = FEET_Y(122). 디자인 64 칸 → 파일 2배.
// 색은 초상(src/art/friends.ts)을 따른다: 토리 = 흰 토끼 + 민트 리본, 도토 = 붉은 갈색 다람쥐 + 복슬 꼬리 + 황금 도토리.
// 볼 홍조는 새벽빛(DAWN #F2B880). 모양·움직임 수치는 모두 제안.
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
  eyeLow: string;
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
    eyeLow: '#6a5a86',
    nose: '#e8849c',
    blush: 'rgba(242,184,128,0.62)',
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
    blush: 'rgba(242,184,128,0.75)',
  },
};

const GOLD = '#f2b54a';
const ACORN_CAP = '#7a4a26';
const LINE = 2.8;
const CX = CELL / 2;
const TAU = Math.PI * 2;
/** 살짝 내려다보는 시점: 화면 쪽(가까운) 점이 이만큼 아래로 내려온다 (깊이 1당 px) */
const TILT = 0.28;
/** 땅을 딛는 발은 덜 기울인다(옆모습에서 가까운 발이 너무 내려가 발끝 기준이 흔들리지 않게) */
const FOOT_TILT = 0.12;

// ---------------------------------------------------------------------------
// 움직임 (한 칸)
// ---------------------------------------------------------------------------

interface Foot {
  /** 앞(+)·뒤(-)로 나간 거리 */
  z: number;
  /** 들린 높이 */
  lift: number;
}

interface Motion {
  /** 몸이 뜬 높이(px) */
  bob: number;
  /** 발끝 기준 가로·세로 늘림 (디딜 때 눌리고, 뜰 때 늘어남) */
  sx: number;
  sy: number;
  /** 앞으로 기울기 (높이 1당 앞쪽으로 옮기는 px) */
  lean: number;
  /** 디딘 발 쪽으로 옮긴 무게 (옆 방향 px) */
  shift: number;
  /** [왼발(정면에서 화면 왼쪽), 오른발] */
  feet: readonly [Foot, Foot];
  /** 팔 흔들기 -1~1 (+ = 오른팔 앞) */
  swing: number;
  /** 귀·꼬리·도토리 따라오기: + = 몸보다 늦게 내려와 위로 뻗음, - = 늦게 올라와 처짐 */
  lag: number;
  /** 귀가 옆으로 쏠림 -1~1 */
  sway: number;
  /** 꼬리 끝이 화면 가로로 흔들림 -1~1 */
  tail: number;
  /** 대기 중 한쪽 귀 쫑긋·귀 끝 털 떨림 0~1 */
  twitch: number;
}

const PLANTED: readonly [Foot, Foot] = [
  { z: 0, lift: 0 },
  { z: 0, lift: 0 },
];

/** 대기 4칸: 숨쉬기 + 귀 쫑긋(토리)·꼬리 살랑(도토) */
function idleMotion(i: number): Motion {
  const b = [0, 0.012, 0.024, 0.012][i];
  return {
    bob: 0,
    sx: 1 - b * 0.4,
    sy: 1 + b,
    lean: 0,
    shift: 0,
    feet: PLANTED,
    swing: 0,
    lag: -b * 10,
    sway: 0,
    tail: [0, 0.35, 0.7, 0.35][i],
    twitch: [0, 0, 1, 0.4][i],
  };
}

const STRIDE = 7;
const LIFT = 5;
const BOB = 3;

/** 걷기 4칸: 0 디딤(왼발 앞) → 1 지나감(오른발 듦) → 2 디딤(오른발 앞) → 3 지나감(왼발 듦) */
function walkMotion(i: number): Motion {
  const ph = (i / 4) * TAU;
  const c = Math.cos(ph);
  const s = Math.sin(ph);
  const contact = i % 2 === 0;
  // 앞으로 나가는(공중의) 발만 들리고 조금 더 앞에 둔다
  const upL = Math.max(0, -s);
  const upR = Math.max(0, s);
  return {
    bob: contact ? 0 : BOB,
    sx: contact ? 1.03 : 0.985,
    sy: contact ? 0.965 : 1.02,
    lean: 0.05,
    shift: -1.5 * s,
    feet: [
      { z: STRIDE * c + 2 * upL, lift: LIFT * upL },
      { z: -STRIDE * c + 2 * upR, lift: LIFT * upR },
    ],
    swing: c,
    lag: contact ? 1 : -1,
    sway: c,
    tail: -c,
    twitch: 0,
  };
}

// ---------------------------------------------------------------------------
// 돌려 보기: 몸 좌표 → 화면
// ---------------------------------------------------------------------------

interface Pt {
  x: number;
  y: number;
  /** 화면 쪽으로 나온 정도 (그리는 순서) */
  z: number;
}

/**
 * 바라보는 각도 a(0 = 정면 s, π/2 = 오른쪽 e, π = 뒷모습 n)로 돌린 몸.
 * 몸 좌표: lx = 정면에서 볼 때 화면 오른쪽, h = 발바닥에서 위로, lz = 몸의 앞쪽
 */
class Turn {
  readonly c: number;
  readonly s: number;
  constructor(
    readonly a: number,
    readonly m: Motion,
  ) {
    this.c = Math.cos(a);
    this.s = Math.sin(a);
  }

  /** planted = 땅을 딛는 발(들썩임·찌그러짐·기울기 없음) */
  p(lx: number, h: number, lz: number, planted = false): Pt {
    const m = this.m;
    const X = planted ? lx : lx + m.shift;
    const x0 = X * this.c + lz * this.s;
    const z = -X * this.s + lz * this.c;
    const hh = planted ? h : h * m.sy + m.bob;
    const x = CX + (planted ? x0 : x0 * m.sx + m.lean * hh * this.s);
    return { x, y: FEET_Y - hh + z * (planted ? FOOT_TILT : TILT), z };
  }

  /** 타원체(옆 반지름 rx, 앞뒤 반지름 rz)의 화면 가로 반지름 */
  w(rx: number, rz: number, planted = false): number {
    return Math.hypot(rx * this.c, rz * this.s) * (planted ? 1 : this.m.sx);
  }

  /** 세로 반지름 */
  h(ry: number): number {
    return ry * this.m.sy;
  }

  /** 몸 표면의 방위 phi(0 = 앞, + = 정면에서 볼 때 화면 오른쪽)가 화면을 보는 정도: 1 정면, 0 옆 가장자리, 음수 뒤쪽 */
  facing(phi: number): number {
    return Math.cos(phi + this.a);
  }
}

// ---------------------------------------------------------------------------
// 그리기 도구 (Path2D: 겹친 모양을 한 덩어리로 칠하고 바깥에만 외곽선)
// ---------------------------------------------------------------------------

function oval(path: Path2D, x: number, y: number, rx: number, ry: number, rot = 0): Path2D {
  path.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot));
  path.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
  return path;
}

const ovalP = (x: number, y: number, rx: number, ry: number, rot = 0): Path2D => oval(new Path2D(), x, y, rx, ry, rot);

/** 두 점을 잇는 길쭉한 타원 (팔·귀). extra = 양 끝으로 더 늘리는 길이 */
function capsule(a: { x: number; y: number }, b: { x: number; y: number }, w: number, extra: number): Path2D {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return ovalP((a.x + b.x) / 2, (a.y + b.y) / 2, Math.hypot(dx, dy) / 2 + extra, w, Math.atan2(dy, dx));
}

function starP(x: number, y: number, points: number, outer: number, inner: number): Path2D {
  const p = new Path2D();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    if (i) p.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else p.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  p.closePath();
  return p;
}

const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, k: number) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });

/** 외곽선을 먼저 두껍게 긋고 위에 칠한다(겹친 모양은 바깥 테두리만 남음). shade = 그 안에 얹는 그늘 */
function paint(ctx: Ctx, c: Colors, path: Path2D, fill: string, shade?: Path2D, shadeColor = c.shade): void {
  ctx.lineJoin = 'round';
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = LINE * 2;
  ctx.stroke(path);
  ctx.fillStyle = fill;
  ctx.fill(path);
  if (shade) {
    ctx.save();
    ctx.clip(path);
    ctx.fillStyle = shadeColor;
    ctx.fill(shade);
    ctx.restore();
  }
}

/** 큰 눈. k = 가로 줄임(옆으로 돌수록 좁아짐) */
function eye(ctx: Ctx, c: Colors, x: number, y: number, k: number): void {
  const p = ovalP(x, y, 4.6 * k, 5.6);
  ctx.save();
  ctx.fillStyle = c.eye;
  ctx.fill(p);
  ctx.clip(p);
  ctx.fillStyle = c.eyeLow;
  ctx.fill(ovalP(x + 0.6 * k, y + 4.6, 4.4 * k, 2.6));
  ctx.fillStyle = '#ffffff';
  ctx.fill(ovalP(x - 1.3 * k, y - 2.1, 1.9 * Math.max(k, 0.55), 1.9));
  ctx.fill(ovalP(x + 1.5 * k, y + 1.6, 0.8, 0.8));
  ctx.restore();
}

/** 초상과 같은 둥근 세모 코. k = 가로 줄임 */
function noseAt(ctx: Ctx, c: Colors, x: number, y: number, k: number): void {
  const p = new Path2D();
  p.moveTo(x - 2.8 * k, y - 1.2);
  p.quadraticCurveTo(x, y - 2.6, x + 2.8 * k, y - 1.2);
  p.quadraticCurveTo(x + 1 * k, y + 2, x, y + 2);
  p.quadraticCurveTo(x - 1 * k, y + 2, x - 2.8 * k, y - 1.2);
  ctx.fillStyle = c.nose;
  ctx.fill(p);
}

/** 'ω' 입. 옆모습(f 작음)은 코 아래에서 뒤로 짧게 */
function mouth(ctx: Ctx, c: Colors, x: number, y: number, f: number): void {
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (f > 0.45) {
    const k = 0.5 + 0.5 * f;
    ctx.moveTo(x, y + 2);
    ctx.lineTo(x, y + 3.6);
    ctx.moveTo(x - 3.4 * k, y + 3.6);
    ctx.quadraticCurveTo(x - 1.7 * k, y + 6, x, y + 3.6);
    ctx.quadraticCurveTo(x + 1.7 * k, y + 6, x + 3.4 * k, y + 3.6);
  } else {
    ctx.moveTo(x - 0.5, y + 2);
    ctx.quadraticCurveTo(x - 1.5, y + 4.6, x - 4.5, y + 4.2);
  }
  ctx.stroke();
}

function mintBow(ctx: Ctx, x: number, y: number, k: number): void {
  ctx.fillStyle = Palette.mint;
  ctx.strokeStyle = '#3f7d63';
  ctx.lineWidth = 1.8;
  for (const d of [-1, 1]) {
    const p = ovalP(x + d * 5 * k, y - d, 5.6 * Math.max(k, 0.6), 3.6, d * 0.45);
    ctx.fill(p);
    ctx.stroke(p);
  }
  const knot = ovalP(x, y, 2.4, 2.4);
  ctx.fill(knot);
  ctx.stroke(knot);
}

function acornAt(ctx: Ctx, c: Colors, x: number, y: number): void {
  paint(ctx, c, ovalP(x, y + 1, 5.4, 6.2), GOLD, ovalP(x - 3, y + 4, 5, 4), '#d39232');
  const cap = new Path2D();
  cap.ellipse(x, y - 3, 6.4, 3.6, 0, Math.PI, 0);
  cap.quadraticCurveTo(x, y - 0.6, x - 6.4, y - 3);
  ctx.fillStyle = ACORN_CAP;
  ctx.fill(cap);
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 1.8;
  ctx.stroke(cap);
  ctx.beginPath();
  ctx.moveTo(x, y - 6.4);
  ctx.lineTo(x + 1.4, y - 9);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fill(ovalP(x + 2, y + 1, 1.2, 2));
}

/** [깊이, 그리기] — 깊이가 작은(먼) 것부터 그린다 */
type Layer = [number, () => void];

interface TrunkSpec {
  /** 몸통 가운데 높이·반지름(옆 rx, 세로 ry, 앞뒤 rz) */
  h: number;
  rx: number;
  ry: number;
  rz: number;
  /** 뒷다리 허벅지: 옆 거리·높이·반지름 */
  thighX: number;
  thighH: number;
  thighRx: number;
  thighRy: number;
  thighRz: number;
  /** 배 무늬 높이 */
  bellyH: number;
}

/**
 * 몸통과 두 허벅지를 한 덩어리로(안쪽 외곽선 없이) 칠하고, 화면 쪽 허벅지에만 그늘과 가는 윤곽을 얹는다.
 * 허벅지는 같은 쪽 발을 따라 살짝 앞뒤로 간다. 배 무늬는 앞을 볼수록 넓게, 옆모습에서는 앞 가장자리에 좁게
 */
function trunkLayer(ctx: Ctx, c: Colors, t: Turn, s: TrunkSpec): Layer {
  const m = t.m;
  const bc = t.p(0, s.h, -1);
  const body = ovalP(bc.x, bc.y, t.w(s.rx, s.rz), t.h(s.ry));
  const thighs = ([-1, 1] as const).map((side, i) => {
    const p = t.p(side * s.thighX, s.thighH, -6 + m.feet[i].z * 0.3);
    const rw = t.w(s.thighRx, s.thighRz);
    const rh = t.h(s.thighRy);
    oval(body, p.x, p.y, rw, rh);
    return { p, rw, rh };
  });
  const front = t.facing(0);
  return [
    0,
    () => {
      paint(ctx, c, body, c.fur, ovalP(bc.x - 6, bc.y + 11, s.rx - 1, 9));
      ctx.save();
      ctx.clip(body);
      if (front > -0.1) {
        const bp = t.p(0, s.bellyH, 8 + 6 * (1 - Math.max(0, front)));
        ctx.fillStyle = c.belly;
        ctx.fill(ovalP(bp.x, bp.y, 10.5 * (0.45 + 0.55 * Math.max(0, front)), t.h(12)));
      }
      for (const { p, rw, rh } of thighs) {
        if (p.z < 1.5) continue;
        ctx.fillStyle = c.shade;
        ctx.fill(ovalP(p.x - 3, p.y + rh * 0.8, rw, rh * 0.45));
        ctx.strokeStyle = c.outline;
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, rw, rh, 0, Math.PI * 1.05, Math.PI * 1.85);
        ctx.stroke();
      }
      ctx.restore();
    },
  ];
}

// ---------------------------------------------------------------------------
// 토리 (흰 토끼)
// ---------------------------------------------------------------------------

function toriLayers(ctx: Ctx, t: Turn): Layer[] {
  const c = COLORS.tori;
  const m = t.m;
  const L: Layer[] = [];
  const front = t.facing(0);

  // 몸통 + 뒷다리 허벅지 + 흰 배
  L.push(trunkLayer(ctx, c, t, { h: 25, rx: 19, ry: 18.5, rz: 17, thighX: 9, thighH: 14, thighRx: 10, thighRy: 10.5, thighRz: 12, bellyH: 22 }));

  // 긴 발
  ([-1, 1] as const).forEach((side, i) => {
    const f = m.feet[i];
    const fc = t.p(side * 9, 6.2 + f.lift, 2 + f.z, true);
    const rot = 0.25 * (f.lift / LIFT) * t.s;
    const rx = t.w(6.5, 10.5, true);
    L.push([fc.z + i * 0.01, () => paint(ctx, c, ovalP(fc.x, fc.y, rx, 4.8, rot), c.fur, ovalP(fc.x - 1, fc.y + 3.6, rx, 2.4, rot))]);
  });

  // 팔: 반대쪽 발과 함께 앞뒤로
  ([-1, 1] as const).forEach((side) => {
    const sh = t.p(side * 14, 30, 4);
    const hand = t.p(side * 15.5, 21, 6 + side * 5 * m.swing);
    L.push([-side * 14 * t.s + 4 * t.c, () => paint(ctx, c, capsule(sh, hand, 5.2, 2.6), c.fur)]);
  });

  // 동그란 꼬리 (뒤)
  const tc = t.p(0, 16 + m.lag * 0.8, -18);
  L.push([-18 * t.c - 1, () => paint(ctx, c, starP(tc.x, tc.y, 9, 8.6, 7), c.belly)]);

  // 긴 귀: 머리 뒤. 왼귀가 조금 더 뒤로 눕는다(옆모습에서 두 귀가 갈라져 보이게). 몸보다 한 칸 늦게 따라온다
  ([-1, 1] as const).forEach((side) => {
    const base = t.p(side * 8, 72, 0);
    const lean = side < 0 ? -12 : -2;
    const droop = Math.max(0, -m.lag);
    const tw = side > 0 ? m.twitch : 0;
    const tip = t.p(side * (13 + droop * 2) + m.sway * 3 + side * tw * 3, 99 + 2.5 * m.lag - tw * 2, lean + (m.lag > 0 ? 2 : 5) * m.lag);
    const f = t.facing(side * 0.25);
    const w = 7.5 * (0.55 + 0.45 * Math.abs(f));
    const ear = capsule(base, tip, w, 3);
    const dx = -w * 0.75;
    L.push([
      49 + base.z * 0.01,
      () => {
        paint(ctx, c, ear, c.fur, capsule({ x: base.x + dx, y: base.y }, { x: tip.x + dx, y: tip.y }, w * 0.6, 4));
        if (f > 0.05) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, f * 1.6);
          ctx.fillStyle = c.earInner;
          ctx.fill(capsule(lerp(base, tip, 0.12), lerp(base, tip, 0.9), w * 0.48, 0));
          ctx.restore();
        }
      },
    ]);
  });

  // 머리 (+ 옆으로 돌면 살짝 나오는 주둥이)
  const hc = t.p(0, 54, 3);
  const mz = t.p(0, 47, 22);
  const head = ovalP(hc.x, hc.y, t.w(26, 22.5), t.h(21.5));
  oval(head, mz.x, mz.y, t.w(8, 7), t.h(6.5));
  L.push([
    50,
    () => {
      paint(ctx, c, head, c.fur, ovalP(hc.x - 6, hc.y + 13, 22, 10));
      ctx.save();
      ctx.clip(head);
      for (const side of [-1, 1]) {
        const phi = side * 1.0;
        const f = t.facing(phi);
        if (f <= 0.1) continue;
        const b = t.p(Math.sin(phi) * 19, 48, 3 + Math.cos(phi) * 19);
        ctx.fillStyle = c.blush;
        ctx.fill(ovalP(b.x, b.y, 4.6 * (0.4 + 0.6 * f), 2.6));
      }
      for (const side of [-1, 1]) {
        const phi = side * 0.55;
        const f = t.facing(phi);
        if (f < -0.3) continue;
        const e = t.p(Math.sin(phi) * 17, 55, 3 + Math.cos(phi) * 17);
        eye(ctx, c, e.x, e.y, 0.3 + 0.7 * Math.max(0, f));
      }
      if (front > -0.15) {
        const n = t.p(0, 50.5, 26);
        noseAt(ctx, c, n.x, n.y, 0.55 + 0.45 * Math.max(0, front));
        mouth(ctx, c, n.x, n.y, front);
      }
      ctx.restore();
    },
  ]);

  // 민트 리본 (왼귀 밑): 머리 너머로 가면 머리 뒤에
  const bow = t.p(-11, 73, 3);
  L.push([bow.z > -6 ? 51 : 49.9, () => mintBow(ctx, bow.x, bow.y, 0.45 + 0.55 * Math.abs(t.c))]);

  return L;
}

// ---------------------------------------------------------------------------
// 도토 (다람쥐)
// ---------------------------------------------------------------------------

/**
 * 꼬리 뼈대: [앞뒤 lz, 높이 h, 굵기 r, 옆으로 쓸린 정도 out]. 몸 뒤 아래에서 S자로 올라가
 * 머리 위에서 바깥(뒤)으로 말리고 끝이 아래로 갈고리처럼 굽는다 (작은 칸에서도 다람쥐로 읽히게)
 */
const DOTO_TAIL: [number, number, number, number][] = [
  [-10, 11, 6.5, 0],
  [-21, 17, 9, 0.55],
  [-28, 30, 10.5, 0.9],
  [-29, 46, 11, 1],
  [-24, 62, 11, 0.92],
  [-20, 76, 10.5, 0.9],
  [-22, 89, 9.5, 1],
  [-31, 95, 8.5, 1.25],
  [-38, 89, 7, 1.45],
  [-36, 81, 5.5, 1.4],
];

/** Catmull-Rom으로 뼈대 사이를 촘촘히 */
function tailSamples(n: number): { lz: number; h: number; r: number; out: number; u: number }[] {
  const P = DOTO_TAIL;
  const out: { lz: number; h: number; r: number; out: number; u: number }[] = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const f = u * (P.length - 1);
    const k = Math.min(P.length - 2, Math.floor(f));
    const s = f - k;
    const p0 = P[Math.max(0, k - 1)];
    const p1 = P[k];
    const p2 = P[k + 1];
    const p3 = P[Math.min(P.length - 1, k + 2)];
    const cr = (j: number) =>
      0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * s + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * s * s + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * s * s * s);
    out.push({ lz: cr(0), h: cr(1), r: cr(2), out: cr(3), u });
  }
  return out;
}

const TAIL_SAMPLES = tailSamples(40);

function dotoTail(ctx: Ctx, c: Colors, t: Turn): void {
  const m = t.m;
  // 꼬리는 늘 화면 왼쪽 뒤로 쓸어 올린다(정면·앞 3/4·뒤 3/4에서도 몸에 다 가리지 않게, 제안)
  const lat = -20 * t.c;
  const pts = TAIL_SAMPLES.map((q) => {
    const p = t.p(lat * q.out, q.h * 0.95, q.lz);
    const u2 = q.u * q.u;
    // 먼 꼬리가 시점 기울기로 너무 위아래로 가지 않게 기울기는 절반만
    return { x: p.x + m.tail * 5 * u2, y: p.y - p.z * TILT * 0.5 - m.lag * 4 * u2, r: q.r, u: q.u };
  });
  const path = new Path2D();
  for (const q of pts) oval(path, q.x, q.y, q.r, q.r);
  // 털 뭉치 (바깥쪽으로 볼록)
  const tufts: { x: number; y: number }[] = [];
  for (const u of [0.3, 0.52, 0.74, 0.9]) {
    const i = Math.round(u * (pts.length - 1));
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    let nx = -(b.y - a.y) / len;
    let ny = (b.x - a.x) / len;
    if (nx + ny * 0.6 > 0) {
      nx = -nx;
      ny = -ny;
    }
    const q = pts[i];
    const tuft = { x: q.x + nx * q.r * 0.82, y: q.y + ny * q.r * 0.82 };
    tufts.push(tuft);
    oval(path, tuft.x, tuft.y, 3.8, 3.8);
  }
  const shade = new Path2D();
  for (const q of pts) oval(shade, q.x - q.r * 0.75, q.y + q.r * 0.25, q.r * 0.62, q.r * 0.62);
  paint(ctx, c, path, c.fur, shade);
  // 가운데 밝은 결
  ctx.save();
  ctx.clip(path);
  ctx.strokeStyle = c.stripe;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  pts.slice(2, -2).forEach((q, i) => (i ? ctx.lineTo(q.x + q.r * 0.2, q.y) : ctx.moveTo(q.x + q.r * 0.2, q.y)));
  ctx.stroke();
  ctx.restore();
  // 털결 짧은 선
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  for (const tf of tufts.slice(0, 3)) {
    ctx.beginPath();
    ctx.moveTo(tf.x + 1, tf.y + 3.5);
    ctx.lineTo(tf.x + 4.5, tf.y + 1.5);
    ctx.stroke();
  }
}

function dotoLayers(ctx: Ctx, t: Turn): Layer[] {
  const c = COLORS.doto;
  const m = t.m;
  const L: Layer[] = [];
  const front = t.facing(0);

  // 큰 꼬리: 앞·옆을 볼 때는 몸 뒤, 등을 보일 때는 몸과 머리 앞
  L.push([t.c < -0.3 ? 60 : -20, () => dotoTail(ctx, c, t)]);

  // 몸통 + 뒷다리 허벅지 + 크림 배
  L.push(trunkLayer(ctx, c, t, { h: 24, rx: 18, ry: 18.5, rz: 16, thighX: 8, thighH: 13, thighRx: 9, thighRy: 9.5, thighRz: 11, bellyH: 21 }));

  // 발 (짙은 갈색)
  ([-1, 1] as const).forEach((side, i) => {
    const f = m.feet[i];
    const fc = t.p(side * 8.5, 6 + f.lift, 2 + f.z, true);
    const rot = 0.25 * (f.lift / LIFT) * t.s;
    L.push([fc.z + i * 0.01, () => paint(ctx, c, ovalP(fc.x, fc.y, t.w(6, 9, true), 4.5, rot), c.shade)]);
  });

  // 머리 (+ 옆으로 돌면 나오는 주둥이) + 크림빛 볼·주둥이
  const hc = t.p(0, 52, 3);
  const mz = t.p(0, 45, 20);
  const head = ovalP(hc.x, hc.y, t.w(24, 20.5), t.h(20.5));
  oval(head, mz.x, mz.y, t.w(8.5, 7), t.h(7));
  L.push([
    50,
    () => {
      paint(ctx, c, head, c.fur, ovalP(hc.x - 6, hc.y + 13, 20, 9));
      ctx.save();
      ctx.clip(head);
      if (front > -0.2) {
        const cp = t.p(0, 44, 19);
        ctx.fillStyle = c.belly;
        ctx.fill(ovalP(cp.x, cp.y, 13 * (0.55 + 0.45 * Math.max(0, front)), t.h(8.5)));
      }
      for (const side of [-1, 1]) {
        const phi = side * 1.0;
        const f = t.facing(phi);
        if (f <= 0.1) continue;
        const b = t.p(Math.sin(phi) * 18, 46, 3 + Math.cos(phi) * 18);
        ctx.fillStyle = c.blush;
        ctx.fill(ovalP(b.x, b.y, 4.4 * (0.4 + 0.6 * f), 2.5));
      }
      for (const side of [-1, 1]) {
        const phi = side * 0.55;
        const f = t.facing(phi);
        if (f < -0.3) continue;
        const e = t.p(Math.sin(phi) * 16, 53, 3 + Math.cos(phi) * 16);
        const k = 0.3 + 0.7 * Math.max(0, f);
        // 초상처럼 눈 둘레의 크림빛 테
        ctx.fillStyle = c.belly;
        ctx.fill(ovalP(e.x, e.y, 6.6 * k + 0.6, 7.2));
        eye(ctx, c, e.x, e.y, k);
      }
      if (front > -0.15) {
        const n = t.p(0, 48.5, 26);
        noseAt(ctx, c, n.x, n.y, 0.55 + 0.45 * Math.max(0, front));
        mouth(ctx, c, n.x, n.y, front);
      }
      ctx.restore();
    },
  ]);

  // 뾰족한 귀와 귀 끝 털 (머리 뒤)
  ([-1, 1] as const).forEach((side) => {
    const yaw = side * 0.35;
    const cx = side * 11;
    const vx = Math.cos(yaw);
    const vz = -Math.sin(yaw);
    let bl = t.p(cx - vx * 7.5, 65, -vz * 7.5);
    let br = t.p(cx + vx * 7.5, 65, vz * 7.5);
    // 옆으로 돌아도 너무 얇아지지 않게
    const spread = br.x - bl.x;
    if (Math.abs(spread) < 7) {
      const mid = (bl.x + br.x) / 2;
      const half = (spread < 0 ? -7 : 7) / 2;
      bl = { ...bl, x: mid - half };
      br = { ...br, x: mid + half };
    }
    const tw = side > 0 ? m.twitch : 0;
    const tip = t.p(side * 13.5 + side * tw * 1.5, 87 + m.lag * 1.2, -3 + m.lag * 1.5);
    const f = t.facing(yaw);
    const mid = lerp(bl, br, 0.5);
    const ear = new Path2D();
    ear.moveTo(bl.x, bl.y);
    ear.quadraticCurveTo(bl.x - 1, (bl.y + tip.y) / 2, tip.x, tip.y);
    ear.quadraticCurveTo(br.x + 1, (br.y + tip.y) / 2, br.x, br.y);
    ear.closePath();
    L.push([
      49 + (bl.z + br.z) * 0.005,
      () => {
        paint(ctx, c, ear, c.fur);
        if (f > 0.05) {
          const ib = lerp(bl, br, 0.25);
          const ie = lerp(bl, br, 0.75);
          const it = lerp(mid, tip, 0.78);
          const inner = new Path2D();
          inner.moveTo(ib.x, ib.y);
          inner.quadraticCurveTo(ib.x, (ib.y + it.y) / 2, it.x, it.y);
          inner.quadraticCurveTo(ie.x, (ie.y + it.y) / 2, ie.x, ie.y);
          inner.closePath();
          ctx.save();
          ctx.globalAlpha = Math.min(1, f * 1.6);
          ctx.fillStyle = c.earInner;
          ctx.fill(inner);
          ctx.restore();
        }
        ctx.strokeStyle = c.outline;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(tip.x - 2 - tw, tip.y - 6);
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(tip.x + 3 + tw, tip.y - 5);
        ctx.stroke();
      },
    ]);
  });

  // 두 손에 든 황금 도토리: 몸보다 한 칸 늦게 들썩인다. 등을 보이면 몸에 가린다
  const ac = t.p(0, 27 - m.lag * 0.9, 14);
  const hands = ([-1, 1] as const).map((side) => ({ side, p: t.p(side * 7.5, 26 - m.lag * 0.6, 15.5) }));
  const show = t.c > -0.25;
  const base = show ? 55 : -5;
  L.push([base + ac.z * 0.01, () => acornAt(ctx, c, ac.x, ac.y)]);
  for (const { side, p } of hands) {
    L.push([base + p.z * 0.01, () => paint(ctx, c, ovalP(p.x, p.y, 3.7 * (0.65 + 0.35 * Math.abs(t.c)), 4.6, side * 0.3 * t.c), c.fur)]);
  }

  return L;
}

// ---------------------------------------------------------------------------
// 연출: 잠듦(ko)·기절(stun)
// ---------------------------------------------------------------------------

/** 칠하고, 그 안에만 그늘을 얹고, 외곽선 (잠듦 그림용) */
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
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

const el = (ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) => () => ellipse(ctx, x, y, rx, ry, rot);

function drawKo(ctx: Ctx, id: KeeperSpriteId, c: Colors): void {
  // 웅크려 잠든 모습 (옆으로 누움)
  if (id === 'doto') part(ctx, c, el(ctx, 42, 102, 18, 14, -0.2), c.fur, el(ctx, 38, 110, 16, 6));
  part(ctx, c, el(ctx, 62, 108, 26, 14), c.fur, el(ctx, 56, 116, 24, 6));
  if (id === 'tori') {
    part(ctx, c, () => starPath(ctx, 38, 106, 9, 7, 5.8), c.belly);
    // 뒤로 누운 긴 귀
    part(ctx, c, el(ctx, 68, 96, 18, 6, 0.18), c.fur, el(ctx, 66, 99, 16, 3, 0.18));
  } else {
    part(
      ctx,
      c,
      () => {
        ctx.beginPath();
        ctx.moveTo(76, 96);
        ctx.quadraticCurveTo(74, 86, 80, 80);
        ctx.quadraticCurveTo(88, 86, 90, 94);
        ctx.closePath();
      },
      c.fur,
    );
  }
  part(ctx, c, el(ctx, 84, 106, 16, 14), c.fur, el(ctx, 80, 114, 14, 5));
  // 감은 눈
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(88, 104, 3.4, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.fillStyle = c.blush;
  ellipse(ctx, 90, 110, 4.4, 2.6);
  ctx.fill();
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

// ---------------------------------------------------------------------------
// 시트
// ---------------------------------------------------------------------------

/** 방향 → 바라보는 각도와 좌우 뒤집기 (왼쪽 계열은 오른쪽 계열을 뒤집음) */
const ANGLE: Record<Dir, { a: number; flip: boolean }> = {
  s: { a: 0, flip: false },
  se: { a: Math.PI / 4, flip: false },
  e: { a: Math.PI / 2, flip: false },
  ne: { a: (3 * Math.PI) / 4, flip: false },
  n: { a: Math.PI, flip: false },
  sw: { a: Math.PI / 4, flip: true },
  w: { a: Math.PI / 2, flip: true },
  nw: { a: (3 * Math.PI) / 4, flip: true },
};

/** 한 칸 (128×128, 발끝 = FEET_Y) */
function drawCell(ctx: Ctx, id: KeeperSpriteId, dir: Dir, m: Motion): void {
  const { a, flip } = ANGLE[dir];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (flip) {
    ctx.translate(CELL, 0);
    ctx.scale(-1, 1);
  }
  const t = new Turn(a, m);
  const layers = id === 'tori' ? toriLayers(ctx, t) : dotoLayers(ctx, t);
  layers.sort((p, q) => p[0] - q[0]).forEach(([, draw]) => draw());
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
      drawCell(ctx, id, 's', idleMotion(0));
      drawStunStars(ctx);
    }
    return;
  }
  const idle = col < LUMI_COLS.idle;
  const m = idle ? idleMotion(col % 4) : walkMotion((col - LUMI_COLS.idle) % 4);
  drawCell(ctx, id, dir, m);
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
