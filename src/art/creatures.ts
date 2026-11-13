// 2026-11-13 컨셉 시연판: 새 적·주민 임시 코드 그림 규격 (registry가 PNG로 내보냄, 게임은 entities/enemies/Creature.ts).
// 키 규칙: 호스틸·잃어버린 주민 = `${id}-dark`, 잃어버린 주민 제 모습 = `${id}-true`, 패시브 = `${id}`.
// 애니메이션 = `${키}-move` (frames 칸을 돌림). cy = 발(바닥에 닿는 곳) 또는 나는 종은 몸 가운데.
// 세 무리를 글 없이 모양으로 구분한다 (모양·색은 모두 제안):
//  - 호스틸(늑대·뱀파이어): 뾰족뾰족한 검은 털 실루엣 + 각진 눈썹 + 보랏빛으로 빛나는 눈
//  - 잃어버린 주민(고슴도치·레서판다): 'dark' = 동그란 검은 털뭉치 + 보랏빛 눈, 귀·꼬리 끝에 제 색이 살짝 / 'true' = 제 색과 웃는 얼굴
//  - 패시브(올빼미·나방·반딧불이): 탁한 라벤더·청록·잿빛, 빛나지 않는 졸린 눈, 둥글고 작은 실루엣
import { type Ctx, Palette, ellipse, starPath } from './kit';

export type CreatureId = 'werewolf' | 'vampire' | 'hedgehog' | 'redpanda' | 'owl' | 'moth' | 'firefly';
export type CreatureLook = 'dark' | 'true' | 'plain';

export interface CreatureArt {
  size: number;
  cy: number;
  frames: number;
  looks: readonly CreatureLook[];
  flies: boolean;
}

export const CREATURES: Record<CreatureId, CreatureArt> = {
  werewolf: { size: 96, cy: 84, frames: 2, looks: ['dark'], flies: false },
  vampire: { size: 80, cy: 44, frames: 2, looks: ['dark'], flies: true },
  hedgehog: { size: 64, cy: 54, frames: 2, looks: ['dark', 'true'], flies: false },
  redpanda: { size: 72, cy: 62, frames: 2, looks: ['dark', 'true'], flies: false },
  owl: { size: 72, cy: 62, frames: 2, looks: ['plain'], flies: false },
  moth: { size: 64, cy: 32, frames: 2, looks: ['plain'], flies: true },
  firefly: { size: 48, cy: 24, frames: 2, looks: ['plain'], flies: true },
};

export const creatureKey = (id: CreatureId, look: CreatureLook): string => (look === 'plain' ? id : `${id}-${look}`);
export const creatureAnim = (id: CreatureId, look: CreatureLook): string => `${creatureKey(id, look)}-move`;
export const isCreature = (id: string): id is CreatureId => id in CREATURES;

// ---------------------------------------------------------------------------
// 공통 색·도구
// ---------------------------------------------------------------------------

/** 빛을 잃은 털 (박쥐·개구리와 같은 색) */
const DARK_FUR = '#14111F';
const DARK_FUR2 = '#1E1930';
const MOON_RIM = 'rgba(168,156,217,0.32)';
const EYE_GLOW = '#D6CCFF';
const LINE_TRUE = '#3A2418';
/** 볼 홍조: 빨강 대신 새벽빛(DAWN) */
const BLUSH = 'rgba(242,184,128,0.7)';

/** 보랏빛으로 빛나는 눈 */
function glowEyes(ctx: Ctx, pts: [number, number][], rx: number, ry: number, rot = 0): void {
  ctx.save();
  ctx.shadowColor = Palette.lavender;
  ctx.shadowBlur = 8;
  ctx.fillStyle = EYE_GLOW;
  pts.forEach(([x, y], i) => {
    ellipse(ctx, x, y, rx, ry, i === 0 ? rot : -rot);
    ctx.fill();
  });
  ctx.restore();
}

