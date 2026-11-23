// 밸런스 원본: 수치는 여기 JSON에서만 바꾼다(스킬 assets/data/에 복사본, npm run doc:skill).
// 2026-11-12 새 기획(XMind 1112): 스테이지·주인공 HP/하트/LP·중앙 광원·등불 스테이션·적 세 무리.
import gameJson from './game.json';
import charactersJson from './characters.json';
import enemiesJson from './enemies.json';
import itemsJson from './items.json';
import stagesJson from './stages.json';
import mapJson from './map.json';
import cosmeticsJson from './cosmetics.json';
import nightsJson from './nights.json';
import shopJson from './shop.json';
import obstaclesJson from './obstacles.json';
// 격자 맵 (2026-11-23): 새 맵을 더하면 여기와 nights.json bands에 (스킬 ld-map-grid)
import mapA1 from './maps/A1.json';
import mapA2 from './maps/A2.json';
import mapB1 from './maps/B1.json';
import type { GridDict, GridMap } from '../systems/grid';

export type CharacterId = 'lumi' | 'tori' | 'doto';
export type EnemyId =
  | 'bat'
  | 'werewolf'
  | 'vampire'
  | 'frog'
  | 'hedgehog'
  | 'redpanda'
  | 'owl'
  | 'moth'
  | 'firefly'
  | 'witch'
  /** 빛을 잃은 친구 (구출 스테이지, 되찾으면 해금) */
  | 'tori-lost'
  | 'doto-lost';
/** 적 무리: 어둠의 호스틸 / 잃어버린 빛의 주민(호스틸, 구출) / 어둠의 패시브 / 보스 */
/** 노월의 한 모습 (game.json boss.calm / boss.angry) */
export interface WitchFormDef {
  hp: number;
  summonCount: number;
  summonCap: number;
  orbEverySec: number;
  orbDamage: number;
  score: number;
  /** 나타나 자리를 잡을 때 말풍선 */
  enterLine: string;
  /** 진정될 때 말풍선 */
  calmLine: string;
  /** 눈빛·몸 둘레 빛 색 */
  eye: string;
}
export type WitchForm = 'calm' | 'angry';

export type EnemyKind = 'hostile' | 'lost' | 'passive' | 'boss';
/** 하늘빛 시간대(연출용). predawn = 클라이맥스(진행 70%부터) */
export type PhaseId = 'dusk' | 'midnight' | 'predawn';
export type NightPhase = PhaseId | 'dawn';

interface Footprint {
  w: number;
  h: number;
}

