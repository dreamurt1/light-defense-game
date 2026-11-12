// 루미 캐릭터 에셋 시트(reference/LUMI-sprites)에서 무엇을 어디서 자르는지 한 곳에 둔다 (2026-11-04 라이언 지시).
// 좌표는 1536×1024 원본 시트 기준. 같은 배치의 고해상도 시트가 오면 SHEET 경로와 SCALE만 바꾸면 다시 잘린다.
// 시트의 각도 라벨(턴어라운드 '정면 0°', 표 '0° = ↑')은 실제 그림과 맞지 않아, 방향은 잘라 본 그림으로 정했다.
import { dirOf, type Dir } from '../systems/facing';

export const LUMI_SHEET = {
  /** dev 서버가 프로젝트 폴더를 그대로 서빙한다 */
  url: '/reference/LUMI-sprites/bf92d2d9-5b38-4e8f-ab4d-289b8f30c655.png',
  /** 아래 좌표에 곱할 배율 (고해상도 시트로 바꾸면 2 등) */
  scale: 1,
};

/** 프레임 한 칸 (영문 지시서: 원본 128×128, 게임 안 64×64) */
export const CELL = 128;
/** 칸 안에서 발끝이 닿는 y */
export const FEET_Y = 122;
/** 대기 정면 기준 몸 높이 (귀 끝 ~ 발끝) */
export const BODY_H = 104;
/**
 * 묶음별 크기 보정: 턴어라운드는 귀가 길고 몸이 곧은 앉은 자세, 표·이동 시트는 머리가 큰 둥근 자세라
 * 높이로만 맞추면 표·이동 쪽 머리가 커 보인다. 머리 크기가 비슷해지도록 눈으로 맞춘 값
 */
export const SET_FIT = { turn: 1, grid: 0.8, walk: 0.8 };

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 배경: 어두운 판(가장자리 색 + 추가 색을 지움), 체크무늬(가짜 투명), 빛 효과(색 → 투명) */
export type Backdrop =
  | { kind: 'panel'; tolerance: number; feather: number; /** 판 색 말고 더 지울 색 (예: 발밑 그림자 타원) */ extra?: [number, number, number][] }
  | { kind: 'checker'; tolerance: number; feather: number }
  | { kind: 'glow' };

const PANEL: Backdrop = { kind: 'panel', tolerance: 22, feather: 26 };

/** 8방향 턴어라운드: 한 줄에 8포즈, 왼쪽부터 이 방향 (그림으로 확인) */
export const TURNAROUND = {
  rect: { x: 345, y: 70, w: 548, h: 106 },
  order: ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw'] as Dir[],
  // 발밑 보라 그림자 타원도 지운다 (게임이 그림자를 따로 그림)
  backdrop: { ...PANEL, extra: [[96, 68, 120], [74, 52, 92]] } as Backdrop,
};

/**
 * 정지(대기) 8방향 팩 (2026-11-06 라이언 지시): ChatGPT로 만든 256×256 투명 PNG 8장 + 같은 폴더의 manifest.json·README.md.
 * 어느 그림이 어느 각도인지는 manifest를 읽어 정한다. README대로 파츠 크롭은 따로 움직일 수 있는 레이어가 아닌 참고용이고,
 * SVG는 색을 줄인 트레이스라 게임은 PNG를 쓴다.
 */
export const IDLE_PACK = {
  dir: '/reference/Lumi_8_Direction_Pack/Lumi_Idle_8D_Pack',
  png: 'PNG_256',
  /**
   * BODY_H에 곱할 값. 이 팩은 턴어라운드보다 머리가 조금 작은 비율이라, 보이는 키를 턴어라운드(96px)보다 4%쯤 크게(100px)
   * 한 값 (눈으로 맞춤)
   */
  fit: 0.97,
  /** 선택·홈·상점 초상으로 쓰는 각도 (2026-11-06 라이언 지시: lumi_idle_045_front_right.png를 원본 해상도 그대로) */
  portraitAngle: 45,
};

/** manifest.json에서 쓰는 부분 */
export interface IdlePackManifest {
  canvas: { width: number; height: number };
  directions: { angle: number; name: string; file: string; derived_by?: string }[];
}

/** manifest 각도(0° = 정면, 시계 방향으로 90° = 오른쪽, 180° = 뒷모습) → 게임 방향(정면 = 화면 아래 s) */
export function packDir(angle: number): Dir {
  return dirOf(((90 - angle) * Math.PI) / 180);
}

