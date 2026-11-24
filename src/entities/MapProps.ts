// 마을 안 장애물·풀숲 — 2026-11-23 밤 나들이 v3: 격자 맵(33×19칸, 한 칸 96px, src/data/maps/*.json)에서 읽는다(옛 map.json 배치 대신).
//  - 장애물(바위·집·술통·건초·울타리·강): 걸어서 못 지나간다(판정 systems/obstacles.ts — 그림보다 조금 안쪽 사각형).
//    2.5D라 밑변 y로 앞뒤를 정하고, 등불지기를 가리면 반투명(Occluders)
//  - 다리: 강 위에 걸친 널판(걸어서 지나감)
//  - 풀숲: 캐릭터·이웃 위를 덮는다. 등불지기가 들어가 있는 풀숲은 반투명해져 제 모습이 비친다
//  - 그림: 2026-11-24 ChatGPT Map_Props_Pack(src/art/props.ts — 바위·술통·집·건초·풀숲·울타리, 테마 light·border·dark)이 있으면 그 그림을 칸에 1:1로,
//    강·다리는 칸마다 이어 붙이는 조각(물길 방향 h·v), 그림이 없으면(집 3×2 등) 옛 임시 코드 그림 — 칸 크기에 맞춰 놓고 자리를 조금씩 흔든다
import Phaser from 'phaser';
import { Rng } from '../core/rng';
import { TextureKeys } from '../core/TextureKeys';
import { isArtTexture, texScale } from '../core/textureRes';
import { GameData } from '../data';
import type { Rect } from '../systems/obstacles';
import { blobRect, bushRects, collisionRects, kindAt, parseBlobs, type GridMap } from '../systems/grid';
import { COTTAGE_LAMPS, COTTAGE_WINDOWS } from '../art/village';
import { PROP_FALLBACK, PROP_THEME, PROP_TINT, propKey, type PropKind, type PropTheme } from '../art/props';
import { Occluders } from './Occluders';
import { bakeTexture } from './bake';
import { WorldCuller } from './WorldCuller';
import type { Vec } from '../systems/fan';

const D = GameData.grid;
const CELL = D.cell;
const HIDE = GameData.game.hide;
/** 풀숲은 캐릭터(깊이 = y)보다 위, 빛 부채꼴(4000)·반짝이보다 위 */
const BUSH_DEPTH = 6000;
const BUSH_ALPHA = 0.96;
/** 풀숲 한 덩이 간격: 덤불 그림(128×108)을 겹쳐 빽빽하게 */
const BUSH_STEP = { x: 78, y: 58 };

export class MapProps {
  /** 판정 사각형 (systems/grid.ts collisionRects — 그림보다 조금 안쪽) */
  readonly obstacles: Rect[];
  readonly bushes: Rect[];
  private readonly bushLeaves: Phaser.GameObjects.Image[][] = [];
  /** 등불지기를 가리면 반투명해지는 물체들 (2026-11-13) */
  readonly occluders = new Occluders();
  /** 화면 밖 장식 끄기 (2026-11-20 휴대폰 렉) */
  private readonly culler = new WorldCuller();
  private readonly cam: Phaser.Cameras.Scene2D.Camera;

