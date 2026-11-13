// 적·주민 임시 코드 그림의 공통 도구 (creatures.ts·enemies.ts가 함께 쓴다, 2026-11-13).
// 걷는 종은 옆·앞·뒤 세 방향 × 4칸 걸음, 나는 종은 옆(3/4) 4칸 날갯짓. 왼쪽은 게임이 좌우 뒤집기(flipX)로 만든다.
import { type Ctx, Palette, ellipse } from './kit';

/** 걷는 종의 방향: 옆(오른쪽을 봄) · 앞(화면 아래로 걸어옴) · 뒤(화면 위로 걸어감) */
export type CritterView = 'side' | 'front' | 'back';
/** 시트 안 방향 순서 (칸 번호 = 방향 × 4 + 걸음) */
export const CRITTER_VIEWS: readonly CritterView[] = ['side', 'front', 'back'];
/** 한 방향의 걸음·날갯짓 칸 수 */
export const CYCLE = 4;

/** 시트 칸 번호 → 방향·걸음 칸 */
export function splitFrame(frame: number): { view: CritterView; phase: number } {
  return { view: CRITTER_VIEWS[Math.floor(frame / CYCLE) % CRITTER_VIEWS.length], phase: frame % CYCLE };
}

/**
 * 4칸 걸음 주기. 0·2 = 디딤(두 짝이 앞뒤로 벌어짐, 몸 낮음), 1·3 = 지나감(한 짝이 들려 앞으로, 몸 높음).
 * 다리 두 짝은 phi = 0 / π. 앞뒤 흔들림은 1주기라 4칸이 모두 다르고, 몸 높이는 2주기라 두 값을 오간다.
 */
export interface Gait {
  phase: number;
  /** 다리 앞뒤 위치 (-1~1). +1 = 앞으로 뻗음 */
  swing(phi?: number): number;
  /** 발 들림 (0~1): 앞으로 옮기는 칸에서만 */
  lift(phi?: number): number;
  /** 몸 높이 (0~1): 지나가는 칸에서 1 */
  up: number;
  /** 좌우·앞뒤로 한 번 흔들림 (-1~1). lag(라디안)만큼 늦게 따라온다 (꼬리·귀·머리카락) */
  sway(lag?: number): number;
}

const clean = (v: number) => (Math.abs(v) < 1e-9 ? 0 : v);

export function gait(phase: number): Gait {
  const th = (phase / CYCLE) * Math.PI * 2;
  return {
    phase,
    swing: (phi = 0) => clean(Math.cos(th + phi)),
    lift: (phi = 0) => clean(Math.max(0, -Math.sin(th + phi))),
    up: clean(1 - Math.abs(Math.cos(th))),
    sway: (lag = 0) => clean(Math.sin(th - lag)),
  };
}

/**
 * 나는 종(박쥐·뱀파이어)의 4칸 날갯짓: 날개 각도 · 가로(접힘) · 세로(오므림) · 몸 오르내림.
 * 0 = 위로 활짝, 1 = 내려치는 중(수평, 오므림), 2 = 아래, 3 = 접어 올리는 중 → 0. 내려칠 때 몸이 뜬다
 */
export const FLAP_CYCLE = [
  { a: -0.78, sx: 1, sy: 1, dy: 1.5 },
  { a: -0.08, sx: 1, sy: 0.82, dy: -0.5 },
  { a: 0.48, sx: 0.88, sy: 1, dy: -2 },
  { a: -0.32, sx: 0.6, sy: 0.92, dy: -0.5 },
] as const;
export type FlapPose = (typeof FLAP_CYCLE)[number];

// ---------------------------------------------------------------------------
// 색
// ---------------------------------------------------------------------------

/** 빛을 잃은 털 (박쥐·개구리와 같은 색) */
export const DARK_FUR = '#14111F';
/** 가까운 다리·얼굴 자리 (조금 밝게: 걸음이 읽히게) */
export const DARK_FUR2 = '#221C36';
/** 먼 다리 (몸 뒤, 더 어둡게) */
export const DARK_FAR = '#0B0913';
export const MOON_RIM = 'rgba(168,156,217,0.38)';
export const EYE_GLOW = '#D6CCFF';
export const LINE_TRUE = '#3A2418';
/** 볼 홍조: 빨강 대신 새벽빛(DAWN) */
export const BLUSH = 'rgba(242,184,128,0.7)';

// ---------------------------------------------------------------------------
// 얼굴
// ---------------------------------------------------------------------------

/** 보랏빛으로 빛나는 눈. rot = 첫 눈의 기울기(둘째는 반대) */
export function glowEyes(ctx: Ctx, pts: readonly (readonly [number, number])[], rx: number, ry: number, rot = 0, blur = 8): void {
  ctx.save();
  ctx.shadowColor = Palette.lavender;
  ctx.shadowBlur = blur;
  ctx.fillStyle = EYE_GLOW;
  pts.forEach(([x, y], i) => {
    ellipse(ctx, x, y, rx, ry, i === 0 ? rot : -rot);
    ctx.fill();
  });
  ctx.restore();
}

