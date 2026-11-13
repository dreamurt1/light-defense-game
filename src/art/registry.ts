// 에셋 목록: 분류(UI는 SVG, 나머지는 스프라이트 시트)·파일·프레임 크기·애니메이션을 한 곳에서 정한다.
// scripts/export-assets.mjs가 이 목록을 그려 public/assets/<분류>/<키>.<png|webp> 와 manifest.json을 만들고,
// 게임(PreloadScene)은 manifest를 읽어 불러온다.
// 그림(ChatGPT로 생성, docs/art-order.md)이 art-src/<분류>/에 있으면 코드 그림 대신 그 그림을 art 규격대로 다듬어 쓴다.
import { GameData, type CharacterId } from '../data';
import { KEEPER_SPRITE, PORTRAIT, drawKeeperFrame, drawPortrait } from './characters';
import { drawFriendPortrait } from './friends';
import {
  FAN_TEXTURE_RADIUS,
  GLOW_SIZE,
  RETURN_BURST,
  drawFanLight,
  drawFanMask,
  drawFootShadow,
  drawGlow,
  drawGlowMask,
  drawReturnBurst,
  drawSparkle,
  drawStar,
  fanTextureHeight,
} from './effects';
import { BAT, FROG, WITCH, drawBatDark, drawBatTrue, drawFrogDark, drawFrogTrue, drawWitch } from './enemies';
import type { Ctx } from './kit';
import { CENTRAL, HANGING_LANTERN, LANTERN, drawCentralSource, drawHangingLantern, drawLantern } from './objects';
import { DARK, LIT, VILLAGE_OBJECTS, drawVillage, drawWorld } from './village';
import { LUMI_COLUMNS, LUMI_ROWS, composeLumi, lumiAnims } from './lumiCompose';
import { DIRS } from '../systems/facing';
import { CREATURES, creatureAnim, creatureKey, drawCreature, type CreatureId } from './creatures';
import { DARK_ORB, ITEM_ICON, ITEM_IDS, ITEM_LABEL, drawDarkOrb, drawItemIcon, itemKey } from './items';
import { buildKeeperSheet, drawKeeperSpriteFrame, keeperAnims } from './keeperSprites';

export type AssetCategory = 'characters' | 'enemies' | 'objects' | 'effects' | 'backgrounds' | 'items';

export interface AnimDef {
  key: string;
  frames: number[];
  frameRate: number;
  repeat: number;
}

/** 그림 한 포즈를 프레임에 놓을 때 살짝 바꾸는 점 (숨쉬기·날갯짓 사이·움찔). 이동은 디자인 단위 */
export interface ArtFrame {
  pose: number;
  sx?: number;
  sy?: number;
  dx?: number;
  dy?: number;
  /** 캔버스 filter 문자열 (예: 'brightness(0.75)') */
  filter?: string;
}

/** 생성 그림을 이 시트로 가져오는 규격 */
export interface ArtSpec {
  /** 포즈 이름. art-src/<분류>/<키>.<포즈>.png 를 하나씩, 또는 <키>.png 한 장에 왼쪽부터 나란히 */
  poses: string[];
  /** 프레임마다 쓸 포즈. 길이 = frames */
  frames: ArtFrame[];
  /** 'contain' = 아래 상자에 비율대로 넣기(투명 배경 스프라이트), 'cover' = 프레임을 꽉 채워 자르기(배경 그림) */
  fit: 'contain' | 'cover';
  /** contain일 때 그림이 들어갈 상자(디자인 단위). 모든 포즈가 같은 배율로 들어간다 */
  box?: { x: number; y: number; w: number; h: number };
  /** contain일 때 상자의 어디에 붙일지: 발(아래 가운데) 또는 가운데 */
  align?: 'feet' | 'center';
  /** 내보낼 픽셀 배율. 게임은 manifest의 res로 나눠 같은 크기로 보여 준다 */
  res: number;
  /** 그림이 없을 때 다른 키의 그림을 바꿔 써서 만든다 (예: 빛 받은 마을 = 어두운 마을을 밝고 따뜻하게) */
  derive?: { from: string; filter: string; warm?: string };
}

