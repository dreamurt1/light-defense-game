// 등불지기 5종. 동물·이름·색은 기획서/데이터가 원본이고, 둥근 2등신 형태와 질감은 Sprite & Asset Reference Sheet를 참고한다.
// 같은 그리기 함수로 초상(192×192)과 게임 스프라이트 프레임(96×96)을 만든다.
// 애니메이션은 기획서대로: 주인공은 이동하지 않으므로 대기·빛 발사·피격만 (시트의 이동·점프·사망 프레임은 쓰지 않음).
import type { CharacterId } from '../data';
import { type Ctx, Ink, Palette, ellipse, starPath } from './kit';

type Ear = 'cat' | 'rabbit' | 'hamster' | 'capybara' | 'dog';
type Eye = 'gem' | 'bead' | 'sleepy';

interface Spec {
  fur: string;
  shade: string;
  outline: string;
  belly?: string;
  ear: Ear;
  earInner: string;
  eye: Eye;
  eyeColor: string;
  nose: string;
  muzzle?: string;
  cheeks?: string;
  blush?: string;
  tail: 'curl' | 'puff' | 'wag' | 'none';
  accessory: 'scarf' | 'bow' | 'pouch' | 'yuzu' | 'collar';
}

// 색은 데이터의 캐릭터 색(characters.json color)을 몸빛으로 쓰고 나머지는 팔레트에서 섞은 값 (제안: 기획서에 없음)
const SPECS: Record<CharacterId, Spec> = {
  lumi: {
    fur: '#1d1828',
    shade: '#120f1a',
    outline: '#0a0810',
    ear: 'cat',
    earInner: '#3d2b45',
    eye: 'gem',
    eyeColor: Palette.mint,
    nose: Palette.dawn,
    tail: 'curl',
    accessory: 'scarf',
  },
  tori: {
    fur: '#F3EEE6',
    shade: '#D6CEC8',
    outline: '#5a4f5e',
    belly: '#FFFFFF',
    ear: 'rabbit',
    earInner: '#F2B8C8',
    eye: 'bead',
    eyeColor: '#2A2440',
    nose: '#E88AA0',
    blush: 'rgba(242,150,170,0.55)',
    tail: 'puff',
    accessory: 'bow',
  },
  doto: {
    fur: '#D9A066',
    shade: '#B5793F',
    outline: '#5a3a22',
    belly: '#F6E6CF',
    ear: 'hamster',
    earInner: '#F2B8C8',
    eye: 'bead',
    eyeColor: '#2A1E1A',
    nose: '#E88AA0',
    cheeks: '#F6E6CF',
    blush: 'rgba(242,150,170,0.5)',
    tail: 'none',
    accessory: 'pouch',
  },
  baru: {
    fur: '#8C6A4F',
    shade: '#6B4E39',
    outline: '#3a2a1e',
    ear: 'capybara',
    earInner: '#6B4E39',
    eye: 'sleepy',
    eyeColor: '#2A1E1A',
    nose: '#3a2a1e',
    muzzle: '#7A5A42',
    tail: 'none',
    accessory: 'yuzu',
  },
  mong: {
    fur: '#FFE0A3',
    shade: '#E3BE7E',
    outline: '#6a4e2a',
    belly: '#FFF1D6',
    ear: 'dog',
    earInner: '#D9A066',
    eye: 'bead',
    eyeColor: '#2A1E1A',
    nose: '#3a2a1e',
    muzzle: '#FFF1D6',
    blush: 'rgba(242,150,170,0.45)',
    tail: 'wag',
    accessory: 'collar',
  },
};

export interface Pose {
  /** 얼굴이 오른쪽(등불 쪽)을 향하는 정도 */
  face: number;
  /** 몸을 앞으로 기울임 (px) */
  lean: number;
  /** 앞발을 들어 빛을 보냄 */
  pawUp: boolean;
  eyes: 'open' | 'blink' | 'squeeze';
  /** 피격 시 납작해짐 (1 = 그대로) */
  squash: number;
  tail: number;
  /** 앞발 끝 반짝임 */
  sparkle: boolean;
  /** 등불 쪽 테두리 빛 */
  rim: boolean;
}

const BASE: Pose = { face: 3, lean: 0, pawUp: false, eyes: 'open', squash: 1, tail: 0, sparkle: false, rim: false };

