// 마을 안 풀숲·장애물 (2026-11-04 라이언 지시: 브롤스타즈처럼 숨을 수 있는 풀숲과 장애물을 조금). 배치는 data/map.json.
// 2026-11-13 라이언: 곳곳에 오두막(창문 불빛), 울타리, 강과 강을 건너는 다리.
//  - 장애물(바위·술통·등불 기둥): 등불지기가 지나갈 수 없다(판정은 systems/obstacles.ts). 2.5D라 밑변 y로 앞뒤를 정한다
//  - 풀숲: 캐릭터·이웃 위를 덮는다. 등불지기가 들어가 있는 풀숲은 반투명해져 제 모습이 비친다
import Phaser from 'phaser';
import { Rng } from '../core/rng';
import { TextureKeys } from '../core/TextureKeys';
import { texScale } from '../core/textureRes';
import { GameData } from '../data';
import type { Rect } from '../systems/obstacles';
import { COTTAGE_LAMPS, COTTAGE_WINDOWS } from '../art/village';

const MAP = GameData.map;
const HIDE = GameData.game.hide;
/** 풀숲은 캐릭터(깊이 = y)보다 위, 빛 부채꼴(4000)·반짝이보다 위 */
const BUSH_DEPTH = 6000;
const BUSH_ALPHA = 0.96;
/** 풀숲 한 덩이 간격: 덤불 그림(128×108)을 겹쳐 빽빽하게 */
const BUSH_STEP = { x: 78, y: 58 };
/** 등불 기둥 그림(44×116)의 밑동 */
const LAMP_FOOT = { x: 20 / 44, y: 104 / 116 };

export class MapProps {
  readonly obstacles: Rect[];
  readonly bushes: Rect[];
  private readonly bushLeaves: Phaser.GameObjects.Image[][];

  constructor(scene: Phaser.Scene) {
    const rng = new Rng(8803);
    this.obstacles = MAP.obstacles.map(({ x, y, w, h }) => ({ x, y, w, h }));
    this.bushes = MAP.bushes.map(({ x, y, w, h }) => ({ x, y, w, h }));

    for (const ob of MAP.obstacles) {
      const bottom = ob.y + ob.h;
      if (ob.kind === 'rocks') {
        const n = Math.max(1, Math.round(ob.w / 46));
        for (let i = 0; i < n; i++) {
          const x = ob.x + ((i + 0.5) * ob.w) / n + rng.range(-6, 6);
          const y = ob.y + ob.h * rng.range(0.45, 0.75);
          scene.add
            .image(x, y, TextureKeys.villageRock, 0)
            .setOrigin(0.5, 0.7)
            .setScale(rng.range(1.05, 1.45) * texScale(TextureKeys.villageRock))
            .setFlipX(rng.chance(0.5))
            .setDepth(bottom);
        }
      } else if (ob.kind === 'barrels') {
        scene.add
          .image(ob.x + ob.w / 2, bottom + 6, TextureKeys.villageBarrel, 0)
          .setOrigin(0.5, 1)
          .setScale(texScale(TextureKeys.villageBarrel))
          .setDepth(bottom);
      } else if (ob.kind === 'wall' || ob.kind === 'fence') {
        drawWall(scene, ob, ob.kind);
      } else if (ob.kind === 'house') {
        placeHouse(scene, ob, ob.variant ?? 0, !!ob.flip);
      } else if (ob.kind === 'river') {
        // 강물은 아래에서 한 번에 그린다 (판정만)
      } else {
        scene.add
          .image(ob.x + ob.w / 2, bottom, TextureKeys.villageLampPost, 0)
          .setOrigin(LAMP_FOOT.x, LAMP_FOOT.y)
          .setScale(texScale(TextureKeys.villageLampPost))
          .setDepth(bottom);
      }
    }

    if (MAP.river) drawRiver(scene, MAP.river, MAP.bridges ?? []);

    this.bushLeaves = MAP.bushes.map((b) => {
      const leaves: Phaser.GameObjects.Image[] = [];
      const cols = Math.max(1, Math.round(b.w / BUSH_STEP.x));
      const rows = Math.max(1, Math.round(b.h / BUSH_STEP.y));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = b.x + ((c + 0.5) * b.w) / cols + rng.range(-10, 10);
          const y = b.y + ((r + 0.5) * b.h) / rows + rng.range(-8, 8);
          leaves.push(
            scene.add
              .image(x, y, TextureKeys.villageBush, 0)
              .setScale(rng.range(0.85, 1.08) * texScale(TextureKeys.villageBush))
              .setFlipX(rng.chance(0.5))
              .setAlpha(BUSH_ALPHA)
              .setDepth(BUSH_DEPTH + y / 10000),
          );
        }
      }
      return leaves;
    });
  }

  /** 등불지기가 들어가 있는 풀숲(번호, 없으면 -1)을 반투명하게 */
  update(dt: number, inside: number): void {
    const k = Math.min(1, dt * 8);
    this.bushLeaves.forEach((leaves, i) => {
      const target = i === inside ? HIDE.bushAlphaInside : BUSH_ALPHA;
      for (const leaf of leaves) leaf.setAlpha(leaf.alpha + (target - leaf.alpha) * k);
    });
  }
}

