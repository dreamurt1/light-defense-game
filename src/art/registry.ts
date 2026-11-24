// 에셋 목록: 분류(UI는 SVG, 나머지는 스프라이트 시트)·파일·프레임 크기·애니메이션을 한 곳에서 정한다.
// scripts/export-assets.mjs가 이 목록을 그려 public/assets/<분류>/<키>.<png|webp> 와 manifest.json을 만들고,
// 게임(PreloadScene)은 manifest를 읽어 불러온다.
// 그림(ChatGPT로 생성, docs/art-order.md)이 art-src/<분류>/에 있으면 코드 그림 대신 그 그림을 art 규격대로 다듬어 쓴다.
import { GameData, type CharacterId } from '../data';
import { KEEPER_SPRITE, PORTRAIT, drawKeeperFrame, drawPortrait } from './characters';
import { drawFriendPortrait } from './friends';
import { SHADE_RES, composeLockedShade, composeLostShade, drawShadeFallback } from './lockedShade';
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
import { BAT, FROG, WITCH, WITCH_FRAME, drawBatDark, drawBatTrue, drawFrogDark, drawFrogTrue, drawWitch, drawWitchAngry, frogAnims } from './enemies';
import type { Ctx } from './kit';
import { CENTRAL, HANGING_LANTERN, LANTERN, drawCentralSource, drawHangingLantern, drawLantern } from './objects';
import { DARK, LIT, VILLAGE_OBJECTS, drawVillage, drawWorld } from './village';
import { LUMI_COLUMNS, LUMI_ROWS, composeLumi, lumiAnims } from './lumiCompose';
import { DIRS } from '../systems/facing';
import { CREATURES, creatureAnims, creatureArtPoses, creatureFrame, creatureKey, creaturePoseFallback, drawCreature, paradeFleeAnim, paradePoseKey, type CreatureId } from './creatures';
import { DARK_ORB, ITEM_ICON, ITEM_IDS, ITEM_LABEL, drawDarkOrb, drawItemIcon, itemKey } from './items';
import { buildKeeperSheet, drawKeeperSpriteFrame } from './keeperSprites';
import { composeSleep } from './sleepSheet';
import { FRIEND_PACKS, composeFriend, friendAnims } from './friendSheet';

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
  /**
   * 이 시트의 축척을 다른 시트(같은 칸·상자)의 생성 그림에서 빌린다 (2026-11-24). 포즈를 보이는 부분만 잘라 상자에 맞추므로
   * 웅크린 그림만 있는 시트는 혼자 맞추면 커져 보인다 → 그 종 걷기 시트의 축척을 쓴다. 빌릴 시트에 생성 그림이 없으면 제 축척
   */
  scaleFrom?: string;
  /**
   * 포즈 파일이 없을 때 대신 쓸 포즈 (2026-11-24 2-C): 걷는 종의 앞·뒤(2차)가 마감까지 안 오면 옆 4장을 그 자리에(뒤집기 없음).
   * 대신 쓴 포즈가 하나라도 있으면 manifest note에 남는다
   */
  poseFallback?: Record<string, string>;
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
  /** 파일 형식. 배경처럼 큰 불투명 그림과 큰 스프라이트(캐릭터 시트·초상·중앙 광원·노월·마을 소품, 2026-11-20 크기 줄이기)는 webp — 작은 그림·빛 효과(투명도가 정확해야 함)는 png */
  format?: 'png' | 'webp';
  /** false면 Phaser가 불러오지 않는다 (DOM 화면에서만 쓰는 그림) */
  load?: boolean;
}

/** 한 포즈를 frames칸 모두에 그대로 */
const still = (frames: number, pose = 0): ArtFrame[] => Array.from({ length: frames }, () => ({ pose }));