/**
 * 걷기 8방향 × 4프레임 팩 (2026-11-06 라이언 지시). 방향·프레임 수·순서(contact → passing → opposite stride → return)는
 * manifest.json, 파일 이름은 README.md의 규칙(walkPackFile). 방향 폴더의 README.txt가 manifest보다 새 정보라
 * (000·045·135·180은 새로 그린 걸음, 225·270·315는 135·90·45를 그대로 뒤집은 것) 그림은 있는 파일을 그대로 쓴다.
 */
export const WALK_PACK = {
  dir: '/reference/Lumi_8_Direction_Pack/Lumi_Walk_8D_4Frames_Pack',
  png: 'Lumi_Walk_8D_4Frames/PNG_256',
  /**
   * 팩마다 그림을 상자에 맞춰 그려(정지 키 240px, 걷기 224px) 같은 방향의 정지 모습과 키를 맞춘 뒤 곱하는 값.
   * 네 프레임은 한 방향 안에서 같은 기준점(발 가운데 평균·바닥선)에 놓아 몸이 떨리지 않게 한다(README 'Keep the sprite
   * origin and ground baseline fixed')
   */
  fit: 1,
};

export interface WalkPackManifest {
  canvas: { width: number; height: number };
  directions: { degrees: number; name: string; frames: number }[];
  frame_order?: string[];
}

/** README의 이름 규칙: <각도 3자리>_<이름>/lumi_walk_<각도 3자리>_<이름>_f<01~04>.png (n은 0부터) */
export function walkPackFile(degrees: number, name: string, n: number): string {
  const a = String(degrees).padStart(3, '0');
  return `${a}_${name}/lumi_walk_${a}_${name}_f${String(n + 1).padStart(2, '0')}.png`;
}

/** 애니메이션 표: 8줄 × 상태별 칸 */
export const GRID = {
  // 줄 경계는 눈금선 밝기로 잰 값 (335 · 383 · 425 · 465 · 507 · 547 · 589 · 630 · 679)
  rows: [
    { y: 337, h: 45 },
    { y: 385, h: 40 },
    { y: 427, h: 38 },
    { y: 467, h: 39 },
    { y: 509, h: 38 },
    { y: 549, h: 39 },
    { y: 591, h: 39 },
    { y: 632, h: 46 },
  ],
  states: {
    idle: { x: 96, w: 125, count: 3 },
    walk: { x: 226, w: 138, count: 3 },
    attack: { x: 369, w: 148, count: 3 },
    hit: { x: 519, w: 110, count: 2 },
    stun: { x: 633, w: 78, count: 1 },
    ko: { x: 716, w: 83, count: 1 },
    respawn: { x: 806, w: 83, count: 1 },
  },
  backdrop: PANEL,
};
export type GridState = keyof typeof GRID.states;

/** 아래쪽 '이동 스프라이트 시트': 체크무늬 위 6줄 × 7프레임 */
export const WALK_SHEET = {
  // 줄 경계는 줄마다 어두운 픽셀이 끊기는 곳으로 잰 값
  rows: [
    { y: 745, h: 36 },
    { y: 781, h: 34 },
    { y: 815, h: 36 },
    { y: 851, h: 37 },
    { y: 889, h: 35 },
    { y: 924, h: 40 },
  ],
  x: 40,
  w: 448,
  count: 7,
  // 체크무늬 흰·회색 점이 테두리에 남지 않게 넉넉히 (고양이 밝은 테두리선 (208,143,130)과는 거리 95 이상)
  backdrop: { kind: 'checker', tolerance: 40, feather: 36 } as Backdrop,
};


/** 파츠 분리: 이 영역의 덩어리를 하나씩 투명 PNG로 */
export const PARTS = { rect: { x: 912, y: 62, w: 298, h: 144 }, backdrop: PANEL };

/** 표정 12개 (라벨 글자 위쪽만) */
export const FACES = {
  names: ['basic', 'happy', 'wink', 'surprised', 'focus', 'attack', 'hurt', 'dizzy', 'sad', 'flustered', 'angry', 'relieved'],
  cols: [908, 980, 1052, 1124],
  rows: [262, 352, 437],
  w: 70,
  h: 60,
  backdrop: PANEL,
};

/** VFX 6종 (빛 효과라 색 → 투명) */
export const VFX: { name: string; rect: Rect }[] = [
  // 칸 테두리선 안쪽만
  { name: 'swing', rect: { x: 672, y: 768, w: 86, h: 60 } },
  { name: 'star', rect: { x: 772, y: 768, w: 72, h: 60 } },
  { name: 'impact', rect: { x: 856, y: 768, w: 70, h: 60 } },
  { name: 'hurt', rect: { x: 938, y: 768, w: 70, h: 60 } },
  { name: 'stun', rect: { x: 1020, y: 768, w: 70, h: 60 } },
  { name: 'respawn', rect: { x: 1102, y: 768, w: 64, h: 60 } },
];

