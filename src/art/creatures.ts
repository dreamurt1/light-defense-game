// 2026-11-13 컨셉 시연판: 새 적·주민 임시 코드 그림 규격 (registry가 PNG로 내보냄, 게임은 entities/enemies/Creature.ts).
// 키 규칙: 호스틸·잃어버린 주민 = `${id}-dark`, 잃어버린 주민 제 모습 = `${id}-true`, 패시브 = `${id}`.
// cy = 발(바닥에 닿는 곳) 또는 나는 종은 몸 가운데.
//
// 움직임 (2026-11-13 보강: "루미처럼 어색하지 않게 움직이는 임시 그림"):
//  - 걷는 종(늑대·고슴도치·레서판다·올빼미): 옆·앞·뒤 세 방향 × 4칸 걸음 = 12칸. 칸 번호 = 방향 × 4 + 걸음
//    (방향 순서 side·front·back, critterKit.CRITTER_VIEWS). 옆은 오른쪽을 보고, 왼쪽은 게임이 flipX로 뒤집는다.
//    애니메이션: `${키}-move`(옆) · `${키}-move-front`(화면 아래로 걸어옴) · `${키}-move-back`(화면 위로 걸어감)
//  - 나는 종(뱀파이어·나방·반딧불이): 오른쪽을 보는 3/4 옆모습 4칸 날갯짓(위 → 내려침 → 아래 → 접어 올림). `${키}-move`
//
// 세 무리를 글 없이 모양으로 구분한다 (모양·색은 모두 제안):
//  - 호스틸(늑대·뱀파이어): 뾰족뾰족한 검은 털 실루엣 + 각진 눈썹 + 보랏빛으로 빛나는 눈
//  - 잃어버린 주민(고슴도치·레서판다): 'dark' = 동그란 검은 털뭉치 + 보랏빛 눈, 귀·꼬리 끝에 제 색이 살짝 / 'true' = 제 색과 웃는 얼굴
//  - 패시브(올빼미·나방·반딧불이): 탁한 라벤더·청록·잿빛, 빛나지 않는 졸린 눈, 둥글고 작은 실루엣
import { type Ctx, Palette, ellipse, starPath } from './kit';
import {
  CRITTER_VIEWS,
  CYCLE,
  DARK_FAR,
  DARK_FUR,
  DARK_FUR2,
  FLAP_CYCLE,
  type CritterView,
  type FlapPose,
  type Gait,
  angryBrows,
  blush,
  browLine,
  gait,
  glowEyes,
  happyEyes,
  limb,
  moonRim,
  paw,
  rotatedPoly,
  scallopBall,
  sleepyEyes,
  smile,
  spikyPath,
  splitFrame,
  tilted,
} from './critterKit';

export type CreatureId = 'werewolf' | 'vampire' | 'hedgehog' | 'redpanda' | 'owl' | 'moth' | 'firefly';
export type CreatureLook = 'dark' | 'true' | 'plain';
export type { CritterView } from './critterKit';

export interface CreatureArt {
  size: number;
  cy: number;
  /** 시트 칸 수: 걷는 종 12(3방향 × 4), 나는 종 4 */
  frames: number;
  looks: readonly CreatureLook[];
  flies: boolean;
  /** 걸음·날갯짓 애니메이션 속도 (초당 칸, 제안) */
  fps: number;
}

export const CREATURES: Record<CreatureId, CreatureArt> = {
  werewolf: { size: 96, cy: 84, frames: 12, looks: ['dark'], flies: false, fps: 8 },
  vampire: { size: 80, cy: 44, frames: 4, looks: ['dark'], flies: true, fps: 9 },
  hedgehog: { size: 64, cy: 54, frames: 12, looks: ['dark', 'true'], flies: false, fps: 9 },
  redpanda: { size: 72, cy: 62, frames: 12, looks: ['dark', 'true'], flies: false, fps: 9 },
  owl: { size: 72, cy: 62, frames: 12, looks: ['plain'], flies: false, fps: 6 },
  moth: { size: 64, cy: 32, frames: 4, looks: ['plain'], flies: true, fps: 10 },
  firefly: { size: 48, cy: 24, frames: 4, looks: ['plain'], flies: true, fps: 12 },
};

export const creatureKey = (id: CreatureId, look: CreatureLook): string => (look === 'plain' ? id : `${id}-${look}`);
/** 걷기·날기 애니메이션 키. 옆(기본) = `${키}-move`, 앞·뒤 = `${키}-move-front` · `${키}-move-back` (나는 종은 옆만) */
export const creatureAnim = (id: CreatureId, look: CreatureLook, view: CritterView = 'side'): string =>
  view === 'side' ? `${creatureKey(id, look)}-move` : `${creatureKey(id, look)}-move-${view}`;
export const isCreature = (id: string): id is CreatureId => id in CREATURES;
/** 이 종의 시트에 들어 있는 방향 (나는 종은 옆만) */
export const creatureViews = (id: CreatureId): readonly CritterView[] => (CREATURES[id].flies ? ['side'] : CRITTER_VIEWS);
/** 방향·걸음 칸 → 시트 칸 번호 */
export const creatureFrame = (view: CritterView, phase: number): number => CRITTER_VIEWS.indexOf(view) * CYCLE + (phase % CYCLE);

/** registry가 쓰는 애니메이션 목록 (방향마다 4칸을 반복) */
export function creatureAnims(id: CreatureId, look: CreatureLook): { key: string; frames: number[]; frameRate: number; repeat: number }[] {
  return creatureViews(id).map((view) => ({
    key: creatureAnim(id, look, view),
    frames: [0, 1, 2, 3].map((p) => creatureFrame(view, p)),
    frameRate: CREATURES[id].fps,
    repeat: -1,
  }));
}

// ---------------------------------------------------------------------------
// 호스틸: 늑대 (96 칸, 발 = 84)
// ---------------------------------------------------------------------------

/** 늑대 꼬리 (왼쪽으로 뻗는 뾰족한 털 깃털, 끝이 살짝 위로) */
const WOLF_TAIL: readonly (readonly [number, number])[] = [
  [0, -5],
  [-7, -9],
  [-7, -5],
  [-14, -11],
  [-14, -5],
  [-22, -10],
  [-19, -3],
  [-27, -3],
  [-19, 1],
  [-23, 6],
  [-12, 4],
  [-8, 8],
  [-2, 5],
];

/** 옆모습 늑대 다리 한 짝: 앞다리는 들 때 무릎이 앞으로·발목이 뒤로 접히고, 뒷다리는 뒤꿈치(hock)가 뒤로 */
function wolfLeg(ctx: Ctx, hipX: number, hipY: number, footY: number, g: Gait, phi: number, hind: boolean, color: string): void {
  const s = g.swing(phi);
  const l = g.lift(phi);
  const fx = hipX + s * 6 - l * (hind ? 3 : 2);
  const fy = footY - 3 - l * 4.5;
  const kx = hind ? hipX - 6 + s * 2 : hipX + 2 + s * 3 + l * 4;
  const ky = (hipY + fy) / 2 + (hind ? 2 : 0) - l * 1.5;
  limb(ctx, hipX, hipY, kx, ky, fx, fy, hind ? 7.5 : 7, color);
  paw(ctx, fx + 2, fy + 0.6, 4.6, 2.4, color, l);
}