export interface GameConfig {
  /** 세로 540×960. 가로(2026-11-06)는 높이 540 고정, 폭은 화면 비율(720~1280) — core/layout.ts */
  viewport: { width: number; height: number; orientation: 'portrait'; landscape: { height: number; minWidth: number; maxWidth: number } };
  /** 마을(월드) 크기. 카메라가 등불지기를 따라간다 */
  world: { width: number; height: number };
  /** 이동 속도(px/초), 장애물 판정 반지름, 중앙 광원에서 아래로 떨어져 서는 거리, 걷지 못하는 둘레 폭 */
  keeper: { moveSpeed: number; radius: number; startOffsetY: number; walkInset: { top: number; side: number; bottom: number } };
  /** 풀숲에 숨기. 숨은 루미를 놓친 적은 lostSightSec 동안 맴돌다 광원·등불로 간다 */
  hide: {
    revealDist: number;
    revealAfterFireSec: number;
    keeperAlpha: number;
    bushAlphaInside: number;
    roamSpeed: number;
    roamMin: number;
    roamMax: number;
    lostSightSec: number;
    /** 2026-11-13: 풀숲에 이만큼 넘게 있으면 들킴, 그동안 적이 알아채는 거리 배율 */
    maxHiddenSec: number;
    exposedAggroMultiplier: number;
  };
  /** 자비: 패시브 주민 곁 radius 안에 dwellSec 동안 공격하지 않으면 */
  mercy: { radius: number; dwellSec: number };
  controls: { deadzone: number; mouseCancelRadius: number; autoHoldDelaySec: number; aimDeadzone: number };
  /** 스테이지 공통: 클라이맥스 시작 비율, 하트 수, 하늘빛 시간대(비율) */
  stage: { climaxAt: number; hearts: number; phases: Record<PhaseId, [number, number]> };
  /** 런(밤 나들이, 2026-11-23): 아침 하트 회복, 하트 최대, 완전 승리면 다음 밤에 켜진 채 시작하는 등불 수 */
  run: { morningHeal: number; maxHearts: number; completeLitStations: number };
  /** 빛 레벨 ★ (2026-11-23, systems/growth.ts) */
  growth: {
    resetOnRunEnd: boolean;
    maxLevel: number;
    xp: { rescue: number; returnHostile: number; station: number; mercy: number; banishPassive: number };
    xpToNext: number[];
    perLevel: { lightPower: number; lightRange: number; lightRangeCap: number; lpMax: number; toriMove: number; dotoItemEffect: number };
  };
  /** 별가루 ✦ (2026-11-23, systems/stardust.ts) */
  dust: { station: number; victory: number; complete: number; rescue: number; mercy: number; witch: number };
  player: {
    maxHp: number;
    respawnDelaySec: number;
    invulnSec: number;
    regenDelaySec: number;
    regenPerSec: number;
    centralRegenPerSec: number;
    hurtKnockback: number;
    lowHpRatio: number;
    respawnPushRadius: number;
    respawnPush: number;
  };
  lp: {
    min: number;
    max: number;
    start: number;
    regenPerSec: number;
    stationRegenPerSec: number;
    centralRegenPerSec: number;
    castCost: number;
    stationCost: number;
    weakest: number;
  };
  /** 광도 0~100 → 4단계 경계 */
  lightLevels: { names: [string, string, string, string]; bands: [number, number, number] };
  central: {
    x: number;
    y: number;
    radius: number;
    footprint: Footprint;
    /** HP (가득으로 시작, 회복 없음 — 2026-11-14). 광도 = HP 비례 */
    maxHp: number;
    healRadius: number;
    glowMin: number;
    glowMax: number;
  };
  station: {
    radius: number;
    footprint: Footprint;
    /** HP (켜지는 순간 가득, 0이면 꺼짐 — 2026-11-14). 광도 = HP 비례 */
    maxHp: number;
    /** 켜진 동안 저절로 줄어드는 HP (초당) */
    decayPerSec: number;
    /** 꺼진 등불을 켜면 오르는 중앙 광원 HP */
    centralHeal: number;
    /** 등불의 결계 (2026-11-14, systems/lampWard) */
    ward: import('../systems/lampWard').WardConfig;
    igniteSec: number;
    damageMultiplier: number;
    healRadius: number;
    glowMin: number;
    glowMax: number;
  };
  /** 루미 주변 빛(LP에 비례, 스테이지가 흐를수록 넓어짐) */
  aura: { glowMin: number; glowMax: number; growWithProgress: number };
  /** closeAggro·stuckSec·detour* = 2026-11-13 역할별 호스틸·미로 벽 우회 */
  /** slam*·charge* = 2026-11-13 몸박치기 */
  enemyAi: {
    aggroRadius: number;
    retargetSec: number;
    detachRatio: number;
    closeAggro: number;
    stuckSec: number;
    detourDist: number;
    detourSec: number;
    slamBack: number;
    slamSec: number;
    chargeDist: number;
    chargeLead: number;
    chargeSpeed: number;
    /** 트라이얼의 고정된 적이 공격하는 거리(몸이 닿는 거리 + 이만큼)·뒤로 젖힘·내밂 (2026-11-14) */
    pinnedReach: number;
    pinnedBackPx: number;
    pinnedLungePx: number;
    pinnedLungeSec: number;
    /** 들이받을 때 루미 몸에 겹쳐 들어가는 정도(2026-11-18: 실제로 닿을 때만 피해) */
    pinnedOverlap: number;
    /** 종류별 빛 반응 '어둠에서보다 느려짐' (2026-11-18): 등불지기 주변 빛 안에서 호스틸·잃어버린 주민 이동 배율 (제안) */
    lightSlowMultiplier: number;
  };
  light: {
    mode: 'aimStick';
    fanDeg: number;
    cooldownSec: number;
    expandSec: number;
    knockback: number;
    stunSec: number;
    /** 빛이 장애물에 막힘 (2026-11-23 격자 맵: 바위·집·술통·건초·울타리, 풀숲·강·다리는 안 막음) */
    blockedByObstacles: boolean;
  };
  combo: {
    windowSec: number;
    lossMode: 'half' | 'reset';
    multiplierStep: number;
    multiplierPerStep: number;
    maxMultiplier: number;
  };
  score: { station: number; mercy: number; banishPassive: number; itemPickup: number; clearBase: number; completeMultiplier: number; orbPop: number };
  playfield: { margin: number };
  items: {
    lifetimeSec: number;
    blinkLastSec: number;
    maxGround: number;
    slots: number;
    pickRadius: number;
    spawnRingMin: number;
    spawnRingMax: number;
    /** 2026-11-14: 켜진 등불 빛 안에 생길 확률과 그 둘레, 패배 위험일 때 루미 곁 둘레·판정·다음 아이템 당기기 */
    lampShare: number;
    lampRingMin: number;
    lampRingMax: number;
    dangerRingMin: number;
    dangerRingMax: number;
    dangerHpRatio: number;
    dangerSoonSec: number;
  };
  /** 패시브 = 어둠의 행렬 (2026-11-23): 돌려보내면 그 너머의 호스틸, 길 없는 패시브의 피하기 */
  passive: {
    shyDist: number;
    shySpeedMultiplier: number;
    banishHostileCount: number;
    banishHostileDist: number;
  };
  /** 구획 시야 (2026-11-18, systems/zones.ts) */
  zones: {
    lightRadius: number;
    darkRadius: number;
    vision: { light: number; border: number; dark: number };
    veil: Record<string, number>;
    village: { radiusMin: number; radiusMax: number; alpha: number; glow: number };
  };
  /** 랜덤 이벤트 (2026-11-18, systems/runEvents.ts · scenes/play/RunEvents.ts) */
  runEvents: {
    atMin: number;
    atMax: number;
    weights: { fireflies: number; lostParade: number; gift: number; darkWind: number };
    fireflies: { durationSec: number; radius: number };
    lostParade: { count: number };
    darkWind: { durationSec: number; enemySpeed: number };
  };
  /** 노월 (2026-11-13, scenes/play/Boss.ts) */
  boss: {
    orbitRx: number;
    orbitRy: number;
    orbitSpeed: number;
    enterSec: number;
    hitRadius: number;
    summonEverySec: number;
    orbSpeed: number;
    orbRadius: number;
    /** 두 모습 (2026-11-23 밤 나들이 v3): 지키는 길·중립 = 찾아온 노월, 넓히는 길 = 분노한 노월 */
    calm: WitchFormDef;
    angry: WitchFormDef;
  };
  tutorial: { walkGoal: number };
  /** 연습장·튜토리얼(끝나지 않는 판) */
  practice: { centralFloor: number };
  /** 맵 전체 광도 — systems/villageMood.ts */
  village: {
    brightenMax: number;
    brightenPower: number;
    buffMultiplier: number;
    centralHitDip: number;
    playerHitDip: number;
    climaxDipMultiplier: number;
    dipRecoverPerSec: number;
    dipMax: number;
    gloomPerDip: number;
  };
}