/** 호스틸의 각진 눈썹: 가운데로 내려가는 V */
function angryBrows(ctx: Ctx, cx: number, y: number, gap: number, w: number): void {
  ctx.save();
  ctx.strokeStyle = '#B9AEEA';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - gap - w, y - 3);
  ctx.lineTo(cx - gap, y + 1.5);
  ctx.moveTo(cx + gap + w, y - 3);
  ctx.lineTo(cx + gap, y + 1.5);
  ctx.stroke();
  ctx.restore();
}

/** 털 끝에 비친 달빛 한 줄 */
function moonRim(ctx: Ctx, x: number, y: number, r: number, a0 = -2.6, a1 = -0.6): void {
  ctx.strokeStyle = MOON_RIM;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(x, y, r, a0, a1);
  ctx.stroke();
}

/** 웃는 얼굴의 동그란 눈 (반짝임 포함) */
function happyEyes(ctx: Ctx, pts: [number, number][], r: number): void {
  for (const [x, y] of pts) {
    ctx.fillStyle = '#2A1C16';
    ellipse(ctx, x, y, r, r * 1.15);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.4, r * 0.38, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 졸린 눈: 아래 반쪽만 보이고 위에 눈꺼풀 선 (빛나지 않음) */
function sleepyEyes(ctx: Ctx, pts: [number, number][], r: number, lid: string, pupil = '#2E2B40'): void {
  for (const [x, y] of pts) {
    ctx.fillStyle = pupil;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.75, 0, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = lid;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - r - 0.8, y - 0.2);
    ctx.quadraticCurveTo(x, y + 0.8, x + r + 0.8, y - 0.2);
    ctx.stroke();
  }
}

function smile(ctx: Ctx, x: number, y: number, r: number, color = LINE_TRUE): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, r, 0.25, Math.PI - 0.25);
  ctx.stroke();
}

function blush(ctx: Ctx, pts: [number, number][], rx = 2.8, ry = 1.7): void {
  ctx.fillStyle = BLUSH;
  for (const [x, y] of pts) {
    ellipse(ctx, x, y, rx, ry);
    ctx.fill();
  }
}

/** 둥근 가시(부드러운 물결 테두리)의 털뭉치 실루엣 */
function scallopBall(ctx: Ctx, x: number, y: number, r: number, bumps: number, bumpR: number, from = Math.PI, to = Math.PI * 2): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i <= bumps; i++) {
    const a = from + ((to - from) * i) / bumps;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, bumpR, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// 호스틸
// ---------------------------------------------------------------------------

/** 큰 늑대: 뾰족한 털 실루엣, 쫑긋한 귀, 각진 눈썹. 0·1 = 걸음 */
function drawWerewolf(ctx: Ctx, frame: number): void {
  const cx = 48;
  const cy = CREATURES.werewolf.cy;
  const step = frame === 0 ? 1 : -1;
  const bob = frame === 0 ? 0 : -2;
  ctx.fillStyle = DARK_FUR;
  // 꼬리 (뒤, 왼쪽 위로 뻗은 뾰족한 털)
  ctx.beginPath();
  ctx.moveTo(cx - 18, cy - 24 + bob);
  ctx.lineTo(cx - 40, cy - 40 + bob + step * 2);
  ctx.lineTo(cx - 32, cy - 36 + bob);
  ctx.lineTo(cx - 42, cy - 30 + bob + step);
  ctx.lineTo(cx - 30, cy - 28 + bob);
  ctx.lineTo(cx - 36, cy - 20 + bob);
  ctx.lineTo(cx - 18, cy - 16 + bob);
  ctx.closePath();
  ctx.fill();
  // 네 다리 (걸음마다 앞뒤로)
  for (const [x, s] of [
    [cx - 16, step],
    [cx - 6, -step],
    [cx + 6, step],
    [cx + 16, -step],
  ] as const) {
    ctx.fillStyle = x === cx - 6 || x === cx + 6 ? DARK_FUR2 : DARK_FUR;
    ctx.beginPath();
    ctx.moveTo(x - 4 + s * 2, cy - 14);
    ctx.lineTo(x + 4 + s * 2, cy - 14);
    ctx.lineTo(x + 3.5 + s * 3, cy - 1);
    ctx.lineTo(x - 3.5 + s * 3, cy - 1);
    ctx.closePath();
    ctx.fill();
    ellipse(ctx, x + s * 3, cy - 1.5, 5, 2.4);
    ctx.fill();
  }
  // 몸: 뾰족한 털뭉치 (옆으로 넓게)
  ctx.save();
  ctx.translate(cx, cy - 26 + bob);
  ctx.scale(1.25, 0.95);
  ctx.fillStyle = DARK_FUR;
  starPath(ctx, 0, 0, 16, 23, 18, frame * 0.12);
  ctx.fill();
  ctx.restore();
  moonRim(ctx, cx, cy - 26 + bob, 22, -2.8, -1.4);
  // 머리
  const hy = cy - 50 + bob;
  ctx.fillStyle = DARK_FUR;
  starPath(ctx, cx, hy, 12, 18, 14, 0.2);
  ctx.fill();
  // 쫑긋한 귀
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + d * 15, hy - 4);
    ctx.lineTo(cx + d * 15, hy - 26);
    ctx.lineTo(cx + d * 4, hy - 12);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#2B2340';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + d * 13, hy - 8);
    ctx.lineTo(cx + d * 13.5, hy - 20);
    ctx.lineTo(cx + d * 7, hy - 12);
    ctx.closePath();
    ctx.fill();
  }
  // 주둥이
  ellipse(ctx, cx, hy + 9, 9, 6.5);
  ctx.fillStyle = DARK_FUR2;
  ctx.fill();
  ctx.fillStyle = '#3A3256';
  ellipse(ctx, cx, hy + 6.5, 3, 2);
  ctx.fill();
  moonRim(ctx, cx, hy, 17, -2.7, -0.5);
  angryBrows(ctx, cx, hy - 5, 2.5, 8);
  glowEyes(ctx, [
    [cx - 7, hy + 0.5],
    [cx + 7, hy + 0.5],
  ], 3.6, 2.2, 0.3);
}