function wolfSide(ctx: Ctx, g: Gait): void {
  const G = 84;
  const b = -g.up * 2;
  const ruffle = g.phase * 0.09;
  // 먼 다리 (몸 뒤, 더 어둡고 살짝 위)
  wolfLeg(ctx, 64, 63 + b, G - 2, g, Math.PI, false, DARK_FAR);
  wolfLeg(ctx, 35, 63 + b, G - 2, g, 0, true, DARK_FAR);
  // 꼬리: 엉덩이에서 뒤로, 걸음마다 위아래로 살랑
  ctx.fillStyle = DARK_FUR;
  rotatedPoly(ctx, 27, 54 + b, -0.18 + g.sway(0.9) * 0.16, WOLF_TAIL);
  // 몸통 (등 털이 길다)
  spikyPath(ctx, 47, 58 + b, 21, 13, 13, 0.3, { phase: ruffle, top: 1.6, bottom: 0.7 });
  ctx.fill();
  // 목 갈기
  spikyPath(ctx, 62, 49 + b, 10, 11, 8, 0.45, { phase: ruffle * 1.4, top: 1.5, front: 0.5 });
  ctx.fill();
  moonRim(ctx, 45, 58 + b, 21, -2.6, -1.2, 13);
  // 가까운 다리 (밝은 털: 걸음이 읽히게)
  wolfLeg(ctx, 60, 64 + b, G, g, 0, false, DARK_FUR2);
  wolfLeg(ctx, 32, 64 + b, G, g, Math.PI, true, DARK_FUR2);

  // 머리: 걸음보다 살짝 늦게 끄덕
  const hx = 71;
  const hy = 41 + b - g.up * 0.5;
  const earTilt = (1 - g.up) * 0.1;
  ctx.fillStyle = DARK_FAR;
  rotatedPoly(ctx, hx - 6, hy - 5, -0.35 + earTilt, [
    [-3, 1],
    [-1, -16],
    [5, -1],
  ]);
  ctx.fillStyle = DARK_FUR;
  spikyPath(ctx, hx, hy, 10, 9, 9, 0.22, { top: 1.3, bottom: 1.3, front: 0.3 });
  ctx.fill();
  // 주둥이
  ctx.beginPath();
  ctx.moveTo(hx + 2, hy - 5.5);
  ctx.lineTo(hx + 15, hy - 1.5);
  ctx.quadraticCurveTo(hx + 18.5, hy + 1.5, hx + 15, hy + 4.5);
  ctx.lineTo(hx + 3, hy + 7.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = DARK_FUR2;
  ctx.beginPath();
  ctx.moveTo(hx + 4, hy + 3.5);
  ctx.lineTo(hx + 15, hy + 3.5);
  ctx.lineTo(hx + 4, hy + 7);
  ctx.closePath();
  ctx.fill();
  // 가까운 귀
  ctx.fillStyle = DARK_FUR;
  rotatedPoly(ctx, hx - 1, hy - 6, -0.18 + earTilt, [
    [-4.5, 1],
    [-1, -19],
    [5, -1],
  ]);
  ctx.fillStyle = '#2B2340';
  rotatedPoly(ctx, hx - 1, hy - 6, -0.18 + earTilt, [
    [-2, -2],
    [-0.8, -14],
    [2.5, -2.5],
  ]);
  ctx.fillStyle = '#3A3256';
  ellipse(ctx, hx + 16.2, hy + 0.2, 2.3, 1.8);
  ctx.fill();
  moonRim(ctx, hx, hy, 10.5, -2.7, -1.5);
  ctx.strokeStyle = 'rgba(168,156,217,0.3)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(hx + 3, hy - 5.8);
  ctx.lineTo(hx + 14.5, hy - 2);
  ctx.stroke();
  browLine(ctx, hx - 0.5, hy - 7.5, hx + 9, hy - 3.8);
  glowEyes(ctx, [[hx + 5.2, hy - 0.8]], 3.6, 2.1, -0.32);
}

function wolfFront(ctx: Ctx, g: Gait): void {
  const G = 84;
  const cx = 48;
  const b = -g.up * 2;
  const ruffle = g.phase * 0.09;
  tilted(ctx, cx, G, g.sway() * 0.035, () => {
    // 뒷다리 (멀리, 몸통 옆으로 살짝)
    for (const [d, phi] of [
      [-1, Math.PI],
      [1, 0],
    ] as const) {
      const l = g.lift(phi);
      const fy = G - 6 - l * 3 + g.swing(phi);
      limb(ctx, cx + d * 12, 67 + b, cx + d * 13.5, 72 + b, cx + d * 13, fy, 6.5, DARK_FAR);
      paw(ctx, cx + d * 13, fy + 0.6, 4.2, 2.2, DARK_FAR, l);
    }
    // 꼬리: 몸 뒤에서 좌우로 흔들려 옆으로 삐죽
    ctx.fillStyle = DARK_FUR;
    rotatedPoly(ctx, cx + g.sway(0.9) * 8, 56 + b, -Math.PI / 2 + g.sway(0.9) * 0.9, WOLF_TAIL.map(([x, y]) => [-x * 0.9, y] as const));
    // 가슴·몸통
    spikyPath(ctx, cx, 59 + b, 18, 15, 12, 0.32, { phase: ruffle, top: 1.6, bottom: 0.7 });
    ctx.fill();
    moonRim(ctx, cx, 59 + b, 18, -2.7, -1.6, 15);
    // 앞다리 (가까움): 내딛는 발은 아래(앞)로 조금, 드는 발은 위로
    for (const [d, phi] of [
      [-1, 0],
      [1, Math.PI],
    ] as const) {
      const l = g.lift(phi);
      const fy = G - 3 + g.swing(phi) * 1 - l * 4.5;
      limb(ctx, cx + d * 8, 66 + b, cx + d * 9, 74 + b, cx + d * 8.5, fy, 7.5, DARK_FUR2);
      paw(ctx, cx + d * 8.5, fy + 0.6, 4.9, 2.5, DARK_FUR2, l);
    }
    // 머리
    const hx = cx + g.sway(0.6) * 0.8;
    const hy = 37 + b - g.up * 0.5;
    const earTilt = (1 - g.up) * 0.08;
    ctx.fillStyle = DARK_FUR;
    starPath(ctx, hx, hy, 12, 17, 13.5, 0.2 + ruffle * 0.5);
    ctx.fill();
    for (const d of [-1, 1] as const) {
      rotatedPoly(ctx, hx + d * 10, hy - 6, d * (0.12 + earTilt), [
        [-5, 2],
        [d * 3, -19],
        [5, 2],
      ]);
    }
    ctx.fillStyle = '#2B2340';
    for (const d of [-1, 1] as const) {
      rotatedPoly(ctx, hx + d * 10, hy - 6, d * (0.12 + earTilt), [
        [-2.5, -1],
        [d * 2.2, -13],
        [2.5, -1],
      ]);
    }
    ellipse(ctx, hx, hy + 8.5, 8.5, 6.2);
    ctx.fillStyle = DARK_FUR2;
    ctx.fill();
    ctx.fillStyle = '#3A3256';
    ellipse(ctx, hx, hy + 6.2, 3, 2);
    ctx.fill();
    moonRim(ctx, hx, hy, 16, -2.6, -1.7);
    angryBrows(ctx, hx, hy - 5, 2.5, 7.5);
    glowEyes(ctx, [
      [hx - 6.5, hy + 0.5],
      [hx + 6.5, hy + 0.5],
    ], 3.5, 2.1, 0.3);
  });
}

function wolfBack(ctx: Ctx, g: Gait): void {
  const G = 84;
  const cx = 48;
  const b = -g.up * 2;
  const ruffle = g.phase * 0.09;
  tilted(ctx, cx, G, g.sway() * 0.035, () => {
    // 앞다리 (멀리)
    for (const [d, phi] of [
      [-1, Math.PI],
      [1, 0],
    ] as const) {
      const l = g.lift(phi);
      const fy = G - 8 - l * 3 - g.swing(phi);
      limb(ctx, cx + d * 11, 65 + b, cx + d * 12, 71 + b, cx + d * 12, fy, 6, DARK_FAR);
      paw(ctx, cx + d * 12, fy + 0.6, 3.9, 2.1, DARK_FAR, l);
    }
    // 머리 뒤통수 (몸 너머, 귀가 쫑긋)
    const hx = cx + g.sway(0.6) * 0.8;
    const hy = 36 + b - g.up * 0.5;
    const earTilt = (1 - g.up) * 0.08;
    ctx.fillStyle = DARK_FUR;
    for (const d of [-1, 1] as const) {
      rotatedPoly(ctx, hx + d * 9, hy - 5, d * (0.14 + earTilt), [
        [-5, 2],
        [d * 3, -18],
        [5, 2],
      ]);
    }
    starPath(ctx, hx, hy, 11, 15, 12, 0.3 + ruffle * 0.5);
    ctx.fill();
    moonRim(ctx, hx, hy, 14, -2.6, -1.6);
    for (const d of [-1, 1] as const) moonRim(ctx, hx + d * 10.5, hy - 13, 5, d < 0 ? -2.2 : -1.9, d < 0 ? -1.2 : -0.9);
    // 몸통·엉덩이
    ctx.fillStyle = DARK_FUR;
    spikyPath(ctx, cx, 58 + b, 18, 14, 12, 0.3, { phase: ruffle + 0.2, top: 1.6, bottom: 0.7 });
    ctx.fill();
    moonRim(ctx, cx, 58 + b, 18, -2.7, -1.5, 14);
    // 뒷다리 (가까움): 드는 발은 발바닥이 보인다
    for (const [d, phi] of [
      [-1, 0],
      [1, Math.PI],
    ] as const) {
      const l = g.lift(phi);
      const fy = G - 3 - l * 4 - g.swing(phi) * 0.8;
      limb(ctx, cx + d * 9, 65 + b, cx + d * 11, 74 + b, cx + d * 9.5, fy, 8, DARK_FUR2);
      paw(ctx, cx + d * 9.5, fy + 0.6, 5, 2.5, DARK_FUR2, l);
      if (l > 0.5) {
        ctx.fillStyle = '#3A3256';
        ellipse(ctx, cx + d * 9.5, fy - 0.3, 2.4, 1.3);
        ctx.fill();
      }
    }
    // 꼬리: 엉덩이에서 아래로 늘어져 좌우로 흔들 (가장 앞, 조금 밝은 털)
    ctx.fillStyle = DARK_FUR2;
    rotatedPoly(ctx, cx, 57 + b, Math.PI / 2 + g.sway(0.9) * 0.4, WOLF_TAIL.map(([x, y]) => [-x * 0.85, y * 1.1] as const));
    ctx.save();
    ctx.translate(cx, 57 + b);
    ctx.rotate(Math.PI / 2 + g.sway(0.9) * 0.4);
    moonRim(ctx, 12, 0, 10, -2.4, -0.7, 5);
    ctx.restore();
  });
}

function drawWerewolf(ctx: Ctx, view: CritterView, g: Gait): void {
  if (view === 'side') wolfSide(ctx, g);
  else if (view === 'front') wolfFront(ctx, g);
  else wolfBack(ctx, g);
}

// ---------------------------------------------------------------------------
// 호스틸: 망토 박쥐(뱀파이어) — 3/4 옆모습 날갯짓 (80 칸, 몸 가운데 = 40, 44)
// ---------------------------------------------------------------------------

/** 망토 날개 한 장 (오른쪽으로 뻗은 모양, side로 좌우). 날갯짓은 critterKit.FLAP_CYCLE */
function capeWing(ctx: Ctx, x: number, y: number, side: -1 | 1, f: FlapPose, far: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(side * f.sx * (far ? 0.72 : 1), f.sy * (far ? 0.9 : 1));
  ctx.rotate(f.a);
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.quadraticCurveTo(14, -16, 32, -13);
  ctx.lineTo(29, -3);
  ctx.lineTo(25, 4);
  ctx.quadraticCurveTo(22, 0, 18, 10);
  ctx.quadraticCurveTo(13, 5, 9, 14);
  ctx.quadraticCurveTo(5, 8, 0, 12);
  ctx.closePath();
  ctx.fillStyle = far ? '#120F1E' : '#1B1729';
  ctx.fill();
  ctx.strokeStyle = far ? 'rgba(168,156,217,0.2)' : 'rgba(168,156,217,0.45)';
  ctx.lineWidth = 1.3;
  ctx.stroke();
  if (!far) {
    // 망토 안감 (어두운 보라)
    ctx.beginPath();
    ctx.moveTo(2, -2);
    ctx.quadraticCurveTo(14, -10, 27, -9);
    ctx.lineTo(22, 2);
    ctx.quadraticCurveTo(12, 2, 2, 8);
    ctx.closePath();
    ctx.fillStyle = '#3A2A5A';
    ctx.fill();
  }
  ctx.restore();
}

function drawVampire(ctx: Ctx, phase: number): void {
  const f = FLAP_CYCLE[phase];
  const cx = 40;
  const cy = 44 + f.dy;
  // 먼 날개 (보는 쪽 = 오른쪽, 몸 뒤에서 짧게)
  capeWing(ctx, cx + 6, cy - 2, 1, f, true);
  // 가까운 날개 (왼쪽, 크게)
  capeWing(ctx, cx - 7, cy, -1, f, false);
  tilted(ctx, cx, cy, 0.14, () => {
    // 세운 깃 (머리 뒤)
    ctx.fillStyle = '#2B1B3D';
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + d * 3, cy - 2);
      ctx.lineTo(cx + d * 18, cy - 19);
      ctx.lineTo(cx + d * 13, cy - 4);
      ctx.closePath();
      ctx.fill();
    }
    // 몸: 뾰족한 털뭉치
    ctx.fillStyle = DARK_FUR;
    starPath(ctx, cx, cy + 1, 12, 14, 11, phase * 0.1);
    ctx.fill();
    // 늘어진 발 (뒤로)
    ctx.fillStyle = DARK_FUR2;
    for (const d of [-4, 1]) {
      ellipse(ctx, cx + d - 2, cy + 14 - (phase === 2 ? 1 : 0), 2.2, 3, 0.5);
      ctx.fill();
    }
    // 쫑긋한 귀 (앞으로 기울어짐)
    ctx.fillStyle = DARK_FUR;
    rotatedPoly(ctx, cx - 6, cy - 8, -0.15 - f.dy * 0.03, [
      [-4, 1],
      [-1, -16],
      [4, 0],
    ]);
    rotatedPoly(ctx, cx + 7, cy - 8, 0.15 - f.dy * 0.03, [
      [-3.5, 0],
      [1, -15],
      [3.5, 1],
    ]);
    moonRim(ctx, cx, cy + 1, 12.5);
    // 깃 앞의 작은 보석 (라벤더)
    ctx.fillStyle = Palette.lavender;
    ctx.beginPath();
    ctx.moveTo(cx + 3, cy + 8);
    ctx.lineTo(cx + 5.2, cy + 10.5);
    ctx.lineTo(cx + 3, cy + 13);
    ctx.lineTo(cx + 0.8, cy + 10.5);
    ctx.closePath();
    ctx.fill();
    // 얼굴은 보는 쪽(오른쪽)으로
    angryBrows(ctx, cx + 3.5, cy - 5, 1.5, 5.5);
    glowEyes(ctx, [
      [cx - 1, cy],
      [cx + 8, cy],
    ], 2.8, 1.9, 0.3);
  });
}