  constructor(scene: Phaser.Scene, map: GridMap) {
    const rng = new Rng(8803 + map.id.charCodeAt(0) * 31 + map.id.charCodeAt(1));
    this.cam = scene.cameras.main;
    const jitter = (n: number) => rng.range(-n, n);
    this.obstacles = collisionRects(map, D);
    this.bushes = bushRects(map, D);

    const theme: PropTheme = PROP_THEME[map.theme] ?? 'light';
    /** 생성 그림 소품 (2026-11-24 Map_Props_Pack): 그 테마 그림 → 없으면 다른 테마 그림 + 그 테마 색조, 그것도 없으면 null(옛 코드 그림) */
    const art = (kind: PropKind, size: string): PropArt | null => {
      for (const t of PROP_FALLBACK[theme]) {
        const key = propKey(kind, size, t);
        if (scene.textures.exists(key) && isArtTexture(key)) return { key, tint: t === theme ? null : PROP_TINT[theme] };
      }
      return null;
    };

    for (const b of parseBlobs(map, D)) {
      const r = blobRect(b, D);
      const bottom = r.y + r.h;
      const size = `${b.w}x${b.h}`;
      const pic = b.kind === 'rock' || b.kind === 'barrel' || b.kind === 'house' || b.kind === 'bush' ? art(b.kind, size) : null;
      if (pic) {
        // 받은 캔버스 그대로: 발자리(칸) 왼쪽 위 = 캔버스 (48, 48), 집은 지붕 몫으로 위 96 더
        const img = placeProp(scene, pic, r, b.kind === 'house');
        if (b.kind === 'rock' || b.kind === 'barrel') img.setFlipX(rng.chance(0.5));
        if (b.kind === 'bush') {
          // 풀숲: 캐릭터 위를 덮고, 들어가 있으면 반투명(옛 잎 여러 장과 같은 규칙)
          img.setAlpha(BUSH_ALPHA).setDepth(BUSH_DEPTH + (r.y + r.h / 2) / 10000);
          this.bushLeaves.push([img]);
        } else {
          this.occluders.add([img], bottom);
        }
        continue;
      }
      const hayPic = b.kind === 'hay' ? art('hay', b.w >= b.h ? size : `${b.h}x${b.w}`) : null;
      if (hayPic) {
        // 건초: 세로로 놓인 것(1×2·1×3)은 가로 그림을 90° 돌린다(규격서 6절 "게임이 돌림")
        const img = scene.add.image(r.x + r.w / 2, r.y + r.h / 2, hayPic.key).setScale(texScale(hayPic.key)).setDepth(bottom);
        if (b.h > b.w) img.setAngle(90);
        if (hayPic.tint !== null) img.setTint(hayPic.tint);
        this.occluders.add([img], bottom);
        continue;
      }
      if (b.kind === 'river' || b.kind === 'bridge') {
        // 강·다리 조각(2026-11-24): 물길이 세로면 v — 강은 덩어리 모양으로, 한 칸짜리 강·다리는 위아래 이웃이 강·다리인지로 정한다
        const wet = (c: number, rr: number) => { const k = kindAt(map, D, c, rr); return k === 'river' || k === 'bridge'; };
        const vertical = b.h > b.w || (b.h === b.w && (wet(b.col, b.row - 1) || wet(b.col, b.row + b.h)));
        const pic = art(b.kind, vertical ? 'v' : 'h');
        if (pic) {
          for (let i = 0; i < Math.max(b.w, b.h); i++) {
            const cell = vertical ? { x: r.x, y: r.y + i * CELL, w: CELL, h: CELL } : { x: r.x + i * CELL, y: r.y, w: CELL, h: CELL };
            placeProp(scene, pic, cell, false).setDepth(b.kind === 'river' ? WATER_DEPTH : BRIDGE_DEPTH);
          }
          continue;
        }
      }
      if (b.kind === 'fence' && art('fence', 'h') && art('fence', 'v') && art('fence', 'end')) {
        // 울타리·돌담: 칸마다 조각(가로 h · 세로 v), 가로 줄의 양 끝은 끝 조각(왼쪽 끝은 뒤집음 — 그림의 가로대가 왼쪽)
        const horizontal = r.w >= r.h;
        const n = Math.max(b.w, b.h);
        const thin = horizontal ? { x: r.x + 4, y: r.y + r.h / 2 - 14, w: r.w - 8, h: 28 } : { x: r.x + r.w / 2 - 11, y: r.y + 4, w: 22, h: r.h - 8 };
        const pieces: Phaser.GameObjects.Image[] = [];
        for (let i = 0; i < n; i++) {
          const cell = horizontal ? { x: r.x + i * CELL, y: r.y, w: CELL, h: CELL } : { x: r.x, y: r.y + i * CELL, w: CELL, h: CELL };
          const end = horizontal && n > 1 && (i === 0 || i === n - 1);
          const p = art('fence', end ? 'end' : horizontal ? 'h' : 'v') as PropArt;
          // 가로 조각은 그림의 울타리가 칸 아래쪽에 있어 판정 줄(칸 가운데)에 맞게 올린다
          const img = placeProp(scene, p, { ...cell, y: cell.y - (horizontal ? FENCE_LIFT : 0) }, false).setDepth(horizontal ? thin.y + thin.h : cell.y + CELL);
          if (end && i === 0) img.setFlipX(true);
          pieces.push(img);
        }
        this.occluders.add(pieces, thin.y + thin.h, { x: thin.x, y: thin.y - WALL_RISE.fence, w: thin.w, h: thin.h + WALL_RISE.fence });
        continue;
      }
      if (b.kind === 'rock') {
        // 1×1은 큰 돌 하나, 2×2는 네 귀퉁이 + 가운데
        const spots = b.w * b.h === 1 ? [[0.5, 0.62]] : [[0.3, 0.38], [0.72, 0.36], [0.28, 0.74], [0.7, 0.76], [0.5, 0.56]];
        for (const [fx, fy] of spots) {
          const rock = scene.add.image(r.x + r.w * fx + jitter(6), r.y + r.h * fy + jitter(5), TextureKeys.villageRock, 0).setOrigin(0.5, 0.7).setFlipX(rng.chance(0.5));
          rock.setScale(((b.w * b.h === 1 ? 0.86 : 0.62) * CELL * rng.range(0.92, 1.08)) / Math.max(1, rock.width)).setDepth(rock.y);
          this.occluders.add([rock], rock.y);
        }
      } else if (b.kind === 'barrel') {
        const barrel = scene.add.image(r.x + r.w / 2 + jitter(5), bottom - 10 + jitter(3), TextureKeys.villageBarrel, 0).setOrigin(0.5, 1);
        barrel.setScale((CELL * 0.72) / Math.max(1, barrel.width)).setDepth(bottom);
        this.occluders.add([barrel], bottom);
      } else if (b.kind === 'house') {
        const house = placeHouse(scene, r, rng.int(0, 2), rng.chance(0.5));
        this.occluders.add(house, bottom);
      } else if (b.kind === 'hay') {
        this.occluders.add([drawHay(scene, r)], bottom);
      } else if (b.kind === 'fence') {
        // 칸 가운데를 지나는 울타리 한 줄 (판정은 그보다 조금 두껍게 — collisionRects)
        const horizontal = r.w >= r.h;
        const thin = horizontal ? { x: r.x + 4, y: r.y + r.h / 2 - 14, w: r.w - 8, h: 28 } : { x: r.x + r.w / 2 - 11, y: r.y + 4, w: 22, h: r.h - 8 };
        this.occluders.add([drawWall(scene, thin, 'fence')], thin.y + thin.h, { x: thin.x, y: thin.y - WALL_RISE.fence, w: thin.w, h: thin.h + WALL_RISE.fence });
      } else if (b.kind === 'river') {
        drawWater(scene, r);
      } else if (b.kind === 'bridge') {
        // 강이 위아래로 흐르면 다리는 가로로 걸친다
        const vertical = kindAt(map, D, b.col, b.row - 1) === 'river' || kindAt(map, D, b.col, b.row + 1) === 'river';
        drawBridge(scene, r, vertical);
      } else if (b.kind === 'bush') {
        const leaves: Phaser.GameObjects.Image[] = [];
        const cols = Math.max(1, Math.round(r.w / BUSH_STEP.x));
        const rows = Math.max(1, Math.round(r.h / BUSH_STEP.y));
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const x = r.x + ((col + 0.5) * r.w) / cols + rng.range(-10, 10);
            const y = r.y + ((row + 0.5) * r.h) / rows + rng.range(-8, 8);
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
        this.bushLeaves.push(leaves);
      }
    }
    // 움직이지 않는 장식과 풀숲 잎: 화면 밖이면 그리지 않는다
    for (const o of this.occluders.all()) this.culler.add(o as unknown as Phaser.GameObjects.Image);
    for (const leaves of this.bushLeaves) for (const leaf of leaves) this.culler.add(leaf);
  }