export interface SheetDef {
  key: string;
  category: AssetCategory;
  label: string;
  /** 디자인 단위 프레임 크기 (실제 픽셀 = × res) */
  frameWidth: number;
  frameHeight: number;
  frames: number;
  /** frame번째 칸을 (0,0)~(frameWidth, frameHeight) 안에 그린다. 배경은 투명. 생성 그림이 없을 때 쓰는 대체 그림 */
  draw(ctx: Ctx, frame: number): void;
  anims?: AnimDef[];
  art?: ArtSpec;
  /**
   * 여러 그림 파일을 엮어 시트를 만드는 경우(루미 8방향): load(`lumi/turn/s`)로 art-src 그림을 받아 캔버스를 돌려준다.
   * null이면 draw(코드 그림)로 대신한다. 결과 픽셀 배율은 buildRes
   */
  build?: (load: (src: string) => Promise<CanvasImageSource | null>) => Promise<HTMLCanvasElement | null>;
  buildRes?: number;
  /** 파일 형식. 배경처럼 큰 불투명 그림은 webp */
  format?: 'png' | 'webp';
  /** false면 Phaser가 불러오지 않는다 (DOM 화면에서만 쓰는 그림) */
  load?: boolean;
}

/** 한 포즈를 frames칸 모두에 그대로 */
const still = (frames: number, pose = 0): ArtFrame[] => Array.from({ length: frames }, () => ({ pose }));

const W = GameData.game.viewport.width;
const H = GameData.game.viewport.height;
/** 플레이 마을(월드) 크기: 카메라가 등불지기를 따라간다 */
const WORLD = GameData.game.world;
const FAN_DEG = GameData.game.light.fanDeg;
const KEEPER_IDS = GameData.characters.map((c) => c.id) as CharacterId[];

/** 루미 8방향 시트가 없을 때의 대체: 코드로 그린 대기 모습을 모든 칸에 (서쪽 계열은 뒤집어서) */
function drawLumiFallback(ctx: Ctx, f: number): void {
  const row = Math.floor(f / LUMI_COLUMNS);
  const dir = DIRS[row] ?? 's';
  const k = 64 / KEEPER_SPRITE.size;
  ctx.save();
  if (dir === 'w' || dir === 'sw' || dir === 'nw') {
    ctx.translate(64, 0);
    ctx.scale(-1, 1);
  }
  // 코드 그림의 발끝(약 52+42)을 64 칸의 61에 맞춘다
  ctx.translate(0, 61 - 94 * k);
  ctx.scale(k, k);
  drawKeeperFrame(ctx, 'lumi', 0);
  ctx.restore();
}

