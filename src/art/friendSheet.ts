// 친구 등불지기(토리·도토) 8방향 시트를 ChatGPT 팩 그림으로 묶는다 (2026-11-18 라이언: 받은 토리 90° 걷기를 바로 적용).
// lumi-8dir과 같은 배치(줄 = 방향 e·se·s·sw·w·nw·n·ne + 연출 줄, 칸 = 대기 4 + 걷기 4, 128 칸·발끝 FEET_Y)라
// Lightkeeper·애니메이션 이름(tori-idle-<방향> 등)은 그대로 쓴다.
//  - 팩 규격(브리프·의뢰서): 512×512 투명, 귀 끝 ~ 발끝 = 48 ~ 496줄, 한 팩 안에서 같은 축척.
//    그래서 칸에 놓을 때 장마다 다시 재지 않고 캔버스 좌표를 그대로 한 배율로 옮긴다(걷기 프레임의 들썩임이 그대로 살도록).
//  - 대기: 방향마다 한 장 + 숨쉬기 3칸(루미와 같은 방식).
//  - 걷기: 그 방향 걷기 팩 4장(f01 = 대기 그림). 아직 안 온 방향은 대기 그림으로 만든 임시 깡충(제안) — 팩이 오면 저절로 바뀐다.
//  - 연출 줄(잠듦·기절): 아직 팩 그림이 없어 임시 코드 그림(keeperSprites)을 그대로.
//  - 대기 팩이 한 장이라도 없으면 null → 임시 코드 그림 시트 전체를 쓴다(도토는 팩이 올 때까지 이쪽).
import { DIRS, type Dir } from '../systems/facing';
import { buildKeeperSheet, keeperAnims, type KeeperSpriteId } from './keeperSprites';
import type { AnimDef } from './registry';
import { CELL, FEET_Y, LUMI_COLS, packDir } from './lumiSheet';

interface FriendPack {
  /** 대기 그림 경로 (dev 서버가 프로젝트 폴더를 그대로 서빙) */
  idle: (deg: string, name: string) => string;
  /** 걷기 그림 경로, n = 1~4 */
  walk: (deg: string, name: string, n: number) => string;
  /** 팩 캔버스에서 발끝이 닿는 줄 */
  feetY: number;
  /** 팩 캔버스에서 귀 끝 ~ 발끝 높이 */
  bodyH: number;
  /**
   * 칸(128) 안에서의 귀 끝 ~ 발끝 높이(px). 루미는 약 101px.
   * 토리 115 = 머리 크기를 루미와 맞추고 귀가 루미 키의 약 1.14배(브리프 '귀 끝까지는 루미의 약 1.2배', 2026-11-17 측정의 ×1.22 제안)
   */
  heightPx: number;
  /**
   * 걷기 한 바퀴의 칸 순서(0~3 = f01~f04)와 기본 속도(초당 칸). 없으면 루미와 같이 4칸을 9fps로.
   * 게임은 여기에 걸음 빠르기 배율(Lightkeeper: 끝까지 밀면 약 ×1.65)을 곱한다
   */
  walkCycle?: { order: number[]; frameRate: number };
  /**
   * 방향(각도)별 몸 기준점 x(팩 캔버스 px). 없으면 발 가운데(아래 15% 줄 평균)를 잰다.
   * 꼬리가 크고 바닥에 닿는 도토처럼, 자동으로 재면 꼬리에 끌려가는 팩에 쓴다
   */
  anchorX?: Partial<Record<number, number>>;
}

/** 각도 → 팩의 방향 이름 (파일 이름 규칙) */
const NAMES: Record<number, string> = {
  0: 'front',
  45: 'front_right',
  90: 'right',
  135: 'back_right',
  180: 'back',
  225: 'back_left',
  270: 'left',
  315: 'front_left',
};