function shadeFill(ctx: Ctx, top: number, bottom: number): void {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, 'rgba(255,255,255,0.14)');
  g.addColorStop(0.55, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = g;
  ctx.fill();
}

function fillStroke(ctx: Ctx, s: Spec, fill: string, top: number, bottom: number): void {
  ctx.fillStyle = fill;
  ctx.fill();
  shadeFill(ctx, top, bottom);
  ctx.strokeStyle = s.outline;
  ctx.lineWidth = 2.2;
  ctx.stroke();
}

function drawEars(ctx: Ctx, s: Spec, hx: number, hy: number, front: boolean): void {
  const sides = [-1, 1];
  if (s.ear === 'dog') {
    if (!front) return;
    for (const d of sides) {
      ellipse(ctx, hx + d * 22, hy + 2, 8, 15, d * 0.35);
      fillStroke(ctx, s, s.earInner, hy - 12, hy + 16);
    }
    return;
  }
  if (front) return;
  for (const d of sides) {
    ctx.beginPath();
    if (s.ear === 'cat') {
      ctx.moveTo(hx + d * 20, hy - 8);
      ctx.lineTo(hx + d * 17, hy - 32);
      ctx.lineTo(hx + d * 4, hy - 20);
    } else if (s.ear === 'rabbit') {
      ellipse(ctx, hx + d * 9, hy - 36, 7.5, 19, d * 0.12);
    } else if (s.ear === 'hamster') {
      ctx.arc(hx + d * 17, hy - 18, 8, 0, Math.PI * 2);
    } else {
      ctx.arc(hx + d * 15, hy - 20, 5.5, 0, Math.PI * 2);
    }
    ctx.closePath();
    fillStroke(ctx, s, s.fur, hy - 56, hy - 8);
    // 귀 안쪽
    ctx.beginPath();
    if (s.ear === 'cat') {
      ctx.moveTo(hx + d * 17, hy - 12);
      ctx.lineTo(hx + d * 15.5, hy - 26);
      ctx.lineTo(hx + d * 8, hy - 19);
    } else if (s.ear === 'rabbit') {
      ellipse(ctx, hx + d * 9, hy - 35, 3.6, 13, d * 0.12);
    } else if (s.ear === 'hamster') {
      ctx.arc(hx + d * 17, hy - 18, 4.5, 0, Math.PI * 2);
    } else {
      ctx.arc(hx + d * 15, hy - 20, 2.6, 0, Math.PI * 2);
    }
    ctx.closePath();
    ctx.fillStyle = s.earInner;
    ctx.fill();
  }
}