/** 망토 박쥐(뱀파이어): 뾰족한 망토 날개, 세운 깃, 각진 눈썹. 0 = 날개 위, 1 = 아래 */
function drawVampire(ctx: Ctx, frame: number): void {
  const cx = 40;
  const cy = CREATURES.vampire.cy;
  const lift = frame === 0 ? -8 : 6;
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(cx + side * 8, cy);
    ctx.scale(side, 1);
    // 망토 날개: 끝이 뾰족한 물결
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.quadraticCurveTo(14, -16 + lift, 32, -14 + lift);
    ctx.lineTo(29, -4 + lift * 0.4);
    ctx.lineTo(25, 4 + lift * 0.2);
    ctx.quadraticCurveTo(22, 0, 18, 10);
    ctx.quadraticCurveTo(13, 5, 9, 14);
    ctx.quadraticCurveTo(5, 8, 0, 12);
    ctx.closePath();
    ctx.fillStyle = '#1B1729';
    ctx.fill();
    ctx.strokeStyle = 'rgba(168,156,217,0.4)';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    // 망토 안감 (어두운 보라)
    ctx.beginPath();
    ctx.moveTo(2, -2);
    ctx.quadraticCurveTo(14, -10 + lift, 27, -9 + lift);
    ctx.lineTo(22, 2 + lift * 0.2);
    ctx.quadraticCurveTo(12, 2, 2, 8);
    ctx.closePath();
    ctx.fillStyle = '#3A2A5A';
    ctx.fill();
    ctx.restore();
  }
  // 세운 깃 (머리 뒤)
  ctx.fillStyle = '#2B1B3D';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + d * 3, cy - 2);
    ctx.lineTo(cx + d * 19, cy - 20);
    ctx.lineTo(cx + d * 14, cy - 4);
    ctx.closePath();
    ctx.fill();
  }
  // 몸: 뾰족한 털뭉치
  ctx.fillStyle = DARK_FUR;
  starPath(ctx, cx, cy + 1, 12, 14, 11, frame * 0.1);
  ctx.fill();
  // 쫑긋한 귀
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + d * 10, cy - 7);
    ctx.lineTo(cx + d * 9, cy - 24);
    ctx.lineTo(cx + d * 2, cy - 11);
    ctx.closePath();
    ctx.fill();
  }
  moonRim(ctx, cx, cy + 1, 12.5);
  // 깃 앞의 작은 보석 (라벤더)
  ctx.fillStyle = Palette.lavender;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 8);
  ctx.lineTo(cx + 2.4, cy + 10.5);
  ctx.lineTo(cx, cy + 13);
  ctx.lineTo(cx - 2.4, cy + 10.5);
  ctx.closePath();
  ctx.fill();
  angryBrows(ctx, cx, cy - 5, 1.5, 6);
  glowEyes(ctx, [
    [cx - 5, cy],
    [cx + 5, cy],
  ], 3, 1.9, 0.3);
}