/** 담 높이(2.5D: 바닥 사각형 위로 솟은 만큼) — 2026-11-13 미로 요소, 임시 코드 그림 */
const WALL_RISE = { wall: 26, fence: 22 };

/** 돌담·나무 울타리: 바닥 사각형(판정)을 위로 솟은 덩어리로 그린다. 밑변 y로 앞뒤를 정한다 */
function drawWall(scene: Phaser.Scene, r: Rect, kind: 'wall' | 'fence'): void {
  const g = scene.add.graphics().setDepth(r.y + r.h);
  const rise = WALL_RISE[kind];
  if (kind === 'wall') {
    // 앞면(어두움) + 윗면(밝음) + 돌 줄눈
    g.fillStyle(0x2a2640, 1).fillRect(r.x, r.y - rise + r.h * 0.4, r.w, r.h * 0.6 + rise);
    g.fillStyle(0x4b4766, 1).fillRect(r.x, r.y - rise, r.w, r.h * 0.4 + 4);
    g.lineStyle(1.5, 0x1b1f3b, 0.9).strokeRect(r.x, r.y - rise, r.w, r.h + rise);
    g.lineStyle(1, 0x1b1f3b, 0.55);
    const front = r.y - rise + r.h * 0.4 + 4;
    for (let x = r.x + 18; x < r.x + r.w - 6; x += 22) g.lineBetween(x, front, x, r.y + r.h);
    g.lineBetween(r.x, front + (r.y + r.h - front) / 2, r.x + r.w, front + (r.y + r.h - front) / 2);
    g.fillStyle(0xa89cd9, 0.18).fillRect(r.x + 2, r.y - rise + 2, r.w - 4, 3);
    return;
  }
  // 세로 울타리: 기둥이 위아래로 늘어서고 가로대가 세로로
  if (r.h > r.w * 2) {
    const n = Math.max(2, Math.round(r.h / 30));
    g.fillStyle(0x7a5e48, 1).fillRect(r.x + 4, r.y - rise + 4, 5, r.h + rise - 6).fillRect(r.x + 13, r.y - rise + 4, 5, r.h + rise - 6);
    g.fillStyle(0x5a4636, 1);
    for (let i = 0; i <= n; i++) g.fillRect(r.x + 3, r.y - rise + (i * (r.h - 6)) / n, r.w - 6, 8);
    g.lineStyle(1, 0x1b1f3b, 0.7).strokeRect(r.x + 3, r.y - rise, r.w - 6, r.h + rise);
    return;
  }
  // 울타리: 기둥 + 가로대 두 줄
  const posts = Math.max(2, Math.round(r.w / 34));
  g.fillStyle(0x5a4636, 1);
  for (let i = 0; i <= posts; i++) {
    const x = r.x + (i * (r.w - 8)) / posts;
    g.fillRect(x, r.y - rise, 8, r.h + rise);
  }
  g.fillStyle(0x7a5e48, 1).fillRect(r.x, r.y - rise + 6, r.w, 6).fillRect(r.x, r.y - rise + 18, r.w, 6);
  g.lineStyle(1, 0x1b1f3b, 0.7).strokeRect(r.x, r.y - rise + 6, r.w, 18);
}

/** 오두막 그림 키 (src/art에서 그린 임시 그림, 없으면 아래 대체 그림) */
const houseKey = (variant: number) => `village-cottage-${variant}`;

/**
 * 오두막: 판정 사각형(밑동) 아래 가운데에 세운다. 2.5D라 밑변 y로 앞뒤를 정한다.
 * 창문에는 따뜻한 불빛(어둠 속 따뜻한 빛)을 겹친다
 */