function drawEyes(ctx: Ctx, s: Spec, ex: number, ey: number, mode: Pose['eyes']): void {
  for (const d of [-1, 1]) {
    const x = ex + d * 8.5;
    if (mode === 'squeeze') {
      ctx.strokeStyle = s.eye === 'gem' ? s.eyeColor : s.eyeColor;
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 4, ey - 3 * d * 0 - 3);
      ctx.lineTo(x + 1 * d, ey);
      ctx.lineTo(x - 4, ey + 3);
      ctx.stroke();
      continue;
    }
    if (mode === 'blink' || s.eye === 'sleepy') {
      ctx.strokeStyle = s.eye === 'gem' ? s.eyeColor : s.eyeColor;
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, ey - 1, 4.2, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      continue;
    }
    if (s.eye === 'gem') {
      // 크고 빛나는 초록 눈 + 세로 동공
      ellipse(ctx, x, ey, 5.6, 6.6);
      ctx.fillStyle = s.eyeColor;
      ctx.fill();
      ellipse(ctx, x + 0.6, ey + 0.4, 1.8, 4.2);
      ctx.fillStyle = '#0d1f1a';
      ctx.fill();
    } else {
      ellipse(ctx, x, ey, 4.4, 5.2);
      ctx.fillStyle = s.eyeColor;
      ctx.fill();
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x - 1.8, ey - 2.2, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawAccessory(ctx: Ctx, s: Spec, hx: number, hy: number, bx: number, by: number): void {
  switch (s.accessory) {
    case 'scarf': {
      ctx.fillStyle = Ink.scarf;
      ctx.beginPath();
      ctx.roundRect(bx - 17, by - 18, 34, 8, 4);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bx - 9, by - 12);
      ctx.lineTo(bx - 15, by + 4);
      ctx.lineTo(bx - 6, by + 1);
      ctx.lineTo(bx - 3, by - 11);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,40,20,0.35)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      break;
    }
    case 'bow': {
      ctx.fillStyle = Palette.mint;
      for (const d of [-1, 1]) {
        ellipse(ctx, hx + 13 + d * 5, hy - 22, 5, 3.6, d * 0.5);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(hx + 13, hy - 22, 2.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'pouch': {
      // 볼주머니에 넣은 해바라기씨
      ctx.fillStyle = '#5a3a22';
      ellipse(ctx, bx + 12, by + 2, 3, 5.4, 0.4);
      ctx.fill();
      ctx.strokeStyle = Palette.paper;
      ctx.lineWidth = 1;
      ctx.stroke();
      break;
    }
    case 'yuzu': {
      // 머리 위 유자 하나
      ctx.fillStyle = Palette.amber;
      ctx.beginPath();
      ctx.arc(hx + 2, hy - 24, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#B8742A';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = Palette.mint;
      ellipse(ctx, hx + 7, hy - 32, 4.4, 2.2, -0.6);
      ctx.fill();
      break;
    }
    case 'collar': {
      ctx.fillStyle = Palette.mint;
      ctx.beginPath();
      ctx.roundRect(bx - 16, by - 18, 32, 6, 3);
      ctx.fill();
      ctx.fillStyle = Palette.amber;
      ctx.beginPath();
      ctx.arc(bx + 3, by - 10, 3.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}

/** 원점(0,0) = 몸 가운데. 키는 대략 y −58 ~ +40 */
export function drawKeeper(ctx: Ctx, id: CharacterId, pose: Partial<Pose> = {}): void {
  const s = SPECS[id];
  const p = { ...BASE, ...pose };
  ctx.save();
  ctx.scale(1 / p.squash ** 0.4, p.squash);

  const bx = p.lean * 0.4;
  const by = 14;
  const hx = p.lean + p.face * 0.4;
  const hy = -22;

  // 꼬리 (몸 뒤)
  if (s.tail !== 'none') {
    ctx.save();
    ctx.translate(bx - 16, by + 14);
    ctx.rotate(p.tail);
    ctx.lineCap = 'round';
    if (s.tail === 'curl') {
      ctx.strokeStyle = s.outline;
      ctx.lineWidth = 8.6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-18, 2, -16, -20);
      ctx.stroke();
      ctx.strokeStyle = s.fur;
      ctx.lineWidth = 5.6;
      ctx.stroke();
    } else if (s.tail === 'wag') {
      ellipse(ctx, -8, -8, 6, 11, -0.7);
      fillStroke(ctx, s, s.fur, -18, 2);
    } else {
      ctx.beginPath();
      ctx.arc(-4, -2, 7, 0, Math.PI * 2);
      fillStroke(ctx, s, s.belly ?? s.fur, -9, 5);
    }
    ctx.restore();
  }

  // 몸
  ellipse(ctx, bx, by, 20, 21);
  fillStroke(ctx, s, s.fur, by - 21, by + 21);
  if (s.belly) {
    ellipse(ctx, bx + p.face * 0.6, by + 5, 12, 13);
    ctx.fillStyle = s.belly;
    ctx.fill();
  }
  // 발
  for (const d of [-1, 1]) {
    ellipse(ctx, bx + d * 9, by + 20, 7, 4.6);
    fillStroke(ctx, s, s.shade, by + 15, by + 25);
  }

  drawEars(ctx, s, hx, hy, false);
  // 머리
  if (s.ear === 'capybara') {
    ctx.beginPath();
    ctx.roundRect(hx - 23, hy - 22, 46, 42, 18);
  } else {
    ctx.beginPath();
    ctx.arc(hx, hy, 23, 0, Math.PI * 2);
  }
  fillStroke(ctx, s, s.fur, hy - 23, hy + 23);
  drawEars(ctx, s, hx, hy, true);

  if (s.cheeks) {
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(hx + d * 15, hy + 7, 9, 0, Math.PI * 2);
      fillStroke(ctx, s, s.cheeks, hy - 2, hy + 16);
    }
  }
  const fx = hx + p.face;
  if (s.muzzle) {
    ellipse(ctx, fx, hy + 8, s.ear === 'capybara' ? 15 : 10, s.ear === 'capybara' ? 10 : 7.5);
    ctx.fillStyle = s.muzzle;
    ctx.fill();
  }
  drawEyes(ctx, s, fx, hy - 1, p.eyes);
  // 코와 입
  ctx.fillStyle = s.nose;
  if (s.ear === 'capybara') {
    for (const d of [-1, 1]) {
      ellipse(ctx, fx + d * 5, hy + 6, 1.8, 1.2);
      ctx.fill();
    }
  } else {
    ellipse(ctx, fx, hy + 5, 2.6, 1.9);
    ctx.fill();
  }
  ctx.strokeStyle = s.ear === 'cat' ? 'rgba(242,184,128,0.8)' : s.outline;
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(fx - 3.6, hy + 7.2);
  ctx.arc(fx - 1.8, hy + 7.2, 1.8, Math.PI, 0, true);
  ctx.arc(fx + 1.8, hy + 7.2, 1.8, Math.PI, 0, true);
  ctx.stroke();
  if (s.blush) {
    ctx.fillStyle = s.blush;
    for (const d of [-1, 1]) {
      ellipse(ctx, fx + d * 13, hy + 6, 3.6, 2.2);
      ctx.fill();
    }
  }

  drawAccessory(ctx, s, hx, hy, bx, by);

  // 앞발: 빛을 보낼 때 등불 쪽으로 든다
  for (const d of [-1, 1]) {
    const up = p.pawUp && d === 1;
    ellipse(ctx, bx + d * 9 + (up ? 12 : 0), by + (up ? -6 : 8), 6, 5.4, up ? -0.6 : 0);
    fillStroke(ctx, s, s.fur, by - 10, by + 14);
  }
  if (p.sparkle) {
    ctx.fillStyle = '#FFF1C9';
    ctx.shadowColor = 'rgba(255,200,87,0.95)';
    ctx.shadowBlur = 8;
    starPath(ctx, bx + 28, by - 12, 4, 9, 2.4);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  if (p.rim) {
    // 등불 쪽(오른쪽) 테두리에 비친 빛
    ctx.strokeStyle = 'rgba(255,200,87,0.6)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(hx, hy, 22, -1.2, 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(bx, by, 19.5, 20.5, 0, -1, 0.9);
    ctx.stroke();
  }
  ctx.restore();
}

export const PORTRAIT = { size: 192, scale: 1.6, cx: 96, cy: 124 } as const;

/** 초상: 선택·홈·상점 화면용 (192×192, 투명 배경) */
export function drawPortrait(ctx: Ctx, id: CharacterId): void {
  ctx.save();
  ctx.translate(PORTRAIT.cx, PORTRAIT.cy);
  ctx.scale(PORTRAIT.scale, PORTRAIT.scale);
  drawKeeper(ctx, id, { face: 2 });
  ctx.restore();
}

/** 게임 스프라이트: 96×96 프레임. 0~3 대기, 4~6 빛 발사, 7~8 피격 */
export const KEEPER_SPRITE = { size: 96, scale: 1.05, cx: 48, cy: 52, frames: 9 } as const;

const KEEPER_POSES: Partial<Pose>[] = [
  { tail: -0.12 },
  { tail: 0.04 },
  { tail: 0.16 },
  { tail: 0.04, eyes: 'blink' },
  { lean: 2, tail: 0.1 },
  { lean: 4, pawUp: true, tail: 0.2 },
  { lean: 4, pawUp: true, tail: 0.2, sparkle: true },
  { squash: 0.88, eyes: 'squeeze', tail: -0.3 },
  { squash: 0.96, tail: -0.1 },
];

export function drawKeeperFrame(ctx: Ctx, id: CharacterId, frame: number): void {
  ctx.save();
  ctx.translate(KEEPER_SPRITE.cx, KEEPER_SPRITE.cy);
  ctx.scale(KEEPER_SPRITE.scale, KEEPER_SPRITE.scale);
  drawKeeper(ctx, id, { ...KEEPER_POSES[frame], rim: true });
  ctx.restore();
}

export const KEEPER_ANIMS = [
  { suffix: 'idle', frames: [0, 1, 2, 1, 0, 1, 2, 3], frameRate: 5, repeat: -1 },
  { suffix: 'cast', frames: [4, 5, 6, 5], frameRate: 16, repeat: 0 },
  { suffix: 'hit', frames: [7, 8, 7, 8], frameRate: 14, repeat: 0 },
] as const;