// ---------------------------------------------------------------------------
// 잃어버린 주민
// ---------------------------------------------------------------------------

/** 고슴도치: 둥근 가시 털뭉치. dark = 검은 털 + 보랏빛 눈(가시 끝에 갈색이 살짝) / true = 따뜻한 갈색 + 크림 얼굴 */
function drawHedgehog(ctx: Ctx, look: CreatureLook, frame: number): void {
  const cx = 32;
  const cy = CREATURES.hedgehog.cy;
  const hop = frame === 1 ? -3 : 0;
  const by = cy - 17 + hop;
  const dark = look === 'dark';
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(frame === 1 ? 0.96 : 1.02, frame === 1 ? 1.04 : 0.98);
  ctx.translate(-cx, -cy);
  // 발
  ctx.fillStyle = dark ? DARK_FUR2 : '#D9B48A';
  for (const d of [-1, 1]) {
    ellipse(ctx, cx + d * 8, cy - 2, 4.5, 2.6);
    ctx.fill();
  }
  // 가시 덩어리 (위·옆 둥근 물결)
  ctx.fillStyle = dark ? DARK_FUR : '#8E5F3A';
  scallopBall(ctx, cx, by, 16, 9, 5, Math.PI * 0.85, Math.PI * 2.15);
  // 가시 결
  ctx.strokeStyle = dark ? 'rgba(176,122,74,0.5)' : '#C99466';
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * 0.95 + (Math.PI * 1.1 * i) / 8;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 12, by + Math.sin(a) * 12);
    ctx.lineTo(cx + Math.cos(a) * 19, by + Math.sin(a) * 19);
    ctx.stroke();
  }
  if (dark) {
    moonRim(ctx, cx, by, 19);
    // 얼굴 자리도 검은 털
    ellipse(ctx, cx, by + 5, 11, 9);
    ctx.fillStyle = DARK_FUR2;
    ctx.fill();
    glowEyes(ctx, [
      [cx - 5, by + 3],
      [cx + 5, by + 3],
    ], 2.6, 2.6);
    ctx.restore();
    return;
  }
  // 크림 얼굴
  ellipse(ctx, cx, by + 5, 11.5, 9.5);
  ctx.fillStyle = '#F6E3C6';
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,50,30,0.5)';
  ctx.lineWidth = 1.1;
  ctx.stroke();
  // 둥근 귀
  ctx.fillStyle = '#E8C7A0';
  for (const d of [-1, 1]) {
    ellipse(ctx, cx + d * 10, by - 3, 3, 2.6);
    ctx.fill();
  }
  happyEyes(ctx, [
    [cx - 5, by + 3],
    [cx + 5, by + 3],
  ], 2.2);
  ctx.fillStyle = '#4A2E22';
  ellipse(ctx, cx, by + 8, 2.1, 1.6);
  ctx.fill();
  smile(ctx, cx, by + 8.5, 2.6);
  blush(ctx, [
    [cx - 8.5, by + 8],
    [cx + 8.5, by + 8],
  ]);
  ctx.restore();
}