  /** 등불지기가 들어가 있는 풀숲(번호, 없으면 -1)을 반투명하게, 등불지기를 가리는 물체도 반투명하게 */
  update(dt: number, inside: number, keeper: Vec | null = null): void {
    this.culler.update(this.cam);
    this.occluders.update(dt, keeper);
    const k = Math.min(1, dt * 8);
    this.bushLeaves.forEach((leaves, i) => {
      const target = i === inside ? HIDE.bushAlphaInside : BUSH_ALPHA;
      for (const leaf of leaves) leaf.setAlpha(leaf.alpha + (target - leaf.alpha) * k);
    });
  }
}

/** 생성 그림 소품 한 장: 텍스처 키 · 다른 테마 그림을 빌렸으면 그 테마 색조 */
interface PropArt {
  key: string;
  tint: number | null;
}
/** 강·다리는 바닥 바로 위 (옛 코드 그림과 같은 깊이) */
const WATER_DEPTH = -885;
const BRIDGE_DEPTH = -884;
/** 소품 캔버스의 사방 여백(규격서 6절) */
const PROP_PAD = 48;
/** 가로 울타리 조각을 위로 올리는 양: 그림은 칸 아래쪽(칸 안 59~95줄)에, 판정 줄은 칸 가운데(34~62줄) — 2026-11-24 제안 */
const FENCE_LIFT = 30;

