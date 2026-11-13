// 어둠에 변한 이웃. 형태는 Sprite & Asset Reference Sheet(보랏빛 눈이 빛나는 검은 털뭉치), 정체성은 기획서.
// 이웃은 쓰러지지 않고 되돌아가므로 시트의 '사망' 프레임 대신 '되돌아온 모습'을 그린다.
// 파닥(박쥐)·개구리·노월(마녀). 새 종은 creatures.ts.
// 2026-11-13 움직임 보강 (임시 그림, "어색하지 않게"):
//  - 박쥐: 오른쪽을 보는 3/4 옆모습 4칸 날갯짓 (위 → 내려침 → 아래 → 접어 올림). 왼쪽은 게임이 flipX
//  - 개구리: 옆·앞·뒤 세 방향 × 4칸 폴짝 (웅크림 → 박차기 → 공중 → 착지) = 12칸, 칸 번호 = 방향 × 4 + 칸
//  - 노월: 대기 4칸(옷자락·머리카락·모자 끝·지팡이가 살랑) · 시전 2칸(지팡이를 들어 초승달이 빛남) · 진정 1칸(눈을 감고 미소)
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
  glowEyes,
  limb,
  moonRim,
  rotatedPoly,
  splitFrame,
  spikyPath,
  tilted,
} from './critterKit';

// ---------------------------------------------------------------------------
// 파닥 (박쥐)
// ---------------------------------------------------------------------------

export const BAT = { size: 80, cx: 40, cy: 44, frames: 4 } as const;

/** 박쥐 날개 한 장 (오른쪽으로 뻗은 모양, side로 좌우). far = 몸 뒤의 먼 날개(짧고 어둡게) */
function batWing(ctx: Ctx, x: number, y: number, side: -1 | 1, f: FlapPose, fill: string, edge: string, far: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(side * f.sx * (far ? 0.72 : 1), f.sy * (far ? 0.9 : 1));
  ctx.rotate(f.a);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(10, -16, 30, -10);
  ctx.quadraticCurveTo(27, -2, 30, 6);
  ctx.quadraticCurveTo(24, 2, 21, 9);
  ctx.quadraticCurveTo(16, 4, 12, 10);
  ctx.quadraticCurveTo(8, 4, 2, 7);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // 날개 뼈
  ctx.beginPath();
  ctx.moveTo(2, 1);
  ctx.lineTo(21, 7);
  ctx.moveTo(4, -2);
  ctx.lineTo(27, -6);
  ctx.stroke();
  ctx.restore();
}

/** 어둠에 변한 파닥: 보랏빛 눈만 빛나는 검은 털뭉치 (3/4 옆모습, 오른쪽을 봄) */
export function drawBatDark(ctx: Ctx, frame: number): void {
  const f = FLAP_CYCLE[frame % CYCLE];
  const cx = BAT.cx;
  const cy = BAT.cy + f.dy;
  batWing(ctx, cx + 6, cy - 4, 1, f, '#120F1E', 'rgba(120,108,170,0.22)', true);
  batWing(ctx, cx - 8, cy - 3, -1, f, '#1B1729', 'rgba(120,108,170,0.4)', false);
  tilted(ctx, cx, cy, 0.14, () => {
    // 늘어진 발 (뒤로)
    ctx.fillStyle = DARK_FUR2;
    for (const d of [-5, 0]) {
      ellipse(ctx, cx + d - 1, cy + 13.5 - (frame === 2 ? 1 : 0), 2, 2.8, 0.5);
      ctx.fill();
    }
    ctx.fillStyle = DARK_FUR;
    starPath(ctx, cx, cy + 1, 11, 15, 12.2, frame * 0.08);
    ctx.fill();
    // 귀 (앞으로 살짝 기울고, 날갯짓에 까딱)
    rotatedPoly(ctx, cx - 7, cy - 8, -0.2 - f.dy * 0.03, [
      [-3.5, 1],
      [-1, -15],
      [4, 0],
    ]);
    rotatedPoly(ctx, cx + 7, cy - 8, 0.2 - f.dy * 0.03, [
      [-3.5, 0],
      [1, -14],
      [3.5, 1],
    ]);
    moonRim(ctx, cx, cy + 1, 13.5, -2.6, -1.2);
    // 얼굴은 보는 쪽(오른쪽)으로: 먼 눈은 조금 작게
    glowEyes(ctx, [[cx - 0.5, cy]], 3, 2.3);
    glowEyes(ctx, [[cx + 8, cy - 0.2]], 2.5, 2.1);
  });
}