const TORI_DIR = '/reference/Tori_8_Direction_Pack';
const DOTO_DIR = '/reference/Doto_8_Direction_Pack';
export const FRIEND_PACKS: Partial<Record<KeeperSpriteId, FriendPack>> = {
  tori: {
    idle: (deg, name) => `${TORI_DIR}/Tori_Idle_8D_Pack/tori_idle_${deg}_${name}.png`,
    walk: (deg, name, n) => `${TORI_DIR}/Tori_Walk_8D_4Frames_Pack/${deg}_${name}/tori_walk_${deg}_${name}_f0${n}.png`,
    feetY: 496,
    bodyH: 448,
    heightPx: 115,
    // 2026-11-18 라이언: 오른쪽 깡충이 빠르고 과해 보임 → 앉음 2칸·박차기 1·공중 1·착지 2칸, 끝까지 밀어도 한 번에 약 0.66초(제안).
    // 루미 방식(4칸 9fps)이면 끝까지 밀 때 1초에 약 15칸 = 깡충 한 번 0.27초였다. 땅에 있는 시간을 늘리고 공중은 짧게
    walkCycle: { order: [0, 0, 1, 2, 3, 3], frameRate: 5.5 },
  },
  // 2026-11-18: ChatGPT 도토 대기 팩(8장 한 축척, 발끝 496, 귀 끝 털 약 54줄 = 몸 높이 약 442).
  // 팩은 '꼬리까지 포함한 실루엣'을 가로 가운데에 맞춰 와서(README), 몸 기준점을 방향마다 정했다(그림 위에 선을 그어 확인,
  // 좌우 짝 45/315·90/270·135/225는 512 대칭). 그림 파일은 받은 그대로 — 옮기면 큰 꼬리가 캔버스 밖으로 잘린다.
  // 크기 95px(제안): 브리프 '몸은 셋 중 가장 작다'(루미 약 101px, 머리 폭 루미의 약 83%). 더 크면 128 칸에서 꼬리 끝이 잘린다.
  // 걷기 팩이 오기 전까지 걷기는 대기 그림으로 만든 임시 깡충, 박자는 토리와 같다
  doto: {
    idle: (deg, name) => `${DOTO_DIR}/Doto_Idle_8D_Pack/doto_idle_${deg}_${name}.png`,
    walk: (deg, name, n) => `${DOTO_DIR}/Doto_Walk_8D_4Frames_Pack/${deg}_${name}/doto_walk_${deg}_${name}_f0${n}.png`,
    feetY: 496,
    bodyH: 442,
    heightPx: 95,
    walkCycle: { order: [0, 0, 1, 2, 3, 3], frameRate: 5.5 },
    // 90·135(270·225)는 몸 아래보다 10px 몸 쪽: 꼬리 끝이 128 칸 밖으로 나가지 않게(게임에서 2px)
    anchorX: { 0: 256, 45: 300, 90: 320, 135: 340, 180: 256, 225: 172, 270: 192, 315: 212 },
  },
};

/** 칸에 놓는 법: 발끝 기준 늘이기·들기 (단위 = 칸 px) */
interface Pose {
  sx?: number;
  sy?: number;
  lift?: number;
}

/** 숨쉬기 4칸 (루미 breathe와 같은 값) */
const BREATHE: Pose[] = [{}, { sx: 0.995, sy: 1.02 }, { sx: 0.99, sy: 1.035 }, { sx: 0.995, sy: 1.015 }];
/** 걷기 팩이 아직 없는 방향의 임시 깡충 (제안): 모음 → 박차기 → 공중 → 착지. 귀 끝이 칸(위 7px 여유) 밖으로 나가지 않는 만큼만 늘이고 든다 */
const HOP: Pose[] = [{}, { sx: 0.98, sy: 1.03 }, { sx: 1.01, sy: 0.99, lift: 5 }, { sx: 1.02, sy: 0.96 }];

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** 발 가운데 x: 불투명 범위 아래 15% 줄의 평균 (cutout.feetCenterX와 같은 생각) */
function feetX(img: HTMLImageElement): number {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  g.drawImage(img, 0, 0);
  const { data, width, height } = g.getImageData(0, 0, c.width, c.height);
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < height && top < 0; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 40) { top = y; break; }
  for (let y = height - 1; y >= 0 && bottom < 0; y--) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 40) { bottom = y; break; }
  if (top < 0) return width / 2;
  let sum = 0;
  let n = 0;
  for (let y = Math.floor(bottom - (bottom - top) * 0.15); y <= bottom; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 40) {
        sum += x;
        n++;
      }
    }
  }
  return n ? sum / n : width / 2;
}