export interface CharacterDef {
  id: CharacterId;
  name: string;
  nameEn: string;
  animal: string;
  default?: boolean;
  lightRange: number;
  lightPower: number;
  lightCooldownMultiplier: number;
  /** 특성: 루미 밤눈 · 토리 빠른 발(2026-11-17 라이언, 옛 빠른 손 quickPaw) · 도토 볼주머니 */
  trait: 'nightEyes' | 'quickFeet' | 'cheekPouch';
  traitParams: Record<string, number>;
  /** null = 처음부터, rescue = 구출 스테이지에서 구하면 해금(Phase 5) */
  unlock: 'rescue' | null;
  color: string;
  blurb: string;
  voicePitchHz: number;
}

export interface EnemyGroup {
  min: number;
  max: number;
  intervalSec: number;
}

export interface EnemyDef {
  id: EnemyId;
  kind: EnemyKind;
  name: string;
  nameEn: string;
  /** 지금 게임에 나오는지 (Phase마다 늘어난다) */
  implemented: boolean;
  hp: number;
  speed: number;
  /** 주인공 HP 피해 (주기마다) */
  damage: number;
  /** 중앙 광원·등불 광도 피해 (주기마다, 등불은 station.damageMultiplier배) */
  sourceDamage: number;
  damageTickSec: number;
  score: number;
  radius: number;
  /** 날아서 장애물을 무시 */
  flies?: boolean;
  knockbackMultiplier?: number;
  behavior: string;
  behaviorParams?: Record<string, number | boolean | string>;
  group?: EnemyGroup;
  /** 빛을 잃은 친구: 되찾으면 이 캐릭터가 해금 */
  friend?: CharacterId;
  /** 어둠의 행렬 (패시브, 2026-11-23): 몇 번 맞으면 돌려보냄 · 웅크림·도망 시간 · 도망 빠르기 */
  hitsToBanish?: number;
  cowerSec?: number;
  fleeSec?: number;
  fleeMultiplier?: number;
}