/** 받은 캔버스를 1:1로: 발자리(칸 사각형) 왼쪽 위 = 캔버스 (48, 48), 집은 위로 96 더 */
function placeProp(scene: Phaser.Scene, pic: PropArt, r: Rect, house: boolean): Phaser.GameObjects.Image {
  const img = scene.add
    .image(r.x - PROP_PAD, r.y - PROP_PAD - (house ? CELL : 0), pic.key)
    .setOrigin(0, 0)
    .setScale(texScale(pic.key))
    .setDepth(r.y + r.h);
  if (pic.tint !== null) img.setTint(pic.tint);
  return img;
}

/** 담 높이(2.5D: 바닥 사각형 위로 솟은 만큼) — 2026-11-13 미로 요소, 임시 코드 그림 */
const WALL_RISE = { wall: 26, fence: 22 };

/** 굽는 그림의 가장자리 여유 (선 두께) */
const BAKE_PAD = 2;

/**
 * 돌담·나무 울타리: 바닥 사각형을 위로 솟은 덩어리로 그린다. 밑변 y로 앞뒤를 정한다.
 * 2026-11-20 휴대폰 렉: 매 프레임 다시 쪼개지는 Graphics 대신 크기별로 한 번 구운 그림(종류·폭·높이가 같으면 같은 그림)
 */
function drawWall(scene: Phaser.Scene, r: Rect, kind: 'wall' | 'fence'): Phaser.GameObjects.Image {
  const rise = WALL_RISE[kind];
  const key = bakeTexture(scene, `map-${kind}-${r.w}x${r.h}`, r.w + BAKE_PAD * 2, r.h + rise + BAKE_PAD * 2, (g) => {
    g.translateCanvas(BAKE_PAD - r.x, BAKE_PAD - (r.y - rise));
    drawWallShape(g, r, kind);
  });
  return scene.add.image(r.x - BAKE_PAD, r.y - rise - BAKE_PAD, key).setOrigin(0, 0).setDepth(r.y + r.h);
}