/** 개구리 생성 그림(앉음·폴짝 두 포즈)을 12칸(옆·앞·뒤 × 웅크림·박차기·공중·착지)에 나눠 쓴다 */
/** 개구리 생성 그림 포즈 (2026-11-24 2-C): 옆·앞·뒤 × 폴짝 4칸(f01 앉음 → f02 웅크림 → f03 공중 → f04 착지) — 시트 칸 순서와 같음 */
const FROG_ART_POSES = ['090_right', '000_front', '180_back'].flatMap((v) => [1, 2, 3, 4].map((f) => `walk_${v}_f0${f}`));
const FROG_POSE_FALLBACK: Record<string, string> = Object.fromEntries(FROG_ART_POSES.filter((p) => !p.startsWith('walk_090')).map((p) => [p, p.replace(/walk_\d{3}_[a-z]+_/, 'walk_090_right_')]));

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
      format: 'webp',
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
  // 빛을 잃은 친구(이야기 카드 · 구출 직전 판 위): 2026-11-24 라이언 — 옛 코드 그림 대신 잠긴 칸처럼 컨셉 그림의 실루엣을 짙은 면으로,
  // 밤 지도 위에서도 모양이 읽히게 라벤더 테두리 빛을 구워 넣음 (src/art/lockedShade.ts composeLostShade). 컨셉 그림이 없으면 코드 초상 모양을 같은 면색으로.
  // 이야기 카드(DOM) = portrait-<id>-lost 576, 판 위(Phaser, 92px로 줄임) = friend-<id>-lost 192·테두리 굵게
  ...(['tori', 'doto'] as const).flatMap((id): SheetDef[] => [
    {
      key: `portrait-${id}-lost`,
      category: 'characters',
      label: `${GameData.characters.find((c) => c.id === id)?.name ?? id} 빛을 잃은 모습 — 이야기 카드 (컨셉 그림 실루엣 + 라벤더 테두리)`,
      frameWidth: PORTRAIT.size,
      frameHeight: PORTRAIT.size,
      frames: 1,
      draw: (ctx) => drawShadeFallback(ctx, id),
      build: () => composeLostShade(id),
      buildRes: SHADE_RES,
      load: false,
    },
    {
      key: `friend-${id}-lost`,
      category: 'characters',
      label: `${GameData.characters.find((c) => c.id === id)?.name ?? id} 빛을 잃은 모습 — 판 위 구출 전 (컨셉 그림 실루엣 + 굵은 라벤더 테두리)`,
      frameWidth: PORTRAIT.size,
      frameHeight: PORTRAIT.size,
      frames: 1,
      draw: (ctx) => drawShadeFallback(ctx, id),
      build: () => composeLostShade(id, 1, 2),
      buildRes: 1,
    },
  ]),
  // 선택 화면의 잠긴 친구 칸(2026-11-20 라이언): reference 컨셉 그림의 실루엣만 짙은 면색으로 (src/art/lockedShade.ts) — 화면(DOM)에서만 쓴다
  ...(['tori', 'doto'] as const).map(
    (id): SheetDef => ({
      key: `portrait-${id}-shade`,
      category: 'characters',
      label: `${GameData.characters.find((c) => c.id === id)?.name ?? id} 실루엣 (잠긴 칸, 컨셉 그림)`,
      frameWidth: PORTRAIT.size,
      frameHeight: PORTRAIT.size,
      frames: 1,
      draw: (ctx) => drawShadeFallback(ctx, id),
      build: () => composeLockedShade(id),
      buildRes: SHADE_RES,
      load: false,
    }),
  ),
  // 2026-11-04 루미 재구성: LUMI 시트에서 잘라 낸 프레임(npm run art:lumi)으로 만든 8방향 시트.
  // 디자인 단위 64×64(영문 지시서의 게임 안 크기), 파일은 2배(128×128 원본). 줄 = 방향(e·se·s·sw·w·nw·n·ne) + 연출 줄
  {
    key: 'lumi-8dir',
    format: 'webp',
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
  // 2026-11-18: ChatGPT 팩이 있으면 그 그림으로(src/art/friendSheet.ts — 토리 대기 8방향 + 받은 방향의 걷기), 없으면 임시 코드 그림
  ...(['tori', 'doto'] as const).map(
    (id): SheetDef => ({
      key: `${id}-8dir`,
      format: 'webp',
      category: 'characters',
      label: `${GameData.characters.find((c) => c.id === id)?.name ?? id} 8방향 (${FRIEND_PACKS[id] ? 'ChatGPT 팩: 정지 8방향 + 받은 방향의 걷기, 나머지 걷기·넉아웃·기절은 임시' : '임시 그림: 정지·걷기 + 넉아웃·기절'})`,
      frameWidth: 64,
      frameHeight: 64,
      frames: LUMI_COLUMNS * LUMI_ROWS,
      draw: (ctx, f) => drawKeeperSpriteFrame(ctx, id, f),
      anims: friendAnims(id),
      build: async () => (await composeFriend(id)) ?? buildKeeperSheet(id),
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
    // 2026-11-13: 4칸 모두 다른 날갯짓 (위 → 내려침 → 아래 → 접어 올림), 3/4 옆모습 — 왼쪽은 flipX
    anims: [{ key: 'bat-dark-fly', frames: [0, 1, 2, 3], frameRate: 12, repeat: -1 }],
    // 2-C(2026-11-24) 생성 그림: art-src/enemies/bat-dark.fly_090_right_f01~04.png (ChatGPT bat_fly_090_right_f01~04)
    art: {
      poses: ['fly_090_right_f01', 'fly_090_right_f02', 'fly_090_right_f03', 'fly_090_right_f04'],
      frames: [{ pose: 0 }, { pose: 1 }, { pose: 2 }, { pose: 3 }],
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
    anims: [{ key: 'bat-true-fly', frames: [0, 1, 2, 3], frameRate: 10, repeat: -1 }],
    // 2-C: art-src/enemies/bat-true.fly_090_right_f01~04.png (ChatGPT bat_true_fly_090_right_f01~04)
    art: {
      poses: ['fly_090_right_f01', 'fly_090_right_f02', 'fly_090_right_f03', 'fly_090_right_f04'],
      frames: [{ pose: 0 }, { pose: 1 }, { pose: 2 }, { pose: 3 }],
      fit: 'contain',
      box: { x: 2, y: 10, w: 76, h: 66 },
      align: 'center',
      res: 2,
      scaleFrom: 'bat-dark', // 되돌아온 모습 = 같은 박쥐, 같은 축척(제자리 교체)
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
    // 2026-11-13: 옆·앞·뒤 × 폴짝 4칸 (웅크림·박차기·공중·착지). 폴짝 주기 0.7초 ≈ 4칸 ÷ 6fps
    anims: frogAnims('frog-dark-hop', 6),
    // 2-C(2026-11-24): art-src/enemies/frog-dark.walk_090_right_f01~04 · walk_000_front_… · walk_180_back_….png (ChatGPT frog_lost_walk_…), 앞·뒤가 없으면 옆
    art: { poses: FROG_ART_POSES, frames: FROG_ART_POSES.map((_, pose) => ({ pose })), fit: 'contain', box: { x: 4, y: 6, w: 56, h: 54 }, align: 'feet', res: 2, poseFallback: FROG_POSE_FALLBACK },
  },
  {
    key: 'frog-true',
    category: 'enemies',
    label: '개구리 — 제 모습 (폴짝)',
    frameWidth: FROG.size,
    frameHeight: FROG.size,
    frames: FROG.frames,
    draw: drawFrogTrue,
    // 구출 뒤 뛰어가는 폴짝(0.36초)에 맞춰 빠르게
    anims: frogAnims('frog-true-hop', 10),
    // 2-C: art-src/enemies/frog-true.walk_….png (ChatGPT frog_walk_…) — 빛을 잃은 모습과 같은 축척(구출 순간 제자리 교체)
    art: { poses: FROG_ART_POSES, frames: FROG_ART_POSES.map((_, pose) => ({ pose })), fit: 'contain', box: { x: 4, y: 6, w: 56, h: 54 }, align: 'feet', res: 2, poseFallback: FROG_POSE_FALLBACK, scaleFrom: 'frog-dark' },
  },
  {
    key: 'witch',
    format: 'webp',
    category: 'enemies',
    label: '노월 (보스: 대기 4 · 시전 2 · 진정 1)',
    frameWidth: WITCH.size,
    frameHeight: WITCH.size,
    frames: WITCH.frames,
    draw: drawWitch,
    // 2026-11-13: 대기 0~3 반복, 시전 4~5 한 번(구슬·박쥐 부를 때), 진정 = WITCH_FRAME.calm(6) 한 칸
    anims: [
      { key: 'witch-idle', frames: [...WITCH_FRAME.idle], frameRate: 6, repeat: -1 },
      { key: 'witch-cast', frames: [...WITCH_FRAME.cast], frameRate: 6, repeat: 0 },
    ],
    // 2026-11-24 v3 브리프의 노월 3자세: art-src/enemies/<키>.idle.png · .cast.png · .calmed.png (3장 모두 있어야 쓰고, 한 장짜리 <키>.png면 그 한 장을 모든 칸에)
    art: {
      poses: ['idle', 'cast', 'calmed'],
      frames: [{ pose: 0 }, { pose: 0, dy: -1 }, { pose: 0, dy: -2 }, { pose: 0, dy: -1 }, { pose: 1, dy: -1 }, { pose: 1, dy: -2 }, { pose: 2 }],
      fit: 'contain',
      box: { x: 8, y: 6, w: 176, h: 182 },
      align: 'feet',
      res: 2,
    },
  },
  {
    key: 'witch-angry',
    format: 'webp',
    category: 'enemies',
    label: '분노한 노월 (넓히는 길, 2026-11-23: 같은 그림, 눈빛 잔불 주황)',
    frameWidth: WITCH.size,
    frameHeight: WITCH.size,
    frames: WITCH.frames,
    draw: drawWitchAngry,
    // 2026-11-13: 대기 0~3 반복, 시전 4~5 한 번(구슬·박쥐 부를 때), 진정 = WITCH_FRAME.calm(6) 한 칸
    anims: [
      { key: 'witch-angry-idle', frames: [...WITCH_FRAME.idle], frameRate: 6, repeat: -1 },
      { key: 'witch-angry-cast', frames: [...WITCH_FRAME.cast], frameRate: 6, repeat: 0 },
    ],
    // 2026-11-24 v3 브리프의 노월 3자세: art-src/enemies/<키>.idle.png · .cast.png · .calmed.png (3장 모두 있어야 쓰고, 한 장짜리 <키>.png면 그 한 장을 모든 칸에)
    art: {
      poses: ['idle', 'cast', 'calmed'],
      frames: [{ pose: 0 }, { pose: 0, dy: -1 }, { pose: 0, dy: -2 }, { pose: 0, dy: -1 }, { pose: 1, dy: -1 }, { pose: 1, dy: -2 }, { pose: 2 }],
      fit: 'contain',
      box: { x: 8, y: 6, w: 176, h: 182 },
      align: 'feet',
      res: 2,
      scaleFrom: 'witch', // 같은 사람 — 로브·박쥐 실루엣이 넓어도 찾아온 노월과 같은 크기로
    },
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
        // 걷는 종 = 옆·앞·뒤 × 4칸 (`-move` · `-move-front` · `-move-back`), 나는 종 = 옆 4칸 (`-move`)
        anims: creatureAnims(id, look),
        // 2026-11-24 생성 그림 자리(v3 브리프 이름): art-src/enemies/<키>.walk_090_right_f01~04 · walk_000_front_… · walk_180_back_….png (나는 종은 옆만) — 모두 있어야 쓴다
        art: {
          poses: creatureArtPoses(id),
          frames: creatureArtPoses(id).map((_, pose) => ({ pose })),
          fit: 'contain',
          box: CREATURES[id].flies ? { x: 4, y: 4, w: CREATURES[id].size - 8, h: CREATURES[id].size - 8 } : { x: 4, y: 4, w: CREATURES[id].size - 8, h: CREATURES[id].cy - 4 },
          align: CREATURES[id].flies ? 'center' : 'feet',
          res: 2,
          // 2-C(2026-11-24): 앞·뒤가 없으면 옆 4장, 제 모습은 빛을 잃은 모습과 같은 축척(구출 순간 제자리 교체)
          poseFallback: CREATURES[id].flies ? undefined : creaturePoseFallback(id),
          scaleFrom: look === 'true' && CREATURES[id].looks.includes('dark') ? creatureKey(id, 'dark') : undefined,
        },
      }),
    ),
  ),
  // 2026-11-24 행렬 패시브의 웅크림·도망 그림 자리: 생성 그림이 없으면 옆 걸음 그림 그대로(지금 화면과 같음 — 웅크림은 Creature가 납작하게),
  // 생성 그림(art-src/enemies/<id>-cower.cower.png · <id>-flee.f01~f02.png, 브리프 "웅크림 1장 · 도망 2칸")이 오면 npm run assets → Creature가 그 그림으로 바꿔 낀다
  ...(Object.keys(CREATURES) as CreatureId[])
    .filter((id) => CREATURES[id].looks.includes('plain'))
    .flatMap((id): SheetDef[] => {
      const c = CREATURES[id];
      const box = c.flies ? { x: 4, y: 4, w: c.size - 8, h: c.size - 8 } : { x: 4, y: 4, w: c.size - 8, h: c.cy - 4 };
      const align = c.flies ? 'center' : 'feet';
      return [
        {
          key: paradePoseKey(id, 'cower'),
          category: 'enemies',
          label: `${id} — 행렬 웅크림 (그림 자리)`,
          frameWidth: c.size,
          frameHeight: c.size,
          frames: 1,
          draw: (ctx) => drawCreature(ctx, id, 'plain', creatureFrame('side', 0)),
          art: { poses: ['cower'], frames: still(1), fit: 'contain', box, align, res: 2, scaleFrom: creatureKey(id, 'plain') },
        },
        {
          key: paradePoseKey(id, 'flee'),
          category: 'enemies',
          label: `${id} — 행렬 도망 2칸 (그림 자리)`,
          frameWidth: c.size,
          frameHeight: c.size,
          frames: 2,
          draw: (ctx, f) => drawCreature(ctx, id, 'plain', creatureFrame('side', f * 2)),
          anims: [{ key: paradeFleeAnim(id), frames: [0, 1], frameRate: c.fleeFps ?? Math.max(4, Math.round(c.fps * 0.75)), repeat: -1 }],
          art: { poses: ['f01', 'f02'], frames: [{ pose: 0 }, { pose: 1 }], fit: 'contain', box, align, res: 2, scaleFrom: creatureKey(id, 'plain') },
        },
      ];
    }),
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
    format: 'webp',
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
      // 그림 칸에 맞춘 상자: 아래 = 받침 바닥(footY) 조금 아래 (2026-11-13 중앙 광원을 키우며 CENTRAL에서 계산)
      box: { x: 4, y: 2, w: CENTRAL.w - 8, h: CENTRAL.footY + 2 },
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
      format: 'webp',
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

/** 2-B 그림이 없을 때의 임시 코드 그림: 위아래 그라데이션 (2026-11-24) */
const fillGradient = (top: string, bottom: string) => (ctx: CanvasRenderingContext2D): void => {
  const { width: w, height: h } = ctx.canvas;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
};
/** v3 브리프 2-B (2026-11-24 ChatGPT, reference/Morning_Art_Pack·Region_Cards_v3·Story_Cards_v3): 아침 배경 세로·가로, 새 지역 카드 B·C, 이야기 카드 2·4 — DOM 배경 */
const dawnArt = (key: string, label: string, w: number, h: number, top: string, bottom: string): SheetDef => ({
  key,
  category: 'backgrounds',
  label,
  frameWidth: w,
  frameHeight: h,
  frames: 1,
  format: 'webp',
  load: false,
  draw: fillGradient(top, bottom),
  art: cover(2),
});

/**
 * 주인공 잠든 모습 (2026-11-24 2-C 1-3절, ChatGPT reference/Sleep_Pack/<id>_sleep.png — src/art/sleepSheet.ts가 8방향 시트와 같은 축척으로 128 칸에).
 * 쓰러짐 = 잠듦(X 눈 금지). 그림이 없으면 Lightkeeper가 옆모습 대기 첫 칸을 눕혀 쓴다 — 'z' 같은 글자는 띄우지 않는다(라이언 11-24)
 */
export const sleepKey = (id: string): string => `${id}-sleep`;
const sleepSheets: SheetDef[] = (['lumi', 'tori', 'doto'] as const).map((id) => ({
  key: sleepKey(id),
  format: 'webp',
  category: 'characters',
  label: `${id} — 잠든 모습 (Sleep_Pack, 8방향 시트와 같은 축척)`,
  frameWidth: 64,
  frameHeight: 64,
  frames: 1,
  draw: () => undefined,
  build: () => composeSleep(id),
  buildRes: 2,
}));

const backgrounds: SheetDef[] = [
  dawnArt('morning', '아침 배경 — 세로 (ChatGPT 2-B)', 540, 1170, '#3A3F78', '#F2B880'),
  dawnArt('morning-wide', '아침 배경 — 가로 (ChatGPT 2-B)', 1170, 540, '#3A3F78', '#F2B880'),
  dawnArt('region-border', '새 지역 카드 — 경계의 숲 (ChatGPT 2-B)', 512, 256, '#1B1F3B', '#14152E'),
  dawnArt('region-dark', '새 지역 카드 — 어둠이 삼킨 외곽 (ChatGPT 2-B)', 512, 256, '#14152E', '#120F24'),
  dawnArt('story-02-source', '이야기 카드 2 — 광원이 꺼진 밤 (ChatGPT 2-B)', 640, 360, '#1B1F3B', '#120F24'),
  dawnArt('story-04-voices', '이야기 카드 4 — 두 목소리 (ChatGPT 2-B)', 640, 360, '#1B1F3B', '#2A2F5A'),
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
  // 2026-11-18 새 홈(docs/design/HOME_SCREEN.md): ChatGPT 배경 두 장 + 제목. 받은 원본은 reference/Home_Art_Pack/,
  // art-src에는 가장자리 흰 줄을 자르고(세로 1064×2340·가로 2332×1080) 제목의 떨어진 조각을 지운 판. 메뉴 화면 흐린 배경·스플래시도 'home'을 쓴다
  {
    key: 'home',
    category: 'backgrounds',
    label: '홈 배경 — 세로 (캐릭터·제목 없음, 등불 빈터)',
    frameWidth: 532,
    frameHeight: 1170,
    frames: 1,
    format: 'webp',
    load: false,
    draw: (ctx) => drawVillage(ctx, DARK),
    art: cover(2),
  },
  {
    // 2026-11-21 라이언: 세로 홈(폰 세로·PC 세로)은 웹 썸네일 그림 — 제목(LIGHT DEFENSE)과 등불 둘레 실루엣이 그림에 들어 있다.
    // 원본 reference/Home_Art_Pack/light-defense-web-thumbnail.png(830×1894), 비율 그대로
    key: 'home-thumb',
    category: 'backgrounds',
    label: '홈 배경 — 세로 (웹 썸네일: 제목·실루엣 포함)',
    frameWidth: 415,
    frameHeight: 947,
    frames: 1,
    format: 'webp',
    load: false,
    draw: (ctx) => drawVillage(ctx, DARK),
    art: cover(2),
  },
  {
    // 2026-11-21 라이언: 가로 홈(PC 풀·폰 가로)도 웹 썸네일 그림(16:9) — 제목과 등불 둘레 실루엣이 가운데, 양옆은 어두운 숲.
    // 원본 reference/Home_Art_Pack/light-defense-web-thumbnail-landscape.png(1672×941)
    key: 'home-thumb-wide',
    category: 'backgrounds',
    label: '홈 배경 — 가로 (웹 썸네일 16:9: 제목·실루엣 포함)',
    frameWidth: 836,
    frameHeight: 470,
    frames: 1,
    format: 'webp',
    load: false,
    draw: (ctx) => drawVillage(ctx, DARK),
    art: cover(2),
  },
  {
    key: 'home-wide',
    category: 'backgrounds',
    label: '홈 배경 — 가로',
    frameWidth: 1166,
    frameHeight: 540,
    frames: 1,
    format: 'webp',
    load: false,
    draw: (ctx) => drawVillage(ctx, DARK),
    art: cover(2),
  },
  {
    key: 'home-title',
    category: 'backgrounds',
    label: '홈 제목 (투명)',
    frameWidth: 600,
    frameHeight: 464,
    frames: 1,
    format: 'webp',
    load: false,
    draw: (ctx) => {
      ctx.fillStyle = '#F6E7C8';
      ctx.font = '700 96px serif';
      ctx.textAlign = 'center';
      ctx.fillText('LIGHT', 300, 250);
      ctx.fillText('DEFENSE', 300, 360);
    },
    art: { poses: ['main'], frames: still(1), fit: 'contain', align: 'center', res: 2 },
  },
];

export const SHEETS: readonly SheetDef[] = [...characters, ...sleepSheets, ...enemies, ...items, ...objects, ...effects, ...backgrounds];

export function sheetFile(s: Pick<SheetDef, 'category' | 'key' | 'format'>): string {
  return `${s.category}/${s.key}.${s.format ?? 'png'}`;
}