export interface SpawnTable {
  maxAlive: number;
  intervalStart: number;
  intervalEnd: number;
  weights: Partial<Record<EnemyId, number>>;
}

export interface StageDef {
  id: string;
  name: string;
  /** 맵 3종 = 스테이지 테마(라이언 답변): light-village · border · dark-village */
  theme: 'light-village' | 'border' | 'dark-village';
  durationSec: number;
  /** 등불 스테이션 수 (1~4) */
  stations: number;
  spawn: { onlyHostileUntilSec?: number; normal: SpawnTable; climax: SpawnTable };
  /** 패시브 주민 (동시 최대에 넣지 않는 별도 줄) */
  passive?: { intervalSec: number; maxAlive: number; weights: Partial<Record<EnemyId, number>> };
  /** 빛을 잃은 친구가 진행 atProgress에 나타남 */
  rescue?: { enemyId: EnemyId; atProgress: number };
  /** 보스 스테이지 */
  boss?: { enemyId: EnemyId; atSec: number };
  /** 맵에 아이템이 생기는 간격 */
  items?: { intervalSec: number; firstSec: number };
  /** 튜토리얼 판 (시계가 멈추고 단계를 따라감) */
  tutorial?: boolean;
  /** 끝나지 않는 판: 시계가 멈추고 하트·중앙 광원이 바닥나지 않음 (트라이얼, 2026-11-14) */
  endless?: boolean;
  /** 등불 자리를 seed로 고르지 않고 map.json stations의 이 번호로 고정 (트라이얼, 2026-11-14) */
  stationSpots?: number[];
  /** 트라이얼(2026-11-14 라이언, 브롤스타즈 스타파크 훈련장 참고): 제자리에 고정된 적 — 움직이지도 공격하지도 않고, 쓰러지면 respawnSec 뒤 같은 자리에 */
  dummies?: { respawnSec: number; list: { enemyId: EnemyId; x: number; y: number }[] };
  /** 선택 화면에 보이는 짧은 소개 */
  blurb?: string;
}

export interface ItemDef {
  id: string;
  name: string;
  effect: string;
  color: string;
  [key: string]: string | number;
}

// JSON 추론 타입(튜플·선택 필드)이 인터페이스와 정확히 맞지 않아 unknown을 거쳐 붙인다
export const GameData = {
  game: gameJson as unknown as GameConfig,
  characters: charactersJson as unknown as CharacterDef[],
  enemies: enemiesJson as unknown as EnemyDef[],
  items: itemsJson as unknown as ItemDef[],
  stages: stagesJson as unknown as StageDef[],
  map: mapJson as unknown as MapDef,
  cosmetics: cosmeticsJson as unknown as CosmeticsDef,
  nights: nightsJson as unknown as NightsDef,
  shop: shopJson as unknown as ShopDef,
  /** 격자 맵 사전·맵 (2026-11-23, systems/grid.ts) */
  grid: obstaclesJson as unknown as GridDict,
  maps: Object.fromEntries([mapA1, mapA2, mapB1].map((m) => [m.id, m as unknown as GridMap])) as Record<string, GridMap>,
};