function placeHouse(scene: Phaser.Scene, r: Rect, variant: number, flip: boolean): void {
  const bottom = r.y + r.h;
  const key = houseKey(variant);
  if (scene.textures.exists(key)) {
    const cx = r.x + r.w / 2;
    const ground = bottom + 6;
    scene.add.image(cx, ground, key, 0).setOrigin(0.5, 1).setScale(texScale(key)).setFlipX(flip).setDepth(bottom);
    // 창문·처마 등불의 따뜻한 빛 (어둠 속 따뜻한 빛, 뒤집힌 집이면 x도 뒤집음)
    const glow = (p: { x: number; y: number }, size: number, alpha: number) =>
      scene.add
        .image(cx + (flip ? -p.x : p.x), ground + p.y, TextureKeys.glow)
        .setTint(0xffc857)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(alpha)
        .setScale(size / 256)
        .setDepth(bottom + 0.1);
    for (const w of COTTAGE_WINDOWS[variant] ?? []) glow(w, 70, 0.32);
    for (const l of COTTAGE_LAMPS[variant] ?? []) glow(l, 96, 0.45);
    return;
  }
  // 대체 그림: 벽·지붕·창문 (그림이 들어오기 전 임시)
  const g = scene.add.graphics().setDepth(bottom);
  const wallH = 70 + variant * 8;
  const top = bottom - r.h * 0.4 - wallH;
  g.fillStyle(0x2c2740, 1).fillRect(r.x, top, r.w, wallH + r.h * 0.4);
  g.fillStyle(0x3b3452, 1).fillTriangle(r.x - 14, top + 2, r.x + r.w + 14, top + 2, r.x + r.w / 2, top - 46 - variant * 6);
  g.fillStyle(0xffc857, 0.85).fillRect(r.x + r.w * 0.22, top + 22, 20, 18).fillRect(r.x + r.w * 0.62, top + 22, 20, 18);
  g.fillStyle(0x1b1f3b, 1).fillRect(r.x + r.w / 2 - 12, bottom - r.h * 0.4 - 38, 24, 38);
  g.lineStyle(1.5, 0x120f24, 0.9).strokeRect(r.x, top, r.w, wallH + r.h * 0.4);
}

/** 강물 색 (밤) */
const WATER = { deep: 0x15243f, mid: 0x1f3557, ripple: 0x5f86b8, bank: 0x2a2640, moss: 0x3d5a46 };

/**
 * 강과 다리: 마을 위끝에서 아래끝까지 남북으로 흐르는 물길(둑은 물결치듯), 다리 자리에는 나무다리.
 * 모양이 변하지 않으므로 한 번 그려 이미지로 굽는다(성능 규칙). 바닥 층이라 캐릭터 아래(-885)
 */
function drawRiver(scene: Phaser.Scene, river: { x: number; w: number }, bridges: readonly Rect[]): void {
  const H = GameData.game.world.height;
  const pad = 26;
  const W = river.w + pad * 2;
  const g = scene.make.graphics({}, false);
  const bankAt = (y: number, side: number) => Math.sin(y / 70 + side * 1.7) * 5 + Math.sin(y / 23 + side) * 2;
  // 둑 (돌·이끼)
  g.fillStyle(WATER.bank, 1);
  for (let y = 0; y < H; y += 8) {
    g.fillRect(pad - 10 + bankAt(y, 0), y, 12, 9);
    g.fillRect(pad + river.w - 2 + bankAt(y, 1), y, 12, 9);
  }
  // 물
  for (let y = 0; y < H; y += 6) {
    const l = pad + bankAt(y, 0);
    const r = pad + river.w + bankAt(y, 1);
    g.fillStyle(WATER.deep, 1).fillRect(l, y, r - l, 7);
    g.fillStyle(WATER.mid, 0.55).fillRect(l + (r - l) * 0.3, y, (r - l) * 0.4, 7);
  }
  // 잔물결 (달빛)
  g.lineStyle(1.5, WATER.ripple, 0.45);
  for (let y = 20; y < H; y += 38) {
    const x0 = pad + 14 + ((y * 7) % 40);
    g.lineBetween(x0, y, x0 + 16, y + 2);
    g.lineBetween(x0 + 26, y + 15, x0 + 36, y + 16);
  }
  // 이끼 점
  g.fillStyle(WATER.moss, 0.8);
  for (let y = 12; y < H; y += 53) {
    g.fillCircle(pad - 6 + bankAt(y, 0), y, 4);
    g.fillCircle(pad + river.w + 6 + bankAt(y + 20, 1), y + 20, 3.5);
  }
  // 나무다리: 길 방향(동서)에 직각인 널판 + 위아래 난간
  for (const b of bridges) {
    const x = b.x - river.x + pad;
    g.fillStyle(0x4a3628, 1).fillRect(x, b.y + 6, b.w, b.h - 12);
    g.lineStyle(1, 0x2a1d14, 0.9);
    for (let px = x + 10; px < x + b.w; px += 12) g.lineBetween(px, b.y + 8, px, b.y + b.h - 8);
    g.fillStyle(0x7a5e48, 0.35).fillRect(x, b.y + 10, b.w, 4);
    for (const ry of [b.y, b.y + b.h - 10]) {
      g.fillStyle(0x6b4f3a, 1).fillRect(x - 4, ry, b.w + 8, 10);
      g.fillStyle(0x3a2a1e, 1);
      for (let px = x - 4; px <= x + b.w; px += 30) g.fillRect(px, ry - 6, 8, 16);
    }
    g.lineStyle(1.5, 0x120f24, 0.8).strokeRect(x - 4, b.y, b.w + 8, b.h);
  }
  const key = 'map-river';
  if (!scene.textures.exists(key)) g.generateTexture(key, W, H);
  g.destroy();
  scene.add.image(river.x - pad, 0, key).setOrigin(0, 0).setDepth(-885);
}