/** 레서판다 꼬리 (오른쪽으로 둥글게): 줄무늬 색 */
function pandaTail(ctx: Ctx, cx: number, cy: number, fill: string, stripe: string, stripeAlpha: number, frame: number): void {
  const swing = frame === 0 ? 0 : 0.12;
  ctx.save();
  ctx.translate(cx + 12, cy - 12);
  ctx.rotate(-0.5 - swing);
  const path = () => ellipse(ctx, 12, 0, 14, 7.5);
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  ctx.globalAlpha = stripeAlpha;
  ctx.fillStyle = stripe;
  for (const x of [5, 13, 21]) ctx.fillRect(x, -9, 3.6, 18);
  ctx.restore();
  ctx.restore();
}

/** 레서판다: dark = 둥근 검은 털뭉치(귀 끝·꼬리 줄무늬에 주황이 살짝) / true = 주황 갈색 + 크림 얼굴 + 줄무늬 꼬리 */
function drawRedPanda(ctx: Ctx, look: CreatureLook, frame: number): void {
  const cx = 34;
  const cy = CREATURES.redpanda.cy;
  const dark = look === 'dark';
  const bob = frame === 1 ? -2 : 0;
  const fur = dark ? DARK_FUR : '#D9773E';
  const legs = dark ? DARK_FUR2 : '#5A3226';
  // 꼬리
  pandaTail(ctx, cx, cy, fur, dark ? Palette.ember : '#F2B880', dark ? 0.32 : 1, frame);
  // 다리
  ctx.fillStyle = legs;
  for (const [x, s] of [
    [cx - 9, frame === 0 ? 1 : -1],
    [cx + 9, frame === 0 ? -1 : 1],
  ] as const) {
    ellipse(ctx, x + s, cy - 3, 5, 4);
    ctx.fill();
  }
  // 몸 (둥근)
  ctx.fillStyle = fur;
  ellipse(ctx, cx, cy - 15 + bob, 16, 13);
  ctx.fill();
  if (!dark) {
    ellipse(ctx, cx, cy - 10 + bob, 10, 7);
    ctx.fillStyle = '#7A4028';
    ctx.fill();
  }
  // 머리
  const hy = cy - 33 + bob;
  // 귀 (끝에 제 색이 비침)
  for (const d of [-1, 1]) {
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.arc(cx + d * 11, hy - 9, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = dark ? 'rgba(255,140,90,0.45)' : '#F6E9D6';
    ctx.beginPath();
    ctx.arc(cx + d * 11, hy - 9.5, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = fur;
  ellipse(ctx, cx, hy, 15, 12.5);
  ctx.fill();
  if (dark) {
    moonRim(ctx, cx, hy, 14);
    moonRim(ctx, cx, cy - 15 + bob, 15.5, -2.9, -2.2);
    glowEyes(ctx, [
      [cx - 5.5, hy + 1],
      [cx + 5.5, hy + 1],
    ], 2.7, 2.7);
    return;
  }
  // 크림 얼굴 무늬: 볼·눈썹 점
  ctx.fillStyle = '#F6E9D6';
  for (const d of [-1, 1]) {
    ellipse(ctx, cx + d * 7.5, hy + 5, 6, 4.4);
    ctx.fill();
    ellipse(ctx, cx + d * 5.5, hy - 5, 2.6, 1.6);
    ctx.fill();
  }
  ellipse(ctx, cx, hy + 6, 4.5, 3.4);
  ctx.fill();
  happyEyes(ctx, [
    [cx - 5.5, hy + 0.5],
    [cx + 5.5, hy + 0.5],
  ], 2.2);
  ctx.fillStyle = '#3A2418';
  ellipse(ctx, cx, hy + 4.6, 1.9, 1.4);
  ctx.fill();
  smile(ctx, cx, hy + 5.2, 2.4);
  blush(ctx, [
    [cx - 10, hy + 5],
    [cx + 10, hy + 5],
  ]);
}

// ---------------------------------------------------------------------------
// 패시브 (빛나지 않는 졸린 눈)
// ---------------------------------------------------------------------------

/** 올빼미: 탁한 라벤더 회색 알 모양, 둥근 귀깃, 졸린 눈. 1 = 고개를 살짝 갸웃 */
function drawOwl(ctx: Ctx, frame: number): void {
  const cx = 36;
  const cy = CREATURES.owl.cy;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(frame === 1 ? 0.06 : -0.03);
  ctx.translate(-cx, -cy);
  // 발
  ctx.fillStyle = '#B89A7A';
  for (const d of [-1, 1]) {
    ellipse(ctx, cx + d * 6, cy - 1.5, 3.6, 2);
    ctx.fill();
  }
  // 몸
  ellipse(ctx, cx, cy - 21, 17, 21);
  ctx.fillStyle = '#6F6C93';
  ctx.fill();
  // 날개
  ctx.fillStyle = '#5C5980';
  for (const d of [-1, 1]) {
    ellipse(ctx, cx + d * 14, cy - 18, 6, 12, d * 0.2);
    ctx.fill();
  }
  // 배 + 깃털 무늬
  ellipse(ctx, cx, cy - 15, 10, 12);
  ctx.fillStyle = '#A7A3C2';
  ctx.fill();
  ctx.strokeStyle = 'rgba(92,89,128,0.7)';
  ctx.lineWidth = 1.1;
  for (const [x, y] of [
    [cx - 4, cy - 19],
    [cx + 4, cy - 19],
    [cx, cy - 13],
    [cx - 4, cy - 8],
    [cx + 4, cy - 8],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 1);
    ctx.lineTo(x, y + 1);
    ctx.lineTo(x + 2, y - 1);
    ctx.stroke();
  }
  // 둥근 귀깃
  ctx.fillStyle = '#6F6C93';
  for (const d of [-1, 1]) {
    ellipse(ctx, cx + d * 10, cy - 40, 4.4, 5.5, d * 0.5);
    ctx.fill();
  }
  // 얼굴 원반
  ctx.fillStyle = '#BDB8D6';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + d * 6, cy - 30, 6.5, 0, Math.PI * 2);
    ctx.fill();
  }
  sleepyEyes(ctx, [
    [cx - 6, cy - 30],
    [cx + 6, cy - 30],
  ], 3.2, '#4A4766');
  // 부리
  ctx.fillStyle = '#C9A27A';
  ctx.beginPath();
  ctx.moveTo(cx - 2.4, cy - 27);
  ctx.lineTo(cx + 2.4, cy - 27);
  ctx.lineTo(cx, cy - 22.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** 나방: 탁한 청록 둥근 날개 + 라벤더 점, 복슬한 몸, 깃털 더듬이, 졸린 눈. 0 = 날개 펼침, 1 = 접음 */
function drawMoth(ctx: Ctx, frame: number): void {
  const cx = 32;
  const cy = CREATURES.moth.cy;
  const open = frame === 0 ? 1 : 0.62;
  for (const d of [-1, 1] as const) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(d * open, 1);
    // 윗날개
    ellipse(ctx, 13, -5, 13, 9.5, -0.45);
    ctx.fillStyle = '#5E8C8A';
    ctx.fill();
    ctx.strokeStyle = 'rgba(246,241,231,0.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // 아랫날개
    ellipse(ctx, 10, 8, 8.5, 6.5, 0.4);
    ctx.fillStyle = '#6E9C98';
    ctx.fill();
    ctx.stroke();
    // 라벤더 점무늬
    ctx.fillStyle = 'rgba(168,156,217,0.85)';
    ctx.beginPath();
    ctx.arc(15, -6, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(246,241,231,0.6)';
    ctx.beginPath();
    ctx.arc(15, -6, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // 복슬한 몸
  ctx.fillStyle = '#B9B3A6';
  ellipse(ctx, cx, cy + 3, 5.5, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(138,143,168,0.8)';
  ctx.lineWidth = 1;
  for (const y of [cy + 1, cy + 5, cy + 9]) {
    ctx.beginPath();
    ctx.moveTo(cx - 4.5, y);
    ctx.quadraticCurveTo(cx, y + 1.6, cx + 4.5, y);
    ctx.stroke();
  }
  // 털 목도리 + 머리
  ctx.fillStyle = '#DDD6C6';
  starPath(ctx, cx, cy - 6, 9, 7.5, 6, 0);
  ctx.fill();
  ctx.fillStyle = '#CFC8B8';
  ctx.beginPath();
  ctx.arc(cx, cy - 10, 5.6, 0, Math.PI * 2);
  ctx.fill();
  // 깃털 더듬이
  ctx.strokeStyle = Palette.ash;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + d * 2, cy - 15);
    ctx.quadraticCurveTo(cx + d * 5, cy - 22, cx + d * 10, cy - 24);
    ctx.stroke();
    for (const t of [0.4, 0.65, 0.9]) {
      const x = cx + d * (2 + 8 * t);
      const y = cy - 15 - 9 * t;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + d * 1.5, y + 2.2);
      ctx.stroke();
    }
  }
  sleepyEyes(ctx, [
    [cx - 2.4, cy - 10],
    [cx + 2.4, cy - 10],
  ], 1.6, '#6E6A78');
}

/** 반딧불이: 작고 둥근 잿빛 몸, 졸린 눈, 꼬리의 은은한 민트빛. 0 = 날개 위·빛 밝게, 1 = 날개 아래·빛 은은하게 */
function drawFirefly(ctx: Ctx, frame: number): void {
  const cx = 24;
  const cy = CREATURES.firefly.cy;
  // 꼬리 빛
  ctx.save();
  ctx.shadowColor = Palette.mint;
  ctx.shadowBlur = frame === 0 ? 12 : 7;
  ctx.globalAlpha = frame === 0 ? 1 : 0.8;
  ctx.fillStyle = '#C7EFD6';
  ellipse(ctx, cx, cy + 7, 5.6, 5);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(158,217,181,0.35)';
  ctx.beginPath();
  ctx.arc(cx, cy + 7, 8.5, 0, Math.PI * 2);
  ctx.fill();
  // 날개 (반투명)
  const a = frame === 0 ? 0.75 : 0.25;
  ctx.fillStyle = 'rgba(220,226,240,0.5)';
  ctx.strokeStyle = 'rgba(246,241,231,0.55)';
  ctx.lineWidth = 0.9;
  for (const d of [-1, 1]) {
    ellipse(ctx, cx + d * 6.5, cy - 4, 7, 3.6, -d * a);
    ctx.fill();
    ctx.stroke();
  }
  // 몸·머리
  ctx.fillStyle = '#5A5F80';
  ellipse(ctx, cx, cy + 1, 6, 7);
  ctx.fill();
  ctx.fillStyle = '#6E7396';
  ctx.beginPath();
  ctx.arc(cx, cy - 6, 5.4, 0, Math.PI * 2);
  ctx.fill();
  // 더듬이
  ctx.strokeStyle = Palette.ash;
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  ctx.fillStyle = '#B7BBD0';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + d * 1.6, cy - 10.5);
    ctx.quadraticCurveTo(cx + d * 3, cy - 15, cx + d * 5.5, cy - 15.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + d * 5.5, cy - 15.5, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  sleepyEyes(ctx, [
    [cx - 2.2, cy - 6],
    [cx + 2.2, cy - 6],
  ], 1.5, '#C9CCDC', '#22243A');
}

/** 종·모습·프레임 하나를 size×size 칸에 그린다 (배경 투명) */
export function drawCreature(ctx: Ctx, id: CreatureId, look: CreatureLook, frame: number): void {
  ctx.save();
  ctx.lineJoin = 'round';
  switch (id) {
    case 'werewolf':
      drawWerewolf(ctx, frame);
      break;
    case 'vampire':
      drawVampire(ctx, frame);
      break;
    case 'hedgehog':
      drawHedgehog(ctx, look, frame);
      break;
    case 'redpanda':
      drawRedPanda(ctx, look, frame);
      break;
    case 'owl':
      drawOwl(ctx, frame);
      break;
    case 'moth':
      drawMoth(ctx, frame);
      break;
    case 'firefly':
      drawFirefly(ctx, frame);
      break;
  }
  ctx.restore();
}