/** 되돌아온 파닥: 라벤더색, 얼굴이 있는 작은 박쥐 (3/4 옆모습) */
export function drawBatTrue(ctx: Ctx, frame: number): void {
  const f = FLAP_CYCLE[frame % CYCLE];
  const cx = BAT.cx;
  const cy = BAT.cy + f.dy;
  batWing(ctx, cx + 6, cy - 4, 1, f, '#7A6CB8', 'rgba(246,241,231,0.4)', true);
  batWing(ctx, cx - 8, cy - 3, -1, f, '#8F80CF', 'rgba(246,241,231,0.6)', false);
  tilted(ctx, cx, cy, 0.12, () => {
    // 늘어진 발
    ctx.fillStyle = '#8F80CF';
    for (const d of [-5, 0]) {
      ellipse(ctx, cx + d - 1, cy + 13.5 - (frame === 2 ? 1 : 0), 2, 2.8, 0.5);
      ctx.fill();
    }
    // 귀 (안쪽은 새벽빛)
    for (const [x, rot] of [
      [cx - 7, -0.2],
      [cx + 7, 0.2],
    ] as const) {
      ctx.fillStyle = Palette.lavender;
      rotatedPoly(ctx, x, cy - 7, rot - f.dy * 0.03, [
        [-4, 1],
        [rot < 0 ? -1 : 1, -16],
        [4, 1],
      ]);
      ctx.fillStyle = 'rgba(242,184,128,0.75)';
      rotatedPoly(ctx, x, cy - 7, rot - f.dy * 0.03, [
        [-2, -1],
        [rot < 0 ? -0.6 : 0.6, -10],
        [2, -1],
      ]);
    }
    ellipse(ctx, cx, cy + 1, 13, 13.5);
    ctx.fillStyle = Palette.lavender;
    ctx.fill();
    ctx.strokeStyle = 'rgba(246,241,231,0.55)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ellipse(ctx, cx + 2, cy + 6, 7.5, 6.5);
    ctx.fillStyle = '#DCD3F7';
    ctx.fill();
    // 얼굴 (오른쪽으로)
    ctx.fillStyle = '#2A2440';
    for (const [x, r] of [
      [cx - 0.5, 2.6],
      [cx + 7.5, 2.3],
    ] as const) {
      ctx.beginPath();
      ctx.arc(x, cy - 1, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#FFFFFF';
    for (const x of [cx - 1.4, cx + 6.7]) {
      ctx.beginPath();
      ctx.arc(x, cy - 2, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(242,184,128,0.7)';
    for (const x of [cx - 4, cx + 10.5]) {
      ellipse(ctx, x, cy + 3, 2.2, 1.4);
      ctx.fill();
    }
    ctx.strokeStyle = '#2A2440';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx + 3.5, cy + 2, 2, 0.2, Math.PI - 0.2);
    ctx.stroke();
  });
}

// ---------------------------------------------------------------------------
// 노월 (보스, 192 칸, 옷자락 끝 = 아래)
// ---------------------------------------------------------------------------

export const WITCH = { size: 192, frames: 7 } as const;
/** 노월 시트 칸: 대기 0~3 (`witch-idle` 반복) · 시전 4~5 (`witch-cast` 한 번) · 진정 6 (한 칸, 진정됐을 때 setFrame) */
export const WITCH_FRAME = { idle: [0, 1, 2, 3], cast: [4, 5], calm: 6 } as const;

const ROBE = '#2B1B3D';
const ROBE_IN = '#3A2A5A';
const HAIR = '#E9D7F7';
const SKIN = '#F6E9F2';

interface WitchPose {
  /** 대기 살랑임 위상 (라디안) */
  th: number;
  /** 지팡이 쥔 손 위치·기울기 (+ = 아래쪽이 오른쪽) */
  grip: [number, number];
  rot: number;
  /** 왼손: 늘어뜨림 · 앞으로 뻗음(시전) · 가슴에 얹음(진정) */
  left: 'down' | 'out' | 'chest';
  face: 'open' | 'focus' | 'closed';
  /** 초승달 빛 세기 (0~1)와 색 */
  glow: number;
  glowColor: string;
  /** 마법 바람: 머리카락·옷자락이 들림 (0~1) */
  flare: number;
  /** 몸 높이 (디자인 단위, - = 위) */
  dy: number;
}

function witchPose(frame: number): WitchPose {
  if (frame >= 0 && frame < 4) {
    const th = (frame / 4) * Math.PI * 2;
    return {
      th,
      grip: [46, 16],
      rot: 0.12 + 0.035 * Math.sin(th - 0.5),
      left: 'down',
      face: 'open',
      glow: 0.55,
      glowColor: Palette.lavender,
      flare: 0,
      dy: Math.round(Math.sin(th) * 10) / 10,
    };
  }
  if (frame === 4)
    return { th: 0.6, grip: [44, -2], rot: -0.08, left: 'out', face: 'focus', glow: 0.8, glowColor: Palette.lavender, flare: 0.5, dy: -1 };
  if (frame === 5)
    return { th: 1.2, grip: [40, -14], rot: -0.3, left: 'out', face: 'focus', glow: 1, glowColor: Palette.lavender, flare: 1, dy: -2 };
  return { th: 0, grip: [47, 12], rot: 0.08, left: 'chest', face: 'closed', glow: 0.6, glowColor: Palette.amber, flare: 0, dy: 1 };
}

/** 초승달 (가운데 빈 원을 잘라 낸 모양) + 둘레 빛 */
function crescent(ctx: Ctx, x: number, y: number, p: WitchPose): void {
  const halo = ctx.createRadialGradient(x, y, 2, x, y, 18 + p.glow * 14);
  const c = p.glowColor === Palette.amber ? '255,200,87' : '168,156,217';
  halo.addColorStop(0, `rgba(${c},${0.55 * p.glow})`);
  halo.addColorStop(1, `rgba(${c},0)`);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, 18 + p.glow * 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.clip();
  ctx.beginPath();
  ctx.rect(x - 14, y - 14, 28, 28);
  ctx.arc(x + 5, y - 4, 9, 0, Math.PI * 2, true);
  ctx.fillStyle = p.glowColor === Palette.amber ? '#FFE7B0' : '#F4D6FF';
  ctx.fill();
  ctx.restore();
  // 시전: 초승달 둘레의 작은 별
  if (p.flare > 0.7) {
    ctx.fillStyle = '#F4D6FF';
    for (const [dx, dy, r] of [
      [-16, -6, 3.2],
      [12, -16, 2.6],
      [16, 8, 2.2],
      [-8, 15, 2],
    ] as const) {
      starPath(ctx, x + dx, y + dy, 4, r, r * 0.35, 0);
      ctx.fill();
    }
  }
}

/** 지팡이 (쥔 손을 축으로 rot만큼 기울어짐) */
function staff(ctx: Ctx, p: WitchPose): { tx: number; ty: number } {
  const [gx, gy] = p.grip;
  const s = Math.sin(p.rot);
  const c = Math.cos(p.rot);
  const tx = gx - s * 48;
  const ty = gy - c * 48;
  ctx.save();
  ctx.strokeStyle = '#7A5530';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(gx + s * 56, gy + c * 56);
  ctx.stroke();
  // 나뭇결 한 줄
  ctx.strokeStyle = 'rgba(246,233,242,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tx - c * 1, ty + s * 1);
  ctx.lineTo(gx + s * 40 - c, gy + c * 40 + s);
  ctx.stroke();
  ctx.restore();
  return { tx: tx - s * 9, ty: ty - c * 9 };
}

/** 소매 + 손 (어깨 → 팔꿈치 → 손) */
function arm(ctx: Ctx, sx: number, sy: number, ex: number, ey: number, hx: number, hy: number): void {
  limb(ctx, sx, sy, ex, ey, hx, hy, 11, ROBE);
  // 소매 끝 (나팔 소매 + 라벤더 단)
  const a = Math.atan2(hy - ey, hx - ex);
  ctx.save();
  ctx.translate(hx - Math.cos(a) * 3, hy - Math.sin(a) * 3);
  ctx.rotate(a);
  ctx.fillStyle = ROBE_IN;
  ellipse(ctx, 0, 0, 3, 7.5);
  ctx.fill();
  ctx.strokeStyle = Palette.lavender;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, 3, 7.5, 0, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(hx, hy, 4.6, 0, Math.PI * 2);
  ctx.fill();
}

/** 노월(보스): 태양을 재운 마녀. 어두운 보랏빛 망토, 라벤더 머리, 초승달 지팡이 (기획서 색 #2B1B3D → #F4D6FF) */
export function drawWitch(ctx: Ctx, frame: number): void {
  const p = witchPose(frame);
  const sway = Math.sin(p.th);
  const hs = 2.2 * Math.sin(p.th - 0.8) + p.flare * 2;
  const hem = 2.6 * sway;
  ctx.save();
  ctx.translate(96, 112 + p.dy);
  ctx.lineJoin = 'round';

  // 머리카락 (뒤): 끝이 늦게 따라 흔들리고, 시전 때 바람에 들린다
  ctx.fillStyle = HAIR;
  ctx.beginPath();
  ctx.moveTo(-26, -24);
  ctx.quadraticCurveTo(-40 - hs, 26 - p.flare * 6, -31 - hs * 1.5, 54 - p.flare * 10);
  ctx.quadraticCurveTo(-22 - hs, 50 - p.flare * 8, -16 - hs * 0.8, 56 - p.flare * 9);
  ctx.quadraticCurveTo(0, 50, 16 - hs * 0.8, 56 - p.flare * 9);
  ctx.quadraticCurveTo(22 - hs, 50 - p.flare * 8, 31 - hs * 1.5, 54 - p.flare * 10);
  ctx.quadraticCurveTo(40 - hs, 26 - p.flare * 6, 26, -24);
  ctx.closePath();
  ctx.fill();

  // 망토: 옆선은 함께 흔들리고 아랫단은 물결이 흐른다
  const hemY = (x: number) => 78 + 2.2 * Math.sin(x * 0.12 + p.th * 1.0) - p.flare * Math.abs(x) * 0.08;
  ctx.fillStyle = ROBE;
  ctx.beginPath();
  ctx.moveTo(-22, 12);
  ctx.quadraticCurveTo(-44 - hem - p.flare * 6, 56, -50 - hem - p.flare * 8, hemY(-50));
  for (let x = -50; x <= 50; x += 5) ctx.lineTo(x + hem * (1 - Math.abs(x) / 100) + (x < 0 ? -1 : 1) * p.flare * 8 * (Math.abs(x) / 50), hemY(x));
  ctx.quadraticCurveTo(44 + hem + p.flare * 6, 56, 22, 12);
  ctx.closePath();
  ctx.fill();
  // 옷 주름 (몸을 따라 살랑)
  ctx.strokeStyle = ROBE_IN;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const x of [-16, 14]) {
    ctx.beginPath();
    ctx.moveTo(x * 0.6, 30);
    ctx.quadraticCurveTo(x + hem * 0.5, 52, x * 1.4 + hem, 74);
    ctx.stroke();
  }
  // 아랫단 라벤더 띠
  ctx.strokeStyle = Palette.lavender;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = -48; x <= 48; x += 4) {
    const px = x + hem * (1 - Math.abs(x) / 100) + (x < 0 ? -1 : 1) * p.flare * 8 * (Math.abs(x) / 50);
    const py = hemY(x) - 4;
    if (x === -48) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // 왼팔 (보는 사람 기준 왼쪽)
  if (p.left === 'down') arm(ctx, -19, 16, -30, 30 + sway, -30, 46 + sway * 0.5);
  else if (p.left === 'out') arm(ctx, -19, 16, -34, 18, -42 + p.flare * 2, 6 - p.flare * 6);
  // 깃
  ctx.fillStyle = ROBE_IN;
  ctx.beginPath();
  ctx.moveTo(-18, 14);
  ctx.lineTo(0, 30);
  ctx.lineTo(18, 14);
  ctx.closePath();
  ctx.fill();

  // 지팡이 + 초승달, 오른팔
  const tip = staff(ctx, p);
  const [gx, gy] = p.grip;
  arm(ctx, 19, 16, (19 + gx) / 2 + 4, (16 + gy) / 2 + 8, gx, gy);
  crescent(ctx, tip.tx, tip.ty, p);
  if (p.left === 'chest') arm(ctx, -19, 16, -22, 34, -6, 30);
  if (p.left === 'out' && p.flare > 0.7) {
    // 앞으로 뻗은 손끝의 작은 빛
    ctx.fillStyle = 'rgba(244,214,255,0.9)';
    starPath(ctx, -44, -2, 4, 4, 1.4, 0);
    ctx.fill();
  }

  // 얼굴
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(0, -6, 22, 0, Math.PI * 2);
  ctx.fill();
  // 앞머리 (살짝 흔들림)
  const bang = Math.sin(p.th - 1) * 0.8 + p.flare * 1.5;
  ctx.fillStyle = HAIR;
  ctx.beginPath();
  ctx.moveTo(-23, -10);
  ctx.quadraticCurveTo(-11 + bang, -1, bang * 0.5, -15 - p.flare);
  ctx.quadraticCurveTo(11 + bang, -1, 23, -10);
  ctx.lineTo(23, -24);
  ctx.lineTo(-23, -24);
  ctx.closePath();
  ctx.fill();
  // 옆머리 (얼굴 양옆으로 늘어짐)
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(d * 18, -16);
    ctx.quadraticCurveTo(d * 25 + hs * 0.4, 4, d * 21 + hs * 0.6, 18);
    ctx.quadraticCurveTo(d * 17, 4, d * 15, -12);
    ctx.closePath();
    ctx.fill();
  }

  // 눈
  if (p.face === 'closed') {
    ctx.strokeStyle = '#6E5A8A';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(d * 8, -3.5, 4.2, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    }
  } else {
    for (const d of [-1, 1]) {
      ellipse(ctx, d * 8, -2, 4.4, p.face === 'focus' ? 4.4 : 5.6);
      ctx.fillStyle = Palette.lavender;
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(d * 8 - 1.4, -4, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (p.face === 'focus') {
      // 시전: 눈꺼풀을 조금 내리고 눈썹을 모은다 (무섭지 않게)
      ctx.strokeStyle = '#7A5A7A';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      for (const d of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(d * 12.5, -6.2);
        ctx.lineTo(d * 3.8, -5.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(d * 12, -12);
        ctx.lineTo(d * 4.5, -10.4);
        ctx.stroke();
      }
    }
  }
  // 볼 (새벽빛)
  ctx.fillStyle = p.face === 'closed' ? 'rgba(242,184,128,0.7)' : 'rgba(242,184,128,0.5)';
  for (const d of [-1, 1]) {
    ellipse(ctx, d * 13, 5, 3.4, 2);
    ctx.fill();
  }
  // 입
  ctx.strokeStyle = '#7A5A7A';
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (p.face === 'focus') {
    ctx.moveTo(-2.2, 7.5);
    ctx.lineTo(2.2, 7.5);
  } else if (p.face === 'closed') ctx.arc(0, 5, 4, 0.25, Math.PI - 0.25);
  else ctx.arc(0, 6, 3, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // 모자: 끝이 늦게 따라 흔들림 (진정 땐 살짝 기울어짐)
  tilted(ctx, 0, -26, p.face === 'closed' ? -0.06 : p.flare * 0.04, () => {
    const tipX = 10 + 3.2 * Math.sin(p.th - 1.3) + p.flare * 4;
    const tipY = -94 + Math.abs(Math.sin(p.th - 1.3)) * 1.5;
    ctx.fillStyle = ROBE_IN;
    ellipse(ctx, 0, -26, 46, 10);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-26, -28);
    ctx.quadraticCurveTo(-8, -70, tipX, tipY);
    ctx.quadraticCurveTo(14 + (tipX - 10) * 0.4, -60, 26, -28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = Palette.lavender;
    ctx.fillRect(-25, -38, 50, 7);
    ctx.fillStyle = Palette.amber;
    starPath(ctx, 0, -34.5, 5, 6, 2.6);
    ctx.fill();
  });
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 개구리 (잃어버린 빛의 주민, 2026-11-12 새 기획) — 옆·앞·뒤 × 폴짝 4칸
// ---------------------------------------------------------------------------

/** cy = 몸 가운데(Frog.ts가 원점으로 씀). 발 = 57 근처. 칸 번호 = 방향(옆·앞·뒤) × 4 + 폴짝 칸 */
export const FROG = { size: 64, cx: 32, cy: 40, frames: 12 } as const;
/** 폴짝 4칸 이름 (게임이 폴짝 진행도 p로 칸을 맞출 때: 칸 = floor((p + 0.125) × 4) % 4) */
export const FROG_HOP = { crouch: 0, push: 1, air: 2, land: 3 } as const;

interface FrogLook {
  dark: boolean;
  body: string;
  near: string;
  far: string;
  belly: string;
  line: string;
}

const FROG_DARK: FrogLook = { dark: true, body: DARK_FUR, near: DARK_FUR2, far: DARK_FAR, belly: DARK_FUR2, line: 'rgba(168,156,217,0.32)' };
const FROG_TRUE: FrogLook = { dark: false, body: '#7CC57A', near: '#6AB46A', far: '#4F9653', belly: '#F2F5DC', line: 'rgba(30,60,40,0.55)' };

/** 폴짝 칸마다 몸: 기울기(+ = 코가 아래) · 가로·세로 늘임 · 몸 높이 */
const HOP = [
  { rot: 0.04, sx: 1.08, sy: 0.9, dy: 2 },
  { rot: -0.32, sx: 0.94, sy: 1.1, dy: -1 },
  { rot: -0.06, sx: 1.1, sy: 0.93, dy: -3 },
  { rot: 0.2, sx: 1, sy: 1, dy: -1 },
] as const;

type P = readonly [number, number];
/** 옆모습 다리 자세: 뒷다리(엉덩이·무릎·발목·발끝) · 앞다리(어깨·발) */
const SIDE_LEGS: readonly { hip: P; knee: P; ankle: P; toe: P; sh: P; paw: P }[] = [
  { hip: [23, 47], knee: [34, 52], ankle: [21, 55], toe: [30, 56.5], sh: [37, 48], paw: [39, 56] },
  { hip: [22, 44], knee: [17, 50], ankle: [12, 55], toe: [5, 57], sh: [36, 45], paw: [33, 50] },
  { hip: [20, 41], knee: [12, 44], ankle: [6, 46], toe: [2, 47.5], sh: [38, 41], paw: [47, 46] },
  { hip: [22, 44], knee: [30, 48], ankle: [19, 51], toe: [26, 53], sh: [38, 44], paw: [45, 55.5] },
];

/** 물갈퀴 발: 발목 → 발끝으로 길쭉한 타원 + 발가락 셋 */
function webFoot(ctx: Ctx, a: P, t: P, color: string, w = 2.2): void {
  const ang = Math.atan2(t[1] - a[1], t[0] - a[0]);
  const len = Math.hypot(t[0] - a[0], t[1] - a[1]);
  ctx.save();
  ctx.translate((a[0] + t[0]) / 2, (a[1] + t[1]) / 2);
  ctx.rotate(ang);
  ctx.fillStyle = color;
  ellipse(ctx, 0, 0, len / 2 + 1, w);
  ctx.fill();
  for (const k of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.arc(len / 2 + 0.5, k * w * 0.8, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 개구리 몸 (옆모습): 털뭉치(dark) 또는 연두 몸 + 눈 혹 하나(먼 눈 혹은 뒤로 조금) */
function frogSideBody(ctx: Ctx, L: FrogLook, phase: number): void {
  const h = HOP[phase];
  const x = 30;
  const y = 41 + h.dy;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(h.rot);
  ctx.scale(h.sx, h.sy);
  // 먼 눈 혹
  ctx.fillStyle = L.dark ? DARK_FAR : L.far;
  ellipse(ctx, 11, -9, 5.5, 5.5);
  ctx.fill();
  ctx.fillStyle = L.body;
  if (L.dark) {
    spikyPath(ctx, 0, 0, 15, 11, 12, 0.2, { phase: phase * 0.12, top: 1.4, bottom: 0.5 });
    ctx.fill();
  } else {
    ellipse(ctx, 0, 0, 15.5, 11);
    ctx.fill();
    ctx.strokeStyle = L.line;
    ctx.lineWidth = 1.3;
    ctx.stroke();
    // 하얀 배 (아래 앞쪽)
    ctx.save();
    ellipse(ctx, 0, 0, 15.5, 11);
    ctx.clip();
    ellipse(ctx, 5, 9, 12, 6);
    ctx.fillStyle = L.belly;
    ctx.fill();
    ctx.restore();
    // 등 점무늬
    ctx.fillStyle = 'rgba(79,150,83,0.7)';
    for (const [px, py, r] of [
      [-6, -6, 2.2],
      [-10, -1, 1.6],
      [-2, -8, 1.4],
    ] as const) {
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 가까운 눈 혹
  ctx.fillStyle = L.body;
  ellipse(ctx, 7, -9.5, 6.5, 6.2);
  ctx.fill();
  if (L.dark) {
    ctx.restore();
    moonRim(ctx, x, y, 15.5, -2.7, -1.3, 11);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(h.rot);
    ctx.scale(h.sx, h.sy);
    glowEyes(ctx, [[8.5, -10]], 3, 2.6);
    ctx.restore();
    return;
  }
  ctx.strokeStyle = L.line;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(7, -9.5, 6.4, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  ellipse(ctx, 8.5, -10, 3.6, 3.8);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.fillStyle = '#23302A';
  ctx.beginPath();
  ctx.arc(9.6, -9.8, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(8.8, -10.8, 0.8, 0, Math.PI * 2);
  ctx.fill();
  // 넓은 입 (코끝에서 뒤로 웃는 선) + 볼
  ctx.strokeStyle = '#23302A';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(15, -1.5);
  ctx.quadraticCurveTo(10, 2.5, 4, 0.5);
  ctx.stroke();
  ctx.fillStyle = 'rgba(242,184,128,0.7)';
  ellipse(ctx, 6, -2.5, 2.4, 1.4);
  ctx.fill();
  ctx.restore();
}

function frogSide(ctx: Ctx, L: FrogLook, phase: number): void {
  const s = SIDE_LEGS[phase];
  const off = (p: P, dx: number, dy: number): P => [p[0] + dx, p[1] + dy];
  // 먼 다리 (조금 뒤·위)
  const fd = [3, -1.5] as const;
  limb(ctx, ...off(s.hip, ...fd), ...off(s.knee, ...fd), ...off(s.ankle, ...fd), 5.5, L.far);
  webFoot(ctx, off(s.ankle, ...fd), off(s.toe, ...fd), L.far, 1.8);
  limb(ctx, ...off(s.sh, ...fd), (s.sh[0] + s.paw[0]) / 2 + fd[0] + 1, (s.sh[1] + s.paw[1]) / 2 + fd[1], ...off(s.paw, ...fd), 3.6, L.far);
  // 가까운 뒷다리: 허벅지(굵게) → 정강이 → 물갈퀴 발
  limb(ctx, s.hip[0], s.hip[1], (s.hip[0] + s.knee[0]) / 2, (s.hip[1] + s.knee[1]) / 2 + 2, s.knee[0], s.knee[1], 8, L.near);
  limb(ctx, s.knee[0], s.knee[1], (s.knee[0] + s.ankle[0]) / 2, (s.knee[1] + s.ankle[1]) / 2, s.ankle[0], s.ankle[1], 4.5, L.near);
  webFoot(ctx, s.ankle, s.toe, L.near);
  frogSideBody(ctx, L, phase);
  // 가까운 앞다리 (몸 앞)
  limb(ctx, s.sh[0], s.sh[1], (s.sh[0] + s.paw[0]) / 2 + 1, (s.sh[1] + s.paw[1]) / 2, s.paw[0], s.paw[1], 4, L.near);
  ctx.fillStyle = L.near;
  ellipse(ctx, s.paw[0] + 1.2, s.paw[1] + 0.3, 3, 1.7);
  ctx.fill();
}

/** 앞·뒤 모습 몸 (눈 혹 둘) */
function frogFrontBody(ctx: Ctx, L: FrogLook, phase: number, back: boolean): void {
  const h = HOP[phase];
  const x = 32;
  const y = 41 + h.dy;
  const sx = phase === 2 ? 1.04 : h.sx;
  const sy = phase === 2 ? 1.02 : h.sy;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  ctx.fillStyle = L.body;
  if (L.dark) {
    starPath(ctx, 0, 2, 14, 17, 14.5, phase * 0.1);
    ctx.fill();
  } else {
    ellipse(ctx, 0, 3, 17, 14);
    ctx.fill();
    ctx.strokeStyle = L.line;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    if (!back) {
      ellipse(ctx, 0, 8, 10, 7);
      ctx.fillStyle = L.belly;
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(79,150,83,0.7)';
      for (const [px, py, r] of [
        [-6, 0, 2.6],
        [5, 4, 2.2],
        [-1, 9, 1.8],
        [8, -3, 1.5],
      ] as const) {
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // 눈 혹
  for (const d of [-1, 1]) {
    ellipse(ctx, d * 8, -9.5, 7, 6.5);
    ctx.fillStyle = L.body;
    ctx.fill();
    if (!L.dark) {
      ctx.strokeStyle = L.line;
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
  }
  if (L.dark) {
    ctx.restore();
    moonRim(ctx, x, y + 2, 16, -2.6, -1.4);
    if (back) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, sy);
    glowEyes(ctx, [
      [-8, -10],
      [8, -10],
    ], 3, 2.4);
    ctx.restore();
    return;
  }
  if (!back) {
    for (const d of [-1, 1]) {
      ellipse(ctx, d * 8, -9.5, 3.6, 3.8);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(d * 8, -9, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = '#23302A';
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(242,184,128,0.7)';
    for (const d of [-1, 1]) {
      ellipse(ctx, d * 10, -0.5, 2.6, 1.6);
      ctx.fill();
    }
    ctx.strokeStyle = '#23302A';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(0, -1.5, 4.5, 0.25, Math.PI - 0.25);
    ctx.stroke();
  }
  ctx.restore();
}

function frogFront(ctx: Ctx, L: FrogLook, phase: number): void {
  const cx = 32;
  // 뒷다리 (몸 옆·뒤)
  for (const d of [-1, 1]) {
    if (phase === 0) {
      ctx.fillStyle = L.near;
      ellipse(ctx, cx + d * 15, 50, 7.5, 5.5);
      ctx.fill();
      webFoot(ctx, [cx + d * 15, 55.5], [cx + d * 22, 56], L.near, 2);
    } else if (phase === 1) {
      limb(ctx, cx + d * 11, 44, cx + d * 14, 50, cx + d * 13, 55, 6, L.near);
      webFoot(ctx, [cx + d * 13, 55], [cx + d * 15, 57.5], L.near, 2);
    } else if (phase === 2) {
      ctx.fillStyle = L.far;
      ellipse(ctx, cx + d * 7, 52, 3.4, 2.2);
      ctx.fill();
    } else {
      ctx.fillStyle = L.near;
      ellipse(ctx, cx + d * 14, 47, 6.5, 5);
      ctx.fill();
      webFoot(ctx, [cx + d * 14, 51], [cx + d * 19, 52.5], L.far, 1.8);
    }
  }
  frogFrontBody(ctx, L, phase, false);
  // 앞발
  ctx.fillStyle = L.near;
  for (const d of [-1, 1]) {
    if (phase === 0) {
      ellipse(ctx, cx + d * 9, 56, 5.5, 2.6);
      ctx.fill();
    } else if (phase === 1) {
      ellipse(ctx, cx + d * 7, 50.5, 3.6, 2.4);
      ctx.fill();
    } else if (phase === 2) {
      limb(ctx, cx + d * 10, 41, cx + d * 15, 43, cx + d * 18, 47, 4, L.near);
      ellipse(ctx, cx + d * 18.5, 47.5, 3.6, 2.2);
      ctx.fill();
    } else {
      limb(ctx, cx + d * 10, 44, cx + d * 13, 49, cx + d * 13, 54, 4, L.near);
      ellipse(ctx, cx + d * 13.5, 55, 4.4, 2.2);
      ctx.fill();
    }
  }
}

function frogBack(ctx: Ctx, L: FrogLook, phase: number): void {
  const cx = 32;
  const sole = L.dark ? '#3A3256' : '#B9E3A0';
  // 앞발 (멀리, 몸 너머로 살짝)
  ctx.fillStyle = L.far;
  for (const d of [-1, 1]) {
    if (phase === 3) {
      ellipse(ctx, cx + d * 14, 49, 3.6, 2);
      ctx.fill();
    } else if (phase === 0) {
      ellipse(ctx, cx + d * 9, 52, 3.4, 1.8);
      ctx.fill();
    }
  }
  frogFrontBody(ctx, L, phase, true);
  // 뒷다리 (가까움): 박차고 뻗을 때 발바닥이 보인다
  for (const d of [-1, 1]) {
    if (phase === 0) {
      ctx.fillStyle = L.near;
      ellipse(ctx, cx + d * 14, 49, 7.5, 6);
      ctx.fill();
      webFoot(ctx, [cx + d * 13, 55.5], [cx + d * 20, 56.5], L.near, 2.2);
    } else if (phase === 1) {
      limb(ctx, cx + d * 11, 46, cx + d * 13, 51, cx + d * 12, 55, 7, L.near);
      ctx.fillStyle = L.near;
      ellipse(ctx, cx + d * 12, 58, 4.8, 2.9);
      ctx.fill();
      ctx.fillStyle = sole;
      ellipse(ctx, cx + d * 12, 58, 3, 1.7);
      ctx.fill();
    } else if (phase === 2) {
      limb(ctx, cx + d * 9, 43, cx + d * 10.5, 51, cx + d * 10, 57, 6.5, L.near);
      ctx.fillStyle = L.near;
      ellipse(ctx, cx + d * 10, 60, 5.4, 3.2);
      ctx.fill();
      ctx.fillStyle = sole;
      ellipse(ctx, cx + d * 10, 60, 3.4, 1.9);
      ctx.fill();
    } else {
      ctx.fillStyle = L.near;
      ellipse(ctx, cx + d * 13, 47, 7, 5.5);
      ctx.fill();
      webFoot(ctx, [cx + d * 13, 52], [cx + d * 19, 54], L.near, 2);
    }
  }
}

function drawFrog(ctx: Ctx, L: FrogLook, frame: number): void {
  const { view, phase } = splitFrame(frame);
  ctx.save();
  ctx.lineJoin = 'round';
  if (view === 'side') frogSide(ctx, L, phase);
  else if (view === 'front') frogFront(ctx, L, phase);
  else frogBack(ctx, L, phase);
  ctx.restore();
}

/** 빛을 잃은 개구리: 보랏빛 눈만 빛나는 검은 털뭉치 (눈 두 혹이 개구리 모양) */
export function drawFrogDark(ctx: Ctx, frame: number): void {
  drawFrog(ctx, FROG_DARK, frame);
}

/** 제 모습을 찾은 개구리: 연두빛, 하얀 배, 웃는 얼굴 */
export function drawFrogTrue(ctx: Ctx, frame: number): void {
  drawFrog(ctx, FROG_TRUE, frame);
}

/** 개구리 폴짝 애니메이션: `${base}`(옆) · `${base}-front` · `${base}-back` */
export function frogAnims(base: string, frameRate: number): { key: string; frames: number[]; frameRate: number; repeat: number }[] {
  return CRITTER_VIEWS.map((view: CritterView, v) => ({
    key: view === 'side' ? base : `${base}-${view}`,
    frames: [0, 1, 2, 3].map((p) => v * CYCLE + p),
    frameRate,
    repeat: -1,
  }));
}