/** 맵 id로 (없으면 A1) */
export function gridMapById(id: string | null | undefined): GridMap {
  return (id && GameData.maps[id]) || GameData.maps.A1;
}

/** 아침 상점 준비물 (2026-11-23, shop.json): perRun 1 = 한 런에 한 번(런 내내), 0 = 아침마다·다음 밤만 */
export interface PrepDef {
  id: string;
  name: string;
  desc: string;
  price: number;
  perRun: 0 | 1;
  effect: { stationDecayPerSec?: number; hearts?: number; itemSlots?: number; charmPerStage?: number };
}
export interface ShopDef {
  prep: PrepDef[];
}

/** 밤 구간 (2026-11-23 밤 나들이): A 빛의 마을 · B 경계의 숲 · C 어둠이 삼킨 외곽 */
export type BandId = 'A' | 'B' | 'C';
export interface NightBand {
  id: BandId;
  name: string;
  theme: StageDef['theme'];
  fromNight: number;
  /** 이 구간의 격자 맵 id (src/data/maps/) */
  maps: string[];
}
/** 밤마다 늘어나는 적 표 하나 (평소 / 클라이맥스) */
export interface NightSpawnCurve {
  maxAliveStart: number;
  maxAlivePerNight: number;
  maxAliveCap: number;
  /** 밤 1의 [시작, 끝] 생성 간격(초) */
  intervalStart: [number, number];
  /** 밤마다 간격에 곱함 */
  intervalPerNight: number;
  intervalFloor: [number, number];
}
/** 구간값 표: 밤 n 이하에서 가장 큰 키의 값 */
export type NightTable<T> = Record<string, T>;
/** nights.json — 밤 n의 규칙을 만드는 표 (systems/nightRules.ts) */
export interface NightsDef {
  durationSec: number;
  bands: NightBand[];
  stations: NightTable<number>;
  spawn: {
    normal: NightSpawnCurve;
    climax: NightSpawnCurve;
    onlyHostileUntilSec: number;
    hostileRatio: NightTable<number>;
    roster: NightTable<EnemyId[]>;
  };
  parade: { fromNight: number; groupsByNight: NightTable<number>; sizeByNight: NightTable<number>; everySec: number; kinds: EnemyId[] };
  items: { firstSec: number; intervalStart: number; intervalPerNight: number; intervalFloor: number };
  runEvents: { darkWindFromNight: number; darkWindWeightMultiplierFromNight6: number };
  rescue: {
    /** 빛을 잃은 친구가 나타나는 진행 (옛 스테이지와 같은 30%) */
    atProgress: number;
    tori: { fromNight: number; chance: number; guaranteedNight: number };
    doto: { nightsAfterTori: number; chance: number; guaranteedAfter: number };
  };
  witch: { atSec: number; fromNight: number; chancePerNight: number; guaranteedNight: number; requiresFriends: CharacterId[]; oncePerRun: boolean };
  expand: { hostileRatioPerBanish: number; hostileRatioCap: number };
  testNights: number[];
}

/** 상점의 겉모습 (2026-11-18): 빛 색. 2026-11-23부터 별가루로 산다 — price 0 = 처음부터(호박빛) */
export interface LightColorDef {
  id: string;
  name: string;
  color: string;
  price: number;
}
export interface CosmeticsDef {
  lightColors: LightColorDef[];
}