function drawWallShape(g: Phaser.GameObjects.Graphics, r: Rect, kind: 'wall' | 'fence'): void {
  const rise = WALL_RISE[kind];
  if (kind === 'wall') {
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

/** 건초더미 (2026-11-23, 그림이 없어 임시 코드 그림 — 칸 크기별로 한 번 굽는다): 둥근 짚단 + 묶은 끈 */
function drawHay(scene: Phaser.Scene, r: Rect): Phaser.GameObjects.Image {
  const rise = 26;
  const inset = 8;
  const w = r.w - inset * 2;
  const h = r.h - inset * 2;
  const key = bakeTexture(scene, `map-hay-${w}x${h}`, w + BAKE_PAD * 2, h + rise + BAKE_PAD * 2, (g) => {
    g.translateCanvas(BAKE_PAD, BAKE_PAD);
    g.fillStyle(0x6a4e2a, 1).fillRoundedRect(0, rise * 0.6, w, h + rise * 0.4, 14);
    g.fillStyle(0xb88a3e, 1).fillRoundedRect(0, 0, w, h + rise * 0.55, 16);
    g.fillStyle(0xd9b25c, 0.85).fillRoundedRect(4, 3, w - 8, (h + rise * 0.55) * 0.45, 12);
    g.lineStyle(1.2, 0x7a5a2c, 0.7);
    for (let x = 10; x < w - 6; x += 9) g.lineBetween(x, 6, x - 3, h + rise * 0.5);
    g.fillStyle(0x5a3d22, 1);
    const ties = w > h ? [w * 0.3, w * 0.7] : [w * 0.5];
    for (const tx of ties) g.fillRect(tx - 3, 0, 6, h + rise);
    g.lineStyle(1.5, 0x2a1d14, 0.8).strokeRoundedRect(0, 0, w, h + rise * 0.55, 16);
  });
  return scene.add.image(r.x + inset - BAKE_PAD, r.y + inset - rise - BAKE_PAD, key).setOrigin(0, 0).setDepth(r.y + r.h);
}

/** 오두막 그림 키 (src/art에서 그린 임시 그림, 없으면 아래 대체 그림) */
const houseKey = (variant: number) => `village-cottage-${variant}`;

/**
 * 오두막: 격자 덩어리 폭에 맞춰 키우고 밑변을 덩어리 아래에 세운다. 2.5D라 밑변 y로 앞뒤를 정한다.
 * 창문에는 따뜻한 불빛(어둠 속 따뜻한 빛)을 겹친다
 */
function placeHouse(scene: Phaser.Scene, r: Rect, variant: number, flip: boolean): (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics)[] {
  const bottom = r.y + r.h;
  const key = houseKey(variant);
  if (scene.textures.exists(key)) {
    const cx = r.x + r.w / 2;
    const ground = bottom - 4;
    const house = scene.add.image(cx, ground, key, 0).setOrigin(0.5, 1).setFlipX(flip).setDepth(bottom);
    const scale = (r.w * 1.02) / Math.max(1, house.width);
    house.setScale(scale);
    const k = scale / texScale(key);
    const parts: Phaser.GameObjects.Image[] = [house];
    const glow = (p: { x: number; y: number }, size: number, alpha: number) =>
      scene.add
        .image(cx + (flip ? -p.x : p.x) * k, ground + p.y * k, TextureKeys.glow)
        .setTint(0xffc857)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(alpha)
        .setScale((size * k) / 256)
        .setDepth(bottom + 0.1);
    for (const w of COTTAGE_WINDOWS[variant] ?? []) parts.push(glow(w, 70, 0.32));
    for (const l of COTTAGE_LAMPS[variant] ?? []) parts.push(glow(l, 96, 0.45));
    return parts;
  }
  // 대체 그림: 벽·지붕·창문 (그림이 들어오기 전 임시)
  const g = scene.add.graphics().setDepth(bottom);
  const wallH = r.h * 0.75;
  const top = bottom - wallH;
  g.fillStyle(0x2c2740, 1).fillRect(r.x, top, r.w, wallH);
  g.fillStyle(0x3b3452, 1).fillTriangle(r.x - 14, top + 2, r.x + r.w + 14, top + 2, r.x + r.w / 2, top - r.h * 0.4);
  g.fillStyle(0xffc857, 0.85).fillRect(r.x + r.w * 0.22, top + 22, 20, 18).fillRect(r.x + r.w * 0.62, top + 22, 20, 18);
  g.lineStyle(1.5, 0x120f24, 0.9).strokeRect(r.x, top, r.w, wallH);
  return [g];
}

/** 강물 색 (밤) */
const WATER = { deep: 0x15243f, mid: 0x1f3557, ripple: 0x5f86b8, bank: 0x2a2640, moss: 0x3d5a46 };

/**
 * 강 한 줄(폭 1칸): 둑은 물결치듯, 잔물결·이끼. 세로로 그려 굽고 가로 강이면 돌린다. 바닥 층이라 캐릭터 아래(-885)
 */
function drawWater(scene: Phaser.Scene, r: Rect): void {
  const vertical = r.h >= r.w;
  const len = vertical ? r.h : r.w;
  const wid = vertical ? r.w : r.h;
  const pad = 16;
  const key = bakeTexture(scene, `map-water-${wid}x${len}`, wid + pad * 2, len, (g) => {
    const bankAt = (y: number, side: number) => Math.sin(y / 70 + side * 1.7) * 5 + Math.sin(y / 23 + side) * 2;
    g.fillStyle(WATER.bank, 1);
    for (let y = 0; y < len; y += 8) {
      g.fillRect(pad - 10 + bankAt(y, 0), y, 12, 9);
      g.fillRect(pad + wid - 2 + bankAt(y, 1), y, 12, 9);
    }
    for (let y = 0; y < len; y += 6) {
      const l = pad + bankAt(y, 0);
      const rr = pad + wid + bankAt(y, 1);
      g.fillStyle(WATER.deep, 1).fillRect(l, y, rr - l, 7);
      g.fillStyle(WATER.mid, 0.55).fillRect(l + (rr - l) * 0.3, y, (rr - l) * 0.4, 7);
    }
    g.lineStyle(1.5, WATER.ripple, 0.45);
    for (let y = 20; y < len; y += 38) {
      const x0 = pad + 14 + ((y * 7) % Math.max(20, wid - 40));
      g.lineBetween(x0, y, x0 + 16, y + 2);
      g.lineBetween(x0 + 26, y + 15, x0 + 36, y + 16);
    }
    g.fillStyle(WATER.moss, 0.8);
    for (let y = 12; y < len; y += 53) {
      g.fillCircle(pad - 6 + bankAt(y, 0), y, 4);
      g.fillCircle(pad + wid + 6 + bankAt(y + 20, 1), y + 20, 3.5);
    }
  });
  const img = scene.add.image(r.x + r.w / 2, r.y + r.h / 2, key).setDepth(-885);
  if (!vertical) img.setAngle(90);
}

/** 나무다리 한 칸: 강을 가로질러 걸친 널판 + 양쪽 난간 */
function drawBridge(scene: Phaser.Scene, r: Rect, acrossVerticalRiver: boolean): void {
  const L = CELL + 28;
  const W = CELL - 16;
  const key = bakeTexture(scene, `map-bridge-${L}x${W}`, L + 8, W, (g) => {
    const x = 4;
    g.fillStyle(0x4a3628, 1).fillRect(x, 6, L, W - 12);
    g.lineStyle(1, 0x2a1d14, 0.9);
    for (let px = x + 10; px < x + L; px += 12) g.lineBetween(px, 8, px, W - 8);
    g.fillStyle(0x7a5e48, 0.35).fillRect(x, 10, L, 4);
    for (const ry of [0, W - 10]) {
      g.fillStyle(0x6b4f3a, 1).fillRect(x - 4, ry, L + 8, 10);
      g.fillStyle(0x3a2a1e, 1);
      for (let px = x - 4; px <= x + L; px += 30) g.fillRect(px, Math.max(0, ry - 6), 8, 16);
    }
    g.lineStyle(1.5, 0x120f24, 0.8).strokeRect(x - 4, 0, L + 8, W);
  });
  const img = scene.add.image(r.x + r.w / 2, r.y + r.h / 2, key).setDepth(-884);
  if (!acrossVerticalRiver) img.setAngle(90);
}