const characters: SheetDef[] = [
  ...KEEPER_IDS.map(
    (id): SheetDef => ({
      key: `portrait-${id}`,
      category: 'characters',
      label: `${GameData.characters.find((c) => c.id === id)?.name ?? id} 초상`,
      frameWidth: PORTRAIT.size,
      frameHeight: PORTRAIT.size,
      frames: 1,
      draw: (ctx) => (id === 'lumi' ? drawPortrait(ctx, id) : drawFriendPortrait(ctx, id, 'true')),
      // 선택·상점 카드에서 크게 보이므로 3배 해상도, 발끝 = 188
      art: { poses: ['sit'], frames: still(1), fit: 'contain', box: { x: 10, y: 8, w: 172, h: 180 }, align: 'feet', res: 3 },
    }),
  ),
  // 잠긴 친구(2026-11-12): 빛을 잃은 모습 — 검은 털 + 보랏빛 눈 (구출하면 제 모습 초상으로)
  ...(['tori', 'doto'] as const).map(
    (id): SheetDef => ({
      key: `portrait-${id}-lost`,
      category: 'characters',
      label: `${GameData.characters.find((c) => c.id === id)?.name ?? id} 초상 (빛을 잃은 모습)`,
      frameWidth: PORTRAIT.size,
      frameHeight: PORTRAIT.size,
      frames: 1,
      draw: (ctx) => drawFriendPortrait(ctx, id, 'lost'),
      art: { poses: ['sit'], frames: still(1), fit: 'contain', box: { x: 10, y: 8, w: 172, h: 180 }, align: 'feet', res: 3 },
    }),
  ),
  // 2026-11-04 루미 재구성: LUMI 시트에서 잘라 낸 프레임(npm run art:lumi)으로 만든 8방향 시트.
  // 디자인 단위 64×64(영문 지시서의 게임 안 크기), 파일은 2배(128×128 원본). 줄 = 방향(e·se·s·sw·w·nw·n·ne) + 연출 줄
  {
    key: 'lumi-8dir',
    category: 'characters',
    label: '루미 8방향 (정지·걷기 팩 + 넉아웃·기절)',
    frameWidth: 64,
    frameHeight: 64,
    frames: LUMI_COLUMNS * LUMI_ROWS,
    draw: (ctx, f) => drawLumiFallback(ctx, f),
    anims: lumiAnims(),
    build: composeLumi,
    buildRes: 2,
  },
  // 2026-11-13 컨셉 시연판: 토리·도토 플레이용 8방향 시트 (임시 코드 그림, lumi-8dir과 같은 줄·칸·애니메이션 이름 규칙)
  ...(['tori', 'doto'] as const).map(
    (id): SheetDef => ({
      key: `${id}-8dir`,
      category: 'characters',
      label: `${GameData.characters.find((c) => c.id === id)?.name ?? id} 8방향 (임시 그림: 정지·걷기 + 넉아웃·기절)`,
      frameWidth: 64,
      frameHeight: 64,
      frames: LUMI_COLUMNS * LUMI_ROWS,
      draw: (ctx, f) => drawKeeperSpriteFrame(ctx, id, f),
      anims: keeperAnims(id),
      build: () => buildKeeperSheet(id),
      buildRes: 2,
    }),
  ),
];