/** 팩 그림 한 장을 칸(col,row)에: 팩 좌표 (fx, feetY)가 칸의 (가운데, FEET_Y)에 오게, 배율 s, 발끝 기준 pose */
function place(g: CanvasRenderingContext2D, img: HTMLImageElement, col: number, row: number, fx: number, pack: FriendPack, s: number, p: Pose = {}): void {
  g.save();
  g.beginPath();
  g.rect(col * CELL, row * CELL, CELL, CELL);
  g.clip();
  g.translate(col * CELL + CELL / 2, row * CELL + FEET_Y - (p.lift ?? 0));
  g.scale(p.sx ?? 1, p.sy ?? 1);
  g.drawImage(img, -fx * s, -pack.feetY * s, img.naturalWidth * s, img.naturalHeight * s);
  g.restore();
}

/** 애니메이션: 루미와 같은 이름 규칙(`${id}-walk-<방향>` 등), 걷기는 친구별 칸 순서·속도(walkCycle) */
export function friendAnims(id: KeeperSpriteId): AnimDef[] {
  const cycle = FRIEND_PACKS[id]?.walkCycle;
  return keeperAnims(id).map((a) =>
    cycle && a.key.startsWith(`${id}-walk-`) ? { ...a, frames: cycle.order.map((i) => a.frames[i]), frameRate: cycle.frameRate } : a,
  );
}

/** 2배 해상도(128 칸) 시트. 대기 팩이 다 없으면 null */
export async function composeFriend(id: KeeperSpriteId): Promise<HTMLCanvasElement | null> {
  const pack = FRIEND_PACKS[id];
  if (!pack) return null;
  const s = pack.heightPx / pack.bodyH;
  const idle = new Map<Dir, HTMLImageElement>();
  const anchor = new Map<Dir, number>();
  const walk = new Map<Dir, HTMLImageElement[]>();
  for (const [deg, name] of Object.entries(NAMES)) {
    const a = deg.padStart(3, '0');
    const dir = packDir(Number(deg));
    const img = await loadImage(pack.idle(a, name));
    if (!img) return null;
    idle.set(dir, img);
    anchor.set(dir, pack.anchorX?.[Number(deg)] ?? feetX(img));
    const frames = await Promise.all([1, 2, 3, 4].map((n) => loadImage(pack.walk(a, name, n))));
    if (frames.every((f): f is HTMLImageElement => f !== null)) walk.set(dir, frames as HTMLImageElement[]);
  }

  // 연출 줄은 임시 코드 그림 시트에서 그대로 옮긴다
  const code = await buildKeeperSheet(id);
  const c = document.createElement('canvas');
  c.width = code.width;
  c.height = code.height;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(code, 0, DIRS.length * CELL, code.width, CELL, 0, DIRS.length * CELL, code.width, CELL);

  for (const [row, d] of DIRS.entries()) {
    const img = idle.get(d) as HTMLImageElement;
    // 한 방향 안의 대기·걷기는 같은 기준점(대기 그림의 발 가운데 또는 anchorX)에 둔다 → 걷기 프레임의 앞뒤 움직임이 그대로 보인다
    const fx = anchor.get(d) as number;
    for (let i = 0; i < LUMI_COLS.idle; i++) place(g, img, i, row, fx, pack, s, BREATHE[i % BREATHE.length]);
    const frames = walk.get(d);
    for (let i = 0; i < LUMI_COLS.walk; i++) {
      const col = LUMI_COLS.idle + i;
      if (frames) place(g, frames[i % frames.length], col, row, fx, pack, s);
      else place(g, img, col, row, fx, pack, s, HOP[i % HOP.length]);
    }
  }
  return c;
}