/** 참고용으로만 잘라 두는 칸 (조준 범위는 벡터로 새로 그린다) */
export const REFERENCE: { name: string; rect: Rect }[] = [
  { name: 'aim-cone', rect: { x: 1212, y: 252, w: 152, h: 100 } },
  { name: 'aim-circle', rect: { x: 1370, y: 252, w: 155, h: 100 } },
  { name: 'fire-cone', rect: { x: 1212, y: 378, w: 152, h: 118 } },
  { name: 'fire-circle', rect: { x: 1370, y: 378, w: 155, h: 118 } },
  { name: 'ingame-move', rect: { x: 902, y: 560, w: 200, h: 132 } },
  { name: 'controls', rect: { x: 1188, y: 732, w: 340, h: 238 } },
];

// ---------------------------------------------------------------------------
// 게임 안 8방향 애니메이션: 방향마다 어떤 잘린 프레임을 쓰는지 (그림으로 확인한 짝짓기)
// 정지 모습은 대기 8방향 팩(IDLE_PACK), 걷기는 걷기 8방향 팩(WALK_PACK)이다. 공격·피격·부활은 그림을 바꾸지 않고
// 이 선명한 그림 위에 동작 효과(systems/keeperMotion)를 더한다 (2026-11-06: 시트 표의 공격·피격·부활 그림은 원본이 작아
// 128 칸에서 깨져 보였다). 시트의 턴어라운드·걷기·공격·피격·부활 그림은 art-src/lumi/에 잘라 두기만 한다.
// ChatGPT 공격·피격 팩이 오면 걷기 팩처럼 가져오기를 붙이고 LumiState에 다시 넣는다.
// ---------------------------------------------------------------------------

export type LumiState = 'idle' | 'walk';
/** 시트 한 줄의 상태별 칸 수 (방향 하나 = 한 줄) */
export const LUMI_COLS: Record<LumiState, number> = { idle: 4, walk: 4 };
/** 마지막 줄: 방향 없는 연출 프레임 (넉아웃 = 등불이 꺼질 때 잠듦, 기절은 보관). 팩에 누운 그림이 없어 시트 그림 */
export const LUMI_EXTRA = ['ko', 'stun'] as const;

/** art-src/lumi/<src>.png 한 장을 칸에 놓는 법. 이동·늘이기는 발끝 기준, 단위는 128 칸 픽셀 */
export interface LumiFrame {
  src: string;
  flip?: boolean;
  sx?: number;
  sy?: number;
  dx?: number;
  dy?: number;
  rot?: number;
}

/** 정지 모습 (대기 8방향 팩) */
const still = (d: Dir, t: Partial<LumiFrame> = {}): LumiFrame => ({ src: `idle/${d}`, ...t });
const seq = (base: string, n: number, flip = false): LumiFrame[] => Array.from({ length: n }, (_, i) => ({ src: `${base}_${i}`, flip }));
/** 숨쉬기 4칸 */
const breathe = (d: Dir): LumiFrame[] => [still(d), still(d, { sx: 0.995, sy: 1.02 }), still(d, { sx: 0.99, sy: 1.035 }), still(d, { sx: 0.995, sy: 1.015 })];
/** 걷기 4칸 (걷기 8방향 팩, 왼쪽 계열도 팩에 그려진 그림) */
const walk = (d: Dir): LumiFrame[] => seq(`walk8/${d}`, LUMI_COLS.walk);

export const LUMI_PLAN: Record<Dir, Record<LumiState, LumiFrame[]>> = {
  e: { idle: breathe('e'), walk: walk('e') },
  w: { idle: breathe('w'), walk: walk('w') },
  se: { idle: breathe('se'), walk: walk('se') },
  sw: { idle: breathe('sw'), walk: walk('sw') },
  ne: { idle: breathe('ne'), walk: walk('ne') },
  nw: { idle: breathe('nw'), walk: walk('nw') },
  n: { idle: breathe('n'), walk: walk('n') },
  s: { idle: breathe('s'), walk: walk('s') },
};

export const LUMI_EXTRA_FRAMES: Record<(typeof LUMI_EXTRA)[number], LumiFrame> = {
  ko: { src: 'grid/ko/r1_0' },
  stun: { src: 'grid/stun/r1_0' },
};