// ---------------------------------------------------------------------------
// 잃어버린 주민: 고슴도치 (64 칸, 발 = 54)
// ---------------------------------------------------------------------------

interface HedgeColors {
  spine: string;
  tip: string;
  face: string;
  feetNear: string;
  feetFar: string;
}

const hedgeColors = (dark: boolean): HedgeColors =>
  dark
    ? { spine: DARK_FUR, tip: 'rgba(176,122,74,0.5)', face: DARK_FUR2, feetNear: DARK_FUR2, feetFar: DARK_FAR }
    : { spine: '#8E5F3A', tip: '#C99466', face: '#F6E3C6', feetNear: '#D9B48A', feetFar: '#B08A62' };

/** 가시 결: 중심에서 바깥으로 짧은 선 */
function spineStrokes(ctx: Ctx, x: number, y: number, r0: number, r1: number, from: number, to: number, n: number, color: string, ry = 1): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = from + ((to - from) * i) / Math.max(1, n - 1);
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0 * ry);
    ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1 * ry);
    ctx.stroke();
  }
  ctx.restore();
}

function hedgehogSide(ctx: Ctx, dark: boolean, g: Gait): void {
  const c = hedgeColors(dark);
  const G = 54;
  const b = -g.up * 1.2;
  // 먼 발 (총총)
  for (const [x, phi] of [
    [26, 0],
    [40, Math.PI],
  ] as const) {
    const l = g.lift(phi);
    paw(ctx, x + 2 + g.swing(phi) * 3, G - 2 - l * 2.2, 3.4, 2, c.feetFar, l);
  }
  // 가시 등 (뒤로 누운 둥근 물결)
  const bx = 29;
  const by = 41 + b;
  ctx.fillStyle = c.spine;
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(1.12, 0.88);
  scallopBall(ctx, 0, 0, 14, 8, 4.6, Math.PI * 0.82, Math.PI * 1.98 + g.phase * 0.0);
  ctx.restore();
  ctx.fillStyle = c.spine;
  ellipse(ctx, bx + 1, by + 5, 15, 8);
  ctx.fill();
  // 가시 결 (등을 따라 뒤로 누움)
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(1.12, 0.88);
  spineStrokes(ctx, 0, 0, 10, 17, Math.PI * 0.95, Math.PI * 1.9, 8, c.tip);
  ctx.restore();
  if (dark) moonRim(ctx, bx, by, 17, -2.8, -0.8, 14);
  // 얼굴·주둥이 (오른쪽으로 뾰족)
  const fx = 41;
  const fy = 45 + b;
  ctx.fillStyle = c.face;
  ellipse(ctx, fx, fy, 8, 6.8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(fx + 2, fy - 4.5);
  ctx.quadraticCurveTo(fx + 9, fy - 2, fx + 11.5, fy + 0.5);
  ctx.quadraticCurveTo(fx + 9, fy + 4.5, fx + 2, fy + 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = dark ? '#3A3256' : '#4A2E22';
  ellipse(ctx, fx + 11.3, fy + 0.2, 2, 1.7);
  ctx.fill();
  // 가까운 발
  for (const [x, phi] of [
    [24, Math.PI],
    [38, 0],
  ] as const) {
    const l = g.lift(phi);
    paw(ctx, x + g.swing(phi) * 3, G - l * 2.4, 3.8, 2.2, c.feetNear, l);
  }
  if (dark) {
    glowEyes(ctx, [[fx + 3, fy - 1.5]], 2.5, 2.3);
    return;
  }
  // 둥근 귀
  ctx.fillStyle = '#E8C7A0';
  ellipse(ctx, fx - 3.5, fy - 6.5, 2.8, 2.4);
  ctx.fill();
  happyEyes(ctx, [[fx + 3, fy - 1.5]], 2.1);
  smile(ctx, fx + 7, fy + 2.4, 2);
  blush(ctx, [[fx + 1, fy + 2.8]], 2.4, 1.5);
}

function hedgehogFront(ctx: Ctx, dark: boolean, g: Gait): void {
  const c = hedgeColors(dark);
  const G = 54;
  const cx = 32;
  const b = -g.up * 1.2;
  tilted(ctx, cx, G, g.sway() * 0.06, () => {
    // 뒷발 (멀리, 옆으로 살짝)
    for (const [d, phi] of [
      [-1, Math.PI],
      [1, 0],
    ] as const) {
      const l = g.lift(phi);
      paw(ctx, cx + d * 12, G - 3 - l * 1.5, 3.4, 2, c.feetFar, l);
    }
    const by = 37 + b;
    ctx.fillStyle = c.spine;
    scallopBall(ctx, cx, by, 16, 9, 5, Math.PI * 0.85, Math.PI * 2.15);
    spineStrokes(ctx, cx, by, 12, 19, Math.PI * 0.95, Math.PI * 2.05, 9, c.tip);
    if (dark) moonRim(ctx, cx, by, 19, -2.6, -1.6);
    // 앞발: 디딘 발은 아래(앞)로, 드는 발은 위로
    for (const [d, phi] of [
      [-1, 0],
      [1, Math.PI],
    ] as const) {
      const l = g.lift(phi);
      paw(ctx, cx + d * 8, G - 2 + g.swing(phi) * 0.8 - l * 2.6, 4.5, 2.6, c.feetNear, l);
    }
    if (dark) {
      ellipse(ctx, cx, by + 5, 11, 9);
      ctx.fillStyle = c.face;
      ctx.fill();
      glowEyes(ctx, [
        [cx - 5, by + 3],
        [cx + 5, by + 3],
      ], 2.6, 2.6);
      return;
    }
    ellipse(ctx, cx, by + 5, 11.5, 9.5);
    ctx.fillStyle = c.face;
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,50,30,0.5)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.fillStyle = '#E8C7A0';
    for (const d of [-1, 1]) {
      ellipse(ctx, cx + d * 10, by - 3 + (1 - g.up) * 0.5, 3, 2.6);
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
  });
}

function hedgehogBack(ctx: Ctx, dark: boolean, g: Gait): void {
  const c = hedgeColors(dark);
  const G = 54;
  const cx = 32;
  const b = -g.up * 1.2;
  tilted(ctx, cx, G, g.sway() * 0.06, () => {
    const by = 38 + b;
    // 앞발 (멀리, 거의 가려짐)
    for (const [d, phi] of [
      [-1, Math.PI],
      [1, 0],
    ] as const) {
      const l = g.lift(phi);
      paw(ctx, cx + d * 10, G - 4 - l * 1.2, 3.2, 1.9, c.feetFar, l);
    }
    // 등 전체가 가시
    ctx.fillStyle = c.spine;
    scallopBall(ctx, cx, by, 16, 12, 5, Math.PI * 0.7, Math.PI * 2.3);
    ellipse(ctx, cx, by + 6, 16, 11);
    ctx.fill();
    // 가시 결: 뒤로 누운 가시가 줄줄이 (보는 쪽으로 끝이 내려옴), 줄마다 엇갈림
    ctx.save();
    ctx.strokeStyle = c.tip;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    for (const [row, y] of [-11, -5, 1, 7].entries()) {
      const half = Math.sqrt(Math.max(0, 1 - ((y + 2) / 19) ** 2)) * 15;
      for (let x = -half + (row % 2) * 2.5; x <= half; x += 5) {
        ctx.beginPath();
        ctx.moveTo(cx + x, by + y);
        ctx.lineTo(cx + x * 1.12, by + y + 5);
        ctx.stroke();
      }
    }
    ctx.restore();
    if (dark) moonRim(ctx, cx, by, 19, -2.6, -1.6);
    // 짧은 꼬리
    ctx.fillStyle = dark ? DARK_FUR2 : '#C99466';
    ellipse(ctx, cx, by + 14 + g.sway(0.8) * 0.3, 2.4, 2);
    ctx.fill();
    // 뒷발 (가까움): 드는 발은 발바닥
    for (const [d, phi] of [
      [-1, 0],
      [1, Math.PI],
    ] as const) {
      const l = g.lift(phi);
      const fy = G - 1.5 - l * 2.4;
      paw(ctx, cx + d * 8, fy, 4.3, 2.5, c.feetNear, l);
      if (l > 0.5) {
        ctx.fillStyle = dark ? '#3A3256' : '#B08A62';
        ellipse(ctx, cx + d * 8, fy, 2.2, 1.2);
        ctx.fill();
      }
    }
  });
}

function drawHedgehog(ctx: Ctx, look: CreatureLook, view: CritterView, g: Gait): void {
  const dark = look === 'dark';
  if (view === 'side') hedgehogSide(ctx, dark, g);
  else if (view === 'front') hedgehogFront(ctx, dark, g);
  else hedgehogBack(ctx, dark, g);
}

// ---------------------------------------------------------------------------
// 잃어버린 주민: 레서판다 (72 칸, 발 = 62)
// ---------------------------------------------------------------------------

interface PandaColors {
  fur: string;
  legs: string;
  legsFar: string;
  cream: string;
  stripe: string;
  stripeAlpha: number;
  earIn: string;
}

const pandaColors = (dark: boolean): PandaColors =>
  dark
    ? { fur: DARK_FUR, legs: DARK_FUR2, legsFar: DARK_FAR, cream: DARK_FUR2, stripe: Palette.ember, stripeAlpha: 0.32, earIn: 'rgba(255,140,90,0.45)' }
    : { fur: '#D9773E', legs: '#5A3226', legsFar: '#3E2219', cream: '#F6E9D6', stripe: '#F2B880', stripeAlpha: 1, earIn: '#F6E9D6' };

/** 줄무늬 꼬리: (x, y)에서 rot 방향(+x)으로 뻗는 통통한 꼬리 */
function pandaTail(ctx: Ctx, x: number, y: number, rot: number, c: PandaColors, len = 14, thick = 7.5): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const path = () => ellipse(ctx, len * 0.85, 0, len, thick);
  path();
  ctx.fillStyle = c.fur;
  ctx.fill();
  ctx.save();
  path();
  ctx.clip();
  ctx.globalAlpha = c.stripeAlpha;
  ctx.fillStyle = c.stripe;
  for (const t of [0.36, 0.86, 1.36]) ctx.fillRect(len * t, -thick - 2, len * 0.25, thick * 2 + 4);
  ctx.restore();
  ctx.restore();
}

function pandaLeg(ctx: Ctx, hipX: number, hipY: number, footY: number, g: Gait, phi: number, color: string, w = 5.5): void {
  const s = g.swing(phi);
  const l = g.lift(phi);
  const fx = hipX + s * 4.5 - l * 1.5;
  const fy = footY - l * 3.5;
  limb(ctx, hipX, hipY, hipX + s * 2 + l * 2, (hipY + fy) / 2, fx, fy, w, color);
  paw(ctx, fx + 1.2, fy + 0.3, 3.6, 2.2, color, l);
}

function redPandaSide(ctx: Ctx, dark: boolean, g: Gait): void {
  const c = pandaColors(dark);
  const G = 62;
  const b = -g.up * 1.6;
  // 먼 다리
  pandaLeg(ctx, 48, 50 + b, G - 2, g, Math.PI, c.legsFar);
  pandaLeg(ctx, 30, 50 + b, G - 2, g, 0, c.legsFar);
  // 꼬리: 뒤(왼쪽)로 뻗어 살랑
  pandaTail(ctx, 26, 45 + b, Math.PI + 0.32 + g.sway(0.9) * 0.14, c, 14, 7.2);
  // 몸통
  ctx.fillStyle = c.fur;
  ellipse(ctx, 38, 46 + b, 15, 10.5);
  ctx.fill();
  if (!dark) {
    ctx.fillStyle = c.legs;
    ellipse(ctx, 39, 52 + b, 11, 4.5);
    ctx.fill();
  }
  if (dark) moonRim(ctx, 38, 46 + b, 15, -2.8, -0.6, 10.5);
  // 가까운 다리
  pandaLeg(ctx, 46, 51 + b, G, g, 0, c.legs, 6);
  pandaLeg(ctx, 28, 51 + b, G, g, Math.PI, c.legs, 6);
  // 머리 (오른쪽)
  const hx = 54;
  const hy = 35 + b - g.up * 0.4;
  const earBob = (1 - g.up) * 0.6;
  ctx.fillStyle = c.fur;
  ctx.beginPath();
  ctx.arc(hx - 6, hy - 8 + earBob, 4.6, 0, Math.PI * 2);
  ctx.fill();
  ellipse(ctx, hx, hy, 11, 9.5);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(hx - 1, hy - 9 + earBob, 5.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.earIn;
  ctx.beginPath();
  ctx.arc(hx - 1, hy - 9.4 + earBob, 2.8, 0, Math.PI * 2);
  ctx.fill();
  // 주둥이
  ctx.fillStyle = dark ? DARK_FUR : c.cream;
  ellipse(ctx, hx + 7.5, hy + 3, 5.5, 4.2);
  ctx.fill();
  if (dark) {
    ctx.fillStyle = '#3A3256';
    ellipse(ctx, hx + 12.4, hy + 1.6, 1.8, 1.5);
    ctx.fill();
    moonRim(ctx, hx, hy, 11, -2.7, -0.7, 9.5);
    glowEyes(ctx, [[hx + 4, hy - 1.5]], 2.6, 2.6);
    return;
  }
  ctx.fillStyle = c.cream;
  ellipse(ctx, hx + 2, hy + 3.5, 4.4, 3.4);
  ctx.fill();
  ellipse(ctx, hx + 3.5, hy - 6, 2.4, 1.4, -0.2);
  ctx.fill();
  ctx.fillStyle = '#3A2418';
  ellipse(ctx, hx + 12.4, hy + 1.6, 1.8, 1.5);
  ctx.fill();
  happyEyes(ctx, [[hx + 4, hy - 1.5]], 2.2);
  smile(ctx, hx + 9.5, hy + 3.4, 2);
  blush(ctx, [[hx + 3, hy + 4]], 2.4, 1.5);
}

function redPandaFront(ctx: Ctx, dark: boolean, g: Gait): void {
  const c = pandaColors(dark);
  const G = 62;
  const cx = 34;
  const b = -g.up * 1.6;
  tilted(ctx, cx, G, g.sway() * 0.045, () => {
    // 꼬리: 몸 뒤에서 옆으로 살랑
    pandaTail(ctx, cx + 10, G - 13 + b, -0.55 - g.sway(0.9) * 0.22, c, 13, 7.2);
    // 뒷다리 (멀리)
    for (const [d, phi] of [
      [-1, Math.PI],
      [1, 0],
    ] as const) {
      const l = g.lift(phi);
      paw(ctx, cx + d * 12, G - 4 - l * 2, 4.4, 3, c.legsFar, l);
    }
    // 몸
    ctx.fillStyle = c.fur;
    ellipse(ctx, cx, G - 15 + b, 16, 13);
    ctx.fill();
    if (!dark) {
      ellipse(ctx, cx, G - 10 + b, 10, 7);
      ctx.fillStyle = '#7A4028';
      ctx.fill();
    }
    // 앞다리 (가까움)
    for (const [d, phi] of [
      [-1, 0],
      [1, Math.PI],
    ] as const) {
      const l = g.lift(phi);
      const fy = G - 2 + g.swing(phi) * 0.8 - l * 3.4;
      limb(ctx, cx + d * 8, G - 12 + b, cx + d * 8.5, G - 7 + b, cx + d * 8.5, fy, 7, c.legs);
      paw(ctx, cx + d * 8.5, fy + 0.5, 4.6, 3, c.legs, l);
    }
    // 머리
    const hx = cx + g.sway(0.6) * 0.6;
    const hy = G - 33 + b - g.up * 0.4;
    const earBob = (1 - g.up) * 0.6;
    for (const d of [-1, 1]) {
      ctx.fillStyle = c.fur;
      ctx.beginPath();
      ctx.arc(hx + d * 11, hy - 9 + earBob, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.earIn;
      ctx.beginPath();
      ctx.arc(hx + d * 11, hy - 9.5 + earBob, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = c.fur;
    ellipse(ctx, hx, hy, 15, 12.5);
    ctx.fill();
    if (dark) {
      moonRim(ctx, hx, hy, 14);
      moonRim(ctx, cx, G - 15 + b, 15.5, -2.9, -2.2);
      glowEyes(ctx, [
        [hx - 5.5, hy + 1],
        [hx + 5.5, hy + 1],
      ], 2.7, 2.7);
      return;
    }
    ctx.fillStyle = c.cream;
    for (const d of [-1, 1]) {
      ellipse(ctx, hx + d * 7.5, hy + 5, 6, 4.4);
      ctx.fill();
      ellipse(ctx, hx + d * 5.5, hy - 5, 2.6, 1.6);
      ctx.fill();
    }
    ellipse(ctx, hx, hy + 6, 4.5, 3.4);
    ctx.fill();
    happyEyes(ctx, [
      [hx - 5.5, hy + 0.5],
      [hx + 5.5, hy + 0.5],
    ], 2.2);
    ctx.fillStyle = '#3A2418';
    ellipse(ctx, hx, hy + 4.6, 1.9, 1.4);
    ctx.fill();
    smile(ctx, hx, hy + 5.2, 2.4);
    blush(ctx, [
      [hx - 10, hy + 5],
      [hx + 10, hy + 5],
    ]);
  });
}

function redPandaBack(ctx: Ctx, dark: boolean, g: Gait): void {
  const c = pandaColors(dark);
  const G = 62;
  const cx = 36;
  const b = -g.up * 1.6;
  tilted(ctx, cx, G, g.sway() * 0.045, () => {
    // 앞다리 (멀리)
    for (const [d, phi] of [
      [-1, Math.PI],
      [1, 0],
    ] as const) {
      const l = g.lift(phi);
      paw(ctx, cx + d * 10, G - 5 - l * 2, 4, 2.6, c.legsFar, l);
    }
    // 머리 뒤통수 + 귀
    const hx = cx + g.sway(0.6) * 0.6;
    const hy = G - 33 + b - g.up * 0.4;
    const earBob = (1 - g.up) * 0.6;
    ctx.fillStyle = c.fur;
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(hx + d * 11, hy - 9 + earBob, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ellipse(ctx, hx, hy, 15, 12.5);
    ctx.fill();
    if (dark) {
      for (const d of [-1, 1]) {
        ctx.fillStyle = c.earIn;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(hx + d * 11, hy - 11 + earBob, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      moonRim(ctx, hx, hy, 14, -2.6, -1.6);
    }
    // 몸 등
    ctx.fillStyle = c.fur;
    ellipse(ctx, cx, G - 15 + b, 16, 13);
    ctx.fill();
    if (dark) moonRim(ctx, cx, G - 15 + b, 16, -2.9, -0.3, 13);
    // 뒷다리 (가까움)
    for (const [d, phi] of [
      [-1, 0],
      [1, Math.PI],
    ] as const) {
      const l = g.lift(phi);
      const fy = G - 1 - l * 3.4;
      limb(ctx, cx + d * 9, G - 12 + b, cx + d * 10, G - 7 + b, cx + d * 9.5, fy, 7.5, c.legs);
      paw(ctx, cx + d * 9.5, fy + 0.5, 4.8, 3, c.legs, l);
    }
    // 큰 줄무늬 꼬리: 엉덩이에서 아래로 늘어져 좌우로 살랑 (가장 앞)
    pandaTail(ctx, cx, G - 14 + b, Math.PI / 2 + g.sway(0.9) * 0.3, c, 11, 7.5);
  });
}

function drawRedPanda(ctx: Ctx, look: CreatureLook, view: CritterView, g: Gait): void {
  const dark = look === 'dark';
  if (view === 'side') redPandaSide(ctx, dark, g);
  else if (view === 'front') redPandaFront(ctx, dark, g);
  else redPandaBack(ctx, dark, g);
}

// ---------------------------------------------------------------------------
// 패시브: 올빼미 (72 칸, 발 = 62) — 뒤뚱뒤뚱
// ---------------------------------------------------------------------------

const OWL = { body: '#6F6C93', wing: '#5C5980', belly: '#A7A3C2', disc: '#BDB8D6', feet: '#B89A7A', beak: '#C9A27A', line: 'rgba(92,89,128,0.7)' };

function featherMarks(ctx: Ctx, pts: readonly (readonly [number, number])[], w = 2): void {
  ctx.save();
  ctx.strokeStyle = OWL.line;
  ctx.lineWidth = 1.1;
  ctx.lineCap = 'round';
  for (const [x, y] of pts) {
    ctx.beginPath();
    ctx.moveTo(x - w, y - 1);
    ctx.lineTo(x, y + 1);
    ctx.lineTo(x + w, y - 1);
    ctx.stroke();
  }
  ctx.restore();
}

function owlFeet(ctx: Ctx, cx: number, G: number, g: Gait, gap: number, dz: number): void {
  for (const [d, phi] of [
    [-1, 0],
    [1, Math.PI],
  ] as const) {
    const l = g.lift(phi);
    const x = cx + d * gap + g.swing(phi) * dz;
    const y = G - 1.5 - l * 2.6;
    ctx.fillStyle = OWL.feet;
    ellipse(ctx, x, y, 3.8, 2);
    ctx.fill();
    // 발가락 세 개
    ctx.strokeStyle = '#9A7E60';
    ctx.lineWidth = 0.9;
    for (const t of [-2, 0, 2]) {
      ctx.beginPath();
      ctx.moveTo(x + t, y);
      ctx.lineTo(x + t * 1.3, y + 1.8);
      ctx.stroke();
    }
  }
}

function owlSide(ctx: Ctx, g: Gait): void {
  const G = 62;
  const cx = 34;
  const b = -g.up * 1.4;
  // 뒤뚱: 디딤 칸에서 몸을 앞뒤로 살짝
  owlFeet(ctx, cx + 2, G, g, 0, 4);
  tilted(ctx, cx, G, g.sway() * 0.06, () => {
    const by = G - 21 + b;
    // 꼬리깃 (뒤·아래)
    ctx.fillStyle = OWL.wing;
    rotatedPoly(ctx, cx - 11, by + 14, 2.5 + g.sway(0.8) * 0.12, [
      [0, -3],
      [9, -4],
      [10, 0],
      [9, 4],
      [0, 3],
    ]);
    // 몸 (알 모양)
    ellipse(ctx, cx, by, 15.5, 20.5);
    ctx.fillStyle = OWL.body;
    ctx.fill();
    // 배 (앞쪽 = 오른쪽)
    ellipse(ctx, cx + 6, by + 6, 8.5, 12);
    ctx.fillStyle = OWL.belly;
    ctx.fill();
    featherMarks(ctx, [
      [cx + 4, by + 1],
      [cx + 9, by + 3],
      [cx + 5, by + 8],
      [cx + 9, by + 12],
    ]);
    // 귀깃
    ctx.fillStyle = OWL.body;
    ellipse(ctx, cx - 4, by - 19 + (1 - g.up) * 0.6, 4, 5.5, -0.5);
    ctx.fill();
    ellipse(ctx, cx + 8, by - 19.5 + (1 - g.up) * 0.6, 3.6, 5, 0.4);
    ctx.fill();
    // 날개 (가까운 쪽): 지나가는 칸에서 균형 잡듯 살짝 들림
    ctx.fillStyle = OWL.wing;
    ellipse(ctx, cx - 4, by + 3, 8, 14, 0.18 - g.up * 0.12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(167,163,194,0.45)';
    ctx.lineWidth = 1;
    for (const k of [-4, 1, 6]) {
      ctx.beginPath();
      ctx.moveTo(cx - 9, by + k);
      ctx.quadraticCurveTo(cx - 4, by + k + 3, cx, by + k + 1);
      ctx.stroke();
    }
    // 얼굴 원반 (보는 쪽으로, 먼 원반은 작게)
    ctx.fillStyle = OWL.disc;
    ctx.beginPath();
    ctx.arc(cx + 11.5, by - 8.5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 3.5, by - 9, 6.3, 0, Math.PI * 2);
    ctx.fill();
    sleepyEyes(
      ctx,
      [
        [cx + 3.5, by - 9],
        [cx + 11.5, by - 8.5],
      ],
      2.9,
      '#4A4766',
    );
    ctx.fillStyle = OWL.beak;
    ctx.beginPath();
    ctx.moveTo(cx + 7, by - 6.5);
    ctx.lineTo(cx + 11, by - 5.5);
    ctx.lineTo(cx + 8, by - 1.5);
    ctx.closePath();
    ctx.fill();
  });
}

function owlFront(ctx: Ctx, g: Gait): void {
  const G = 62;
  const cx = 36;
  const b = -g.up * 1.4;
  owlFeet(ctx, cx, G, g, 6, 0.6);
  // 뒤뚱: 디딘 발 쪽으로 몸이 기운다
  tilted(ctx, cx, G, g.sway() * 0.08, () => {
    const by = G - 21 + b;
    ellipse(ctx, cx, by, 17, 21);
    ctx.fillStyle = OWL.body;
    ctx.fill();
    // 날개: 지나가는 칸에서 살짝 벌림 (균형)
    ctx.fillStyle = OWL.wing;
    for (const d of [-1, 1]) {
      ellipse(ctx, cx + d * (14 + g.up * 1.2), by + 3, 6, 12, d * (0.2 + g.up * 0.18));
      ctx.fill();
    }
    ellipse(ctx, cx, by + 6, 10, 12);
    ctx.fillStyle = OWL.belly;
    ctx.fill();
    featherMarks(ctx, [
      [cx - 4, by + 2],
      [cx + 4, by + 2],
      [cx, by + 8],
      [cx - 4, by + 13],
      [cx + 4, by + 13],
    ]);
    // 귀깃: 몸보다 조금 늦게 흔들림
    ctx.fillStyle = OWL.body;
    for (const d of [-1, 1]) {
      ellipse(ctx, cx + d * 10, by - 19 + (1 - g.up) * 0.6, 4.4, 5.5, d * (0.5 - g.sway(0.9) * 0.08));
      ctx.fill();
    }
    ctx.fillStyle = OWL.disc;
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + d * 6, by - 9, 6.5, 0, Math.PI * 2);
      ctx.fill();
    }
    sleepyEyes(
      ctx,
      [
        [cx - 6, by - 9],
        [cx + 6, by - 9],
      ],
      3.2,
      '#4A4766',
    );
    ctx.fillStyle = OWL.beak;
    ctx.beginPath();
    ctx.moveTo(cx - 2.4, by - 6);
    ctx.lineTo(cx + 2.4, by - 6);
    ctx.lineTo(cx, by - 1.5);
    ctx.closePath();
    ctx.fill();
  });
}

function owlBack(ctx: Ctx, g: Gait): void {
  const G = 62;
  const cx = 36;
  const b = -g.up * 1.4;
  owlFeet(ctx, cx, G, g, 5.5, 0.4);
  tilted(ctx, cx, G, g.sway() * 0.08, () => {
    const by = G - 21 + b;
    // 귀깃
    ctx.fillStyle = OWL.wing;
    for (const d of [-1, 1]) {
      ellipse(ctx, cx + d * 10, by - 19 + (1 - g.up) * 0.6, 4.4, 5.5, d * (0.5 - g.sway(0.9) * 0.08));
      ctx.fill();
    }
    ellipse(ctx, cx, by, 17, 21);
    ctx.fillStyle = OWL.body;
    ctx.fill();
    // 등 깃털 무늬
    featherMarks(
      ctx,
      [
        [cx - 5, by - 12],
        [cx + 5, by - 12],
        [cx, by - 6],
        [cx - 7, by - 1],
        [cx + 7, by - 1],
        [cx, by + 5],
      ],
      2.4,
    );
    // 접은 날개 (등 양옆, 지나가는 칸에서 살짝 벌림)
    ctx.fillStyle = OWL.wing;
    for (const d of [-1, 1]) {
      ellipse(ctx, cx + d * (13 + g.up * 1.2), by + 4, 6, 13, d * (-0.12 - g.up * 0.18));
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(167,163,194,0.4)';
    ctx.lineWidth = 1;
    for (const d of [-1, 1]) {
      for (const k of [0, 6, 12]) {
        ctx.beginPath();
        ctx.moveTo(cx + d * 9.5, by + k);
        ctx.quadraticCurveTo(cx + d * 13, by + k + 2.5, cx + d * 17, by + k);
        ctx.stroke();
      }
    }
    // 꼬리깃 (아래 가운데, 살랑)
    ctx.fillStyle = OWL.wing;
    rotatedPoly(ctx, cx, by + 17, Math.PI / 2 + g.sway(0.8) * 0.15, [
      [0, -4.5],
      [6, -5],
      [8, 0],
      [6, 5],
      [0, 4.5],
    ]);
  });
}

function drawOwl(ctx: Ctx, view: CritterView, g: Gait): void {
  if (view === 'side') owlSide(ctx, g);
  else if (view === 'front') owlFront(ctx, g);
  else owlBack(ctx, g);
}

// ---------------------------------------------------------------------------
// 패시브: 나방 · 반딧불이 — 3/4 옆모습 날갯짓
// ---------------------------------------------------------------------------

/** 나방 날개 한 쌍 (위·아래 날개). open = 펼침 정도(0~1), lift = 올림 각 */
function mothWings(ctx: Ctx, x: number, y: number, side: -1 | 1, open: number, lift: number, far: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(side * open * (far ? 0.7 : 1), far ? 0.92 : 1);
  ctx.rotate(lift);
  ctx.strokeStyle = 'rgba(246,241,231,0.35)';
  ctx.lineWidth = 1.2;
  ellipse(ctx, 13, -5, 13, 9.5, -0.45);
  ctx.fillStyle = far ? '#4A706E' : '#5E8C8A';
  ctx.fill();
  if (!far) ctx.stroke();
  ellipse(ctx, 10, 8, 8.5, 6.5, 0.4);
  ctx.fillStyle = far ? '#577D7A' : '#6E9C98';
  ctx.fill();
  if (!far) ctx.stroke();
  ctx.fillStyle = far ? 'rgba(168,156,217,0.55)' : 'rgba(168,156,217,0.85)';
  ctx.beginPath();
  ctx.arc(15, -6, 3.2, 0, Math.PI * 2);
  ctx.fill();
  if (!far) {
    ctx.fillStyle = 'rgba(246,241,231,0.6)';
    ctx.beginPath();
    ctx.arc(15, -6, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 나방 4칸: 펼침·올림 각·몸 높이 (위로 접힘 → 내려침 → 펼쳐 아래 → 올림) */
const MOTH_FLAP = [
  { open: 0.55, lift: -0.75, dy: 1 },
  { open: 0.95, lift: -0.25, dy: 0 },
  { open: 1, lift: 0.18, dy: -1.5 },
  { open: 0.8, lift: -0.45, dy: -0.5 },
] as const;

function drawMoth(ctx: Ctx, phase: number): void {
  const f = MOTH_FLAP[phase];
  const cx = 32;
  const cy = 32 + f.dy;
  // 먼 날개 (오른쪽, 몸 뒤)
  mothWings(ctx, cx + 1, cy - 1, 1, f.open, f.lift, true);
  // 가까운 날개 (왼쪽)
  mothWings(ctx, cx - 1, cy, -1, f.open, f.lift, false);
  tilted(ctx, cx, cy, 0.22, () => {
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
    // 털 목도리 + 머리 (보는 쪽으로 살짝)
    ctx.fillStyle = '#DDD6C6';
    starPath(ctx, cx + 0.5, cy - 6, 9, 7.5, 6, phase * 0.15);
    ctx.fill();
    ctx.fillStyle = '#CFC8B8';
    ctx.beginPath();
    ctx.arc(cx + 1.5, cy - 10, 5.6, 0, Math.PI * 2);
    ctx.fill();
    // 깃털 더듬이: 날갯짓보다 늦게 까딱
    const bob = phase === 0 ? 1.5 : phase === 2 ? -1.2 : 0;
    ctx.strokeStyle = Palette.ash;
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    for (const d of [-1, 1]) {
      const tx = cx + 1.5 + d * 9 + 3;
      const ty = cy - 24 + bob * (d > 0 ? 1 : 0.7);
      ctx.beginPath();
      ctx.moveTo(cx + 1.5 + d * 2, cy - 15);
      ctx.quadraticCurveTo(cx + 1.5 + d * 4 + 2, cy - 22, tx, ty);
      ctx.stroke();
      for (const t of [0.45, 0.7, 0.92]) {
        const x = cx + 1.5 + d * 2 + (tx - (cx + 1.5 + d * 2)) * t;
        const y = cy - 15 + (ty - (cy - 15)) * t;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + d * 1.5, y + 2.2);
        ctx.stroke();
      }
    }
    sleepyEyes(
      ctx,
      [
        [cx - 0.5, cy - 10],
        [cx + 4, cy - 10],
      ],
      1.6,
      '#6E6A78',
    );
  });
}

/** 반딧불이 4칸 날개 각 (빠른 날갯짓). 꼬리빛은 칸마다 같게 둔다 — 깜빡임은 초당 3회 이하 규칙 */
const FIREFLY_FLAP = [-0.95, -0.35, 0.3, -0.5] as const;

function drawFirefly(ctx: Ctx, phase: number): void {
  const a = FIREFLY_FLAP[phase];
  const cx = 24;
  const cy = 24 + (phase === 2 ? -1 : phase === 0 ? 0.6 : 0);
  tilted(ctx, cx, cy, 0.35, () => {
    // 꼬리 빛 둘레 (일정하게)
    ctx.fillStyle = 'rgba(158,217,181,0.3)';
    ctx.beginPath();
    ctx.arc(cx - 1, cy + 8, 9, 0, Math.PI * 2);
    ctx.fill();
    // 먼 날개
    ctx.fillStyle = 'rgba(200,206,226,0.38)';
    ctx.strokeStyle = 'rgba(246,241,231,0.35)';
    ctx.lineWidth = 0.9;
    ctx.save();
    ctx.translate(cx + 2, cy - 4);
    ctx.rotate(a);
    ellipse(ctx, 5, -1, 6, 3.2, -0.2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // 몸·머리
    ctx.fillStyle = '#5A5F80';
    ellipse(ctx, cx, cy + 1, 6, 7);
    ctx.fill();
    // 꼬리 빛 (배 끝, 칸마다 같은 밝기)
    ctx.save();
    ctx.shadowColor = Palette.mint;
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#C7EFD6';
    ellipse(ctx, cx - 1, cy + 8, 5.4, 4.8);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#6E7396';
    ctx.beginPath();
    ctx.arc(cx + 1, cy - 6, 5.4, 0, Math.PI * 2);
    ctx.fill();
    // 가까운 날개 (반투명)
    ctx.fillStyle = 'rgba(220,226,240,0.55)';
    ctx.strokeStyle = 'rgba(246,241,231,0.6)';
    ctx.save();
    ctx.translate(cx - 2, cy - 4);
    ctx.scale(-1, 1);
    ctx.rotate(a);
    ellipse(ctx, 6, -1, 7.5, 3.8, -0.2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // 더듬이
    ctx.strokeStyle = Palette.ash;
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.fillStyle = '#B7BBD0';
    const bob = phase === 0 ? 0.8 : phase === 2 ? -0.8 : 0;
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + 1 + d * 1.6, cy - 10.5);
      ctx.quadraticCurveTo(cx + 1 + d * 3 + 1, cy - 15, cx + 1 + d * 5.5 + 1.5, cy - 15.5 + bob);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 1 + d * 5.5 + 1.5, cy - 15.5 + bob, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    sleepyEyes(
      ctx,
      [
        [cx - 0.8, cy - 6],
        [cx + 3.4, cy - 6],
      ],
      1.5,
      '#C9CCDC',
      '#22243A',
    );
  });
}

/** 종·모습·프레임 하나를 size×size 칸에 그린다 (배경 투명). 걷는 종은 칸 번호 = 방향 × 4 + 걸음 */
export function drawCreature(ctx: Ctx, id: CreatureId, look: CreatureLook, frame: number): void {
  ctx.save();
  ctx.lineJoin = 'round';
  const { view, phase } = splitFrame(frame);
  const g = gait(phase);
  switch (id) {
    case 'werewolf':
      drawWerewolf(ctx, view, g);
      break;
    case 'vampire':
      drawVampire(ctx, frame % CYCLE);
      break;
    case 'hedgehog':
      drawHedgehog(ctx, look, view, g);
      break;
    case 'redpanda':
      drawRedPanda(ctx, look, view, g);
      break;
    case 'owl':
      drawOwl(ctx, view, g);
      break;
    case 'moth':
      drawMoth(ctx, frame % CYCLE);
      break;
    case 'firefly':
      drawFirefly(ctx, frame % CYCLE);
      break;
  }
  ctx.restore();
}