const enemies: SheetDef[] = [
  {
    key: 'bat-dark',
    category: 'enemies',
    label: '파닥 — 어둠에 변한 모습 (날갯짓)',
    frameWidth: BAT.size,
    frameHeight: BAT.size,
    frames: BAT.frames,
    draw: drawBatDark,
    anims: [{ key: 'bat-dark-fly', frames: [0, 1, 2, 1], frameRate: 12, repeat: -1 }],
    // 날개 올림·내림 두 포즈로 날갯짓
    art: {
      poses: ['up', 'down'],
      frames: [{ pose: 0 }, { pose: 1 }, { pose: 0, sy: 0.96, dy: -2 }, { pose: 1, sy: 1.03 }],
      fit: 'contain',
      box: { x: 2, y: 10, w: 76, h: 66 },
      align: 'center',
      res: 2,
    },
  },
  {
    key: 'bat-true',
    category: 'enemies',
    label: '파닥 — 되돌아온 모습 (날갯짓)',
    frameWidth: BAT.size,
    frameHeight: BAT.size,
    frames: BAT.frames,
    draw: drawBatTrue,
    anims: [{ key: 'bat-true-fly', frames: [0, 1, 2, 1], frameRate: 10, repeat: -1 }],
    art: {
      poses: ['up', 'down'],
      frames: [{ pose: 0 }, { pose: 1 }, { pose: 0, sy: 0.96, dy: -2 }, { pose: 1, sy: 1.03 }],
      fit: 'contain',
      box: { x: 2, y: 10, w: 76, h: 66 },
      align: 'center',
      res: 2,
    },
  },
  // 2026-11-12 새 기획: 잃어버린 빛의 주민 개구리 (임시 코드 그림, ChatGPT 그림이 오면 같은 키로 교체)
  {
    key: 'frog-dark',
    category: 'enemies',
    label: '개구리 — 빛을 잃은 모습 (폴짝)',
    frameWidth: FROG.size,
    frameHeight: FROG.size,
    frames: FROG.frames,
    draw: drawFrogDark,
    anims: [{ key: 'frog-dark-hop', frames: [0, 1], frameRate: 3, repeat: -1 }],
    art: { poses: ['sit', 'hop'], frames: [{ pose: 0 }, { pose: 1 }], fit: 'contain', box: { x: 4, y: 6, w: 56, h: 54 }, align: 'feet', res: 2 },
  },
  {
    key: 'frog-true',
    category: 'enemies',
    label: '개구리 — 제 모습 (폴짝)',
    frameWidth: FROG.size,
    frameHeight: FROG.size,
    frames: FROG.frames,
    draw: drawFrogTrue,
    anims: [{ key: 'frog-true-hop', frames: [0, 1], frameRate: 5, repeat: -1 }],
    art: { poses: ['sit', 'hop'], frames: [{ pose: 0 }, { pose: 1 }], fit: 'contain', box: { x: 4, y: 6, w: 56, h: 54 }, align: 'feet', res: 2 },
  },
  {
    key: 'witch',
    category: 'enemies',
    label: '노월 (보스, 대기)',
    frameWidth: WITCH.size,
    frameHeight: WITCH.size,
    frames: WITCH.frames,
    draw: drawWitch,
    anims: [{ key: 'witch-idle', frames: [0, 1], frameRate: 2, repeat: -1 }],
    art: { poses: ['idle'], frames: [{ pose: 0 }, { pose: 0, dy: -2 }], fit: 'contain', box: { x: 8, y: 6, w: 176, h: 182 }, align: 'feet', res: 2 },
  },
  // 2026-11-13 컨셉 시연판: 새 종 (호스틸 2·잃어버린 주민 2·패시브 3, 임시 코드 그림 src/art/creatures.ts)
  ...(Object.keys(CREATURES) as CreatureId[]).flatMap((id) =>
    CREATURES[id].looks.map(
      (look): SheetDef => ({
        key: creatureKey(id, look),
        category: 'enemies',
        label: `${id} — ${look === 'dark' ? '빛을 잃은 모습' : look === 'true' ? '제 모습' : '패시브'}`,
        frameWidth: CREATURES[id].size,
        frameHeight: CREATURES[id].size,
        frames: CREATURES[id].frames,
        draw: (ctx, f) => drawCreature(ctx, id, look, f),
        anims: [{ key: creatureAnim(id, look), frames: [0, 1], frameRate: CREATURES[id].flies ? 8 : 4, repeat: -1 }],
      }),
    ),
  ),
];

// 2026-11-13 컨셉 시연판: 아이템 아이콘 (HUD DOM이 assets/items/item-<id>.png로도 쓴다)
const items: SheetDef[] = ITEM_IDS.map(
  (id): SheetDef => ({
    key: itemKey(id),
    category: 'items',
    label: ITEM_LABEL[id],
    frameWidth: ITEM_ICON.size,
    frameHeight: ITEM_ICON.size,
    frames: 1,
    draw: (ctx) => drawItemIcon(ctx, id),
  }),
);

/**
 * 마을 안 풀숲·장애물로 세우는 소품의 생성 그림 규격 (entities/MapProps.ts). 0 = 밤, 1 = 빛 받음(밤 그림을 밝고 따뜻하게).
 * 상자 아래 = 바닥에 닿는 곳: 등불 기둥은 밑동(20, 104)이 판정 기준이라 상자를 거기에 맞춘다.
 */
const PROP_ART: Record<string, { x: number; y: number; w: number; h: number }> = {
  bush: { x: 4, y: 4, w: 120, h: 100 },
  rock: { x: 4, y: 6, w: 52, h: 38 },
  'barrel-banner': { x: 2, y: 2, w: 80, h: 78 },
  'lamp-post': { x: 2, y: 2, w: 36, h: 102 },
};
const LIT_FILTER = 'brightness(1.45) saturate(1.2) sepia(0.28)';