/** 호스틸의 각진 눈썹: 가운데로 내려가는 V */
export function angryBrows(ctx: Ctx, cx: number, y: number, gap: number, w: number): void {
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

/** 옆모습의 각진 눈썹 한 줄: (x0,y0) 바깥(높음) → (x1,y1) 코 쪽(낮음) */
export function browLine(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): void {
  ctx.save();
  ctx.strokeStyle = '#B9AEEA';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

/** 털 끝에 비친 달빛 한 줄 (원호) */
export function moonRim(ctx: Ctx, x: number, y: number, r: number, a0 = -2.6, a1 = -0.6, ry = r): void {
  ctx.save();
  ctx.strokeStyle = MOON_RIM;
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.ellipse(x, y, r, ry, 0, a0, a1);
  ctx.stroke();
  ctx.restore();
}

/** 웃는 얼굴의 동그란 눈 (반짝임 포함) */
export function happyEyes(ctx: Ctx, pts: readonly (readonly [number, number])[], r: number, color = '#2A1C16'): void {
  for (const [x, y] of pts) {
    ctx.fillStyle = color;
    ellipse(ctx, x, y, r, r * 1.15);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.4, r * 0.38, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 졸린 눈: 아래 반쪽만 보이고 위에 눈꺼풀 선 (빛나지 않음) */
export function sleepyEyes(ctx: Ctx, pts: readonly (readonly [number, number])[], r: number, lid: string, pupil = '#2E2B40'): void {
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

export function smile(ctx: Ctx, x: number, y: number, r: number, color = LINE_TRUE): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, r, 0.25, Math.PI - 0.25);
  ctx.stroke();
  ctx.restore();
}

export function blush(ctx: Ctx, pts: readonly (readonly [number, number])[], rx = 2.8, ry = 1.7): void {
  ctx.fillStyle = BLUSH;
  for (const [x, y] of pts) {
    ellipse(ctx, x, y, rx, ry);
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// 실루엣
// ---------------------------------------------------------------------------

/** 둥근 가시(부드러운 물결 테두리)의 털뭉치 실루엣 */
export function scallopBall(ctx: Ctx, x: number, y: number, r: number, bumps: number, bumpR: number, from = Math.PI, to = Math.PI * 2): void {
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

export interface SpikyOpts {
  /** 털끝 위치를 돌리는 각 (걸음마다 조금씩 바꾸면 털이 일렁인다) */
  phase?: number;
  /** 등(위)쪽 털 길이 배율 */
  top?: number;
  /** 배(아래)쪽 털 길이 배율 */
  bottom?: number;
  /** 앞(오른쪽) 털 길이 배율 — 옆모습의 갈기 */
  front?: number;
}

/** 뾰족한 털 실루엣 경로: 타원 둘레에 털끝 n개. 위·아래·앞쪽 털 길이를 따로 (호스틸·빛을 잃은 주민) */
export function spikyPath(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, n: number, spike: number, o: SpikyOpts = {}): void {
  const { phase = 0, top = 1, bottom = 0.5, front = 1 } = o;
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = phase + (i * Math.PI) / n;
    const s = Math.sin(a);
    const c = Math.cos(a);
    let w = s < 0 ? 1 + (top - 1) * -s : 1 + (bottom - 1) * s;
    if (c > 0) w *= 1 + (front - 1) * c;
    const k = i % 2 === 0 ? 1 + spike * w : 1 - spike * 0.12;
    const x = cx + c * rx * k;
    const y = cy + s * ry * k;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
}

/** 점들을 이은 다각형을 (x, y)를 축으로 rot만큼 돌려 칠한다 (꼬리·깃털·귀) */
export function rotatedPoly(ctx: Ctx, x: number, y: number, rot: number, pts: readonly (readonly [number, number])[], sx = 1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(sx, 1);
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** 굵은 다리 한 줄 (엉덩이 → 무릎 조절점 → 발). 둥근 끝 */
export function limb(ctx: Ctx, x0: number, y0: number, kx: number, ky: number, x1: number, y1: number, width: number, color: string): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(kx, ky, x1, y1);
  ctx.stroke();
  ctx.restore();
}

/** 발밑 접지 그림자 대신 발 하나 (타원). 들린 발은 조금 작게 */
export function paw(ctx: Ctx, x: number, y: number, rx: number, ry: number, color: string, lifted = 0): void {
  ctx.fillStyle = color;
  ellipse(ctx, x, y, rx * (1 - lifted * 0.12), ry * (1 - lifted * 0.12));
  ctx.fill();
}

/** 몸 전체를 (px, py)를 축으로 rot만큼 기울여 그린다 */
export function tilted(ctx: Ctx, px: number, py: number, rot: number, draw: () => void): void {
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(rot);
  ctx.translate(-px, -py);
  draw();
  ctx.restore();
}