export interface MapRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 마을 배치(map.json): 숨을 수 있는 풀숲, 지나갈 수 없는 장애물, 바닥 문양, 등불 스테이션 자리 후보 */
export interface MapDef {
  bushes: MapRect[];
  /**
   * wall·fence = 2026-11-13 미로 요소(브롤스타즈식 길목). house = 오두막 밑동(variant 0~2 그림, flip 좌우),
   * river = 강 구간(걷는 것은 못 건넘, 다리 자리는 비움) — 2026-11-13 라이언: 곳곳에 집·울타리·강·다리
   */
  obstacles: (MapRect & { kind: 'rocks' | 'barrels' | 'lamp' | 'wall' | 'fence' | 'house' | 'river'; variant?: number; flip?: boolean })[];
  /** 강 그림 (마을 위아래 끝까지 이어짐). 판정은 obstacles의 river 구간 */
  river?: { x: number; w: number };
  /** 다리 (판정 없음, 바닥 그림) */
  bridges?: MapRect[];
  rings: { x: number; y: number }[];
  stations: { x: number; y: number }[];
  /** 빛을 잃은 친구(토리·도토)가 기다리는 자리 후보 (2026-11-13) */
  friendSpots: { x: number; y: number }[];
  /** 테마별로 더하는 장애물·풀숲 (2026-11-18, systems/mapTheme.ts) */
  themes?: Record<string, { obstacles?: MapDef['obstacles']; bushes?: MapRect[] }>;
}

export function characterById(id: CharacterId): CharacterDef {
  const def = GameData.characters.find((c) => c.id === id);
  if (!def) throw new Error(`unknown character: ${id}`);
  return def;
}

export function enemyById(id: EnemyId): EnemyDef {
  const def = GameData.enemies.find((e) => e.id === id);
  if (!def) throw new Error(`unknown enemy: ${id}`);
  return def;
}

export function stageById(id: string): StageDef {
  return GameData.stages.find((s) => s.id === id) ?? GameData.stages[0];
}

/** 주인공 특성을 판에 쓰는 배율로 (해당 없는 배율은 1) */
export interface TraitEffects {
  /** 주변 빛 (루미 밤눈) */
  aura: number;
  /** 아이템 효과 (도토 볼주머니) */
  itemEffect: number;
  /** 이동 속도 (토리 빠른 발) */
  move: number;
  /** 꺼진 등불 점화 시간 (토리 빠른 발, 작을수록 빨리 켜짐) */
  ignite: number;
}

const traitCache = new Map<CharacterId, TraitEffects>();

export function traitOf(def: CharacterDef): TraitEffects {
  const hit = traitCache.get(def.id);
  if (hit) return hit;
  const p = def.traitParams;
  const fx: TraitEffects = {
    aura: def.trait === 'nightEyes' ? (p.auraMultiplier ?? 1) : 1,
    itemEffect: def.trait === 'cheekPouch' ? (p.itemEffectMultiplier ?? 1) : 1,
    move: def.trait === 'quickFeet' ? (p.moveMultiplier ?? 1) : 1,
    ignite: def.trait === 'quickFeet' ? (p.igniteMultiplier ?? 1) : 1,
  };
  traitCache.set(def.id, fx);
  return fx;
}

/** 이 판에서 구출할 친구. 고른 주인공이 그 친구 자신이면 없음 (2026-11-17: 토리로 2스테이지를 하면 토리가 토리를 구하던 모순) */
export function rescueFor(stage: StageDef, characterId: CharacterId): StageDef['rescue'] | null {
  const r = stage.rescue;
  if (!r) return null;
  return enemyById(r.enemyId).friend === characterId ? null : r;
}

/** 지금 게임에 나오는 적 */
export const IMPLEMENTED_ENEMIES: readonly EnemyId[] = GameData.enemies.filter((e) => e.implemented).map((e) => e.id);

/** 스테이지 길이로 하늘빛 시간대를 초 단위로 (NightClock 설정) */
export function nightConfig(stage: StageDef): { durationSec: number; phases: Record<PhaseId, [number, number]> } {
  const d = stage.durationSec;
  const p = GameData.game.stage.phases;
  const sec = (k: PhaseId): [number, number] => [p[k][0] * d, p[k][1] * d];
  return { durationSec: d, phases: { dusk: sec('dusk'), midnight: sec('midnight'), predawn: sec('predawn') } };
}