const objects: SheetDef[] = [
  {
    key: 'central-source',
    category: 'objects',
    label: '중앙 광원 (밝음·약함·꺼짐)',
    frameWidth: CENTRAL.w,
    frameHeight: CENTRAL.h,
    frames: CENTRAL.frames,
    draw: drawCentralSource,
    art: {
      poses: ['lit', 'out'],
      frames: [{ pose: 0 }, { pose: 0, filter: 'brightness(0.7) saturate(0.75)' }, { pose: 1 }],
      fit: 'contain',
      box: { x: 4, y: 2, w: 120, h: 160 },
      align: 'feet',
      res: 2,
    },
  },
  {
    key: 'lantern',
    category: 'objects',
    label: '등불 스테이션 (켜짐·약함·꺼짐)',
    frameWidth: LANTERN.w,
    frameHeight: LANTERN.h,
    frames: LANTERN.frames,
    draw: drawLantern,
    // 켜짐·꺼짐 두 포즈. 약함(HP 낮음)은 켜진 그림을 어둡게
    art: {
      poses: ['lit', 'unlit'],
      frames: [{ pose: 0 }, { pose: 0, filter: 'brightness(0.72) saturate(0.8)' }, { pose: 1 }],
      fit: 'contain',
      box: { x: 1, y: 1, w: 54, h: 78 },
      align: 'feet',
      res: 2,
    },
  },
  {
    key: 'hanging-lantern',
    category: 'objects',
    label: '매단 등불 (꺼짐·켜짐)',
    frameWidth: HANGING_LANTERN.w,
    frameHeight: HANGING_LANTERN.h,
    frames: HANGING_LANTERN.frames,
    draw: drawHangingLantern,
    art: { poses: ['unlit', 'lit'], frames: [{ pose: 0 }, { pose: 1 }], fit: 'contain', box: { x: 1, y: 1, w: 22, h: 32 }, align: 'center', res: 3 },
  },
  // 마을 오브젝트: 0 = 어두운 밤, 1 = 빛을 받은 모습
  ...VILLAGE_OBJECTS.map(
    (o): SheetDef => ({
      key: `village-${o.key}`,
      category: 'objects',
      label: `${o.label} (밤·빛 받음)`,
      frameWidth: o.bounds.w,
      frameHeight: o.bounds.h,
      frames: 2,
      draw: (ctx, f) => {
        ctx.save();
        ctx.translate(-o.bounds.x, -o.bounds.y);
        o.draw(ctx, f === 0 ? DARK : LIT);
        ctx.restore();
      },
      art: PROP_ART[o.key]
        ? {
            poses: ['main'],
            frames: [{ pose: 0 }, { pose: 0, filter: LIT_FILTER }],
            fit: 'contain',
            box: PROP_ART[o.key],
            align: 'feet',
            res: 2,
          }
        : undefined,
    }),
  ),
];

/** LUMI 시트 VFX: 그림이 없으면 별 하나로 대신 */
function vfx(key: string, label: string, w: number, h: number): SheetDef {
  return {
    key,
    category: 'effects',
    label,
    frameWidth: w,
    frameHeight: h,
    frames: 1,
    draw: (ctx) => {
      ctx.save();
      ctx.translate(w / 2 - 16, h / 2 - 16);
      drawStar(ctx);
      ctx.restore();
    },
    art: { poses: ['main'], frames: [{ pose: 0 }], fit: 'contain', box: { x: 1, y: 1, w: w - 2, h: h - 2 }, align: 'center', res: 2 },
  };
}

const effects: SheetDef[] = [
  vfx('fx-star', '별 발사체', 44, 36),
  vfx('fx-impact', '충돌/타격', 48, 42),
  vfx('fx-hurt', '피격 이펙트', 48, 42),
  vfx('fx-stun', '기절', 48, 42),
  vfx('fx-respawn', '회복/부활', 44, 44),
  vfx('fx-swing', '공격 궤적', 52, 38),
  { key: 'glow', category: 'effects', label: '글로우', frameWidth: GLOW_SIZE, frameHeight: GLOW_SIZE, frames: 1, draw: drawGlow },
  { key: 'glow-mask', category: 'effects', label: '빛 마스크', frameWidth: GLOW_SIZE, frameHeight: GLOW_SIZE, frames: 1, draw: drawGlowMask },
  {
    key: 'fan-light',
    category: 'effects',
    label: '60° 부채꼴 빛',
    frameWidth: FAN_TEXTURE_RADIUS,
    frameHeight: fanTextureHeight(FAN_DEG),
    frames: 1,
    draw: (ctx) => drawFanLight(ctx, FAN_DEG),
  },
  {
    key: 'fan-mask',
    category: 'effects',
    label: '부채꼴 마스크',
    frameWidth: FAN_TEXTURE_RADIUS,
    frameHeight: fanTextureHeight(FAN_DEG),
    frames: 1,
    draw: (ctx) => drawFanMask(ctx, FAN_DEG),
  },
  { key: 'sparkle', category: 'effects', label: '반짝이', frameWidth: 32, frameHeight: 32, frames: 1, draw: drawSparkle },
  { key: 'star', category: 'effects', label: '별', frameWidth: 32, frameHeight: 32, frames: 1, draw: drawStar },
  { key: 'foot-shadow', category: 'effects', label: '발밑 그림자', frameWidth: 40, frameHeight: 16, frames: 1, draw: drawFootShadow },
  {
    key: 'fx-return',
    category: 'effects',
    label: '되돌림 터짐',
    frameWidth: RETURN_BURST.size,
    frameHeight: RETURN_BURST.size,
    frames: RETURN_BURST.frames,
    draw: drawReturnBurst,
    anims: [{ key: 'fx-return', frames: [0, 1, 2, 3, 4], frameRate: 14, repeat: 0 }],
  },
  // 2026-11-13 컨셉 시연판: 노월이 던지는 어둠 구슬
  { key: 'fx-dark-orb', category: 'effects', label: '어둠 구슬 (노월 투사체)', frameWidth: DARK_ORB.size, frameHeight: DARK_ORB.size, frames: 1, draw: drawDarkOrb },
];

const cover = (res: number): ArtSpec => ({ poses: ['main'], frames: still(1), fit: 'cover', res });

const backgrounds: SheetDef[] = [
  {
    key: 'village-dark',
    category: 'backgrounds',
    label: '밤 마을 (어두운 겹, 넓은 마을)',
    frameWidth: WORLD.width,
    frameHeight: WORLD.height,
    frames: 1,
    format: 'webp',
    draw: (ctx) => drawWorld(ctx, DARK),
    art: cover(2),
  },
  {
    key: 'village-lit',
    category: 'backgrounds',
    label: '밤 마을 (빛 받은 겹, 넓은 마을)',
    frameWidth: WORLD.width,
    frameHeight: WORLD.height,
    frames: 1,
    format: 'webp',
    draw: (ctx) => drawWorld(ctx, LIT),
    // 따로 그린 '빛 받은 마을'이 없으면 어두운 마을 그림을 밝고 따뜻하게 바꿔 쓴다 (두 겹이 어긋나지 않음)
    art: { ...cover(2), derive: { from: 'village-dark', filter: 'brightness(1.55) saturate(1.25) sepia(0.32)', warm: 'rgba(255, 168, 80, 0.22)' } },
  },
  // 홈·메뉴 화면의 DOM 배경 (Phaser는 불러오지 않음)
  {
    key: 'home',
    category: 'backgrounds',
    label: '홈 그림',
    frameWidth: W,
    frameHeight: H,
    frames: 1,
    format: 'webp',
    load: false,
    draw: (ctx) => drawVillage(ctx, DARK),
    art: cover(1.5),
  },
];

export const SHEETS: readonly SheetDef[] = [...characters, ...enemies, ...items, ...objects, ...effects, ...backgrounds];

export function sheetFile(s: Pick<SheetDef, 'category' | 'key' | 'format'>): string {
  return `${s.category}/${s.key}.${s.format ?? 'png'}`;
}
