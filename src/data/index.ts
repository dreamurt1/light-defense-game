// 밸런스 원본: 수치는 여기 JSON에서만 바꾼다(스킬 assets/data/에 복사본, npm run doc:skill).
// 2026-11-12 새 기획(XMind 1112): 스테이지·주인공 HP/하트/LP·중앙 광원·등불 스테이션·적 세 무리.
import gameJson from './game.json';
import charactersJson from './characters.json';
import enemiesJson from './enemies.json';
import itemsJson from './items.json';
import stagesJson from './stages.json';
import mapJson from './map.json';

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
  controls: { deadzone: number; mouseCancelRadius: number };
  /** 스테이지 공통: 클라이맥스 시작 비율, 하트 수, 하늘빛 시간대(비율) */
  stage: { climaxAt: number; hearts: number; phases: Record<PhaseId, [number, number]> };
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
    start: number;
    max: number;
    outAt: number;
    growPerSec: number;
    healRadius: number;
    glowMin: number;
    glowMax: number;
  };
  station: {
    radius: number;
    footprint: Footprint;
    off: number;
    on: number;
    igniteSec: number;
    damageMultiplier: number;
    healRadius: number;
    glowMin: number;
    glowMax: number;
  };
  /** 루미 주변 빛(LP에 비례, 스테이지가 흐를수록 넓어짐) */
  aura: { glowMin: number; glowMax: number; growWithProgress: number };
  /** closeAggro·stuckSec·detour* = 2026-11-13 역할별 호스틸·미로 벽 우회 */
  enemyAi: { aggroRadius: number; retargetSec: number; detachRatio: number; closeAggro: number; stuckSec: number; detourDist: number; detourSec: number };
  light: {
    mode: 'aimStick';
    fanDeg: number;
    cooldownSec: number;
    expandSec: number;
    knockback: number;
    stunSec: number;
  };
  combo: {
    windowSec: number;
    lossMode: 'half' | 'reset';
    multiplierStep: number;
    multiplierPerStep: number;
    maxMultiplier: number;
  };
  score: { station: number; mercy: number; itemPickup: number; clearBase: number; completeMultiplier: number; orbPop: number };
  playfield: { margin: number };
  items: { lifetimeSec: number; blinkLastSec: number; maxGround: number; slots: number; pickRadius: number; spawnRingMin: number; spawnRingMax: number };
  /** 패시브 주민 (2026-11-13): 나타나는 거리·피하기·분노 */
  passive: { spawnMinDist: number; shyDist: number; shySpeedMultiplier: number; angryDamage: number; angrySpeedMultiplier: number };
  /** 노월 (2026-11-13, scenes/play/Boss.ts) */
  boss: {
    orbitRx: number;
    orbitRy: number;
    orbitSpeed: number;
    enterSec: number;
    hitRadius: number;
    summonEverySec: number;
    summonCount: number;
    summonCap: number;
    orbEverySec: number;
    orbSpeed: number;
    orbDamage: number;
    orbRadius: number;
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
  trait: 'nightEyes' | 'quickPaw' | 'cheekPouch';
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
  /** 연습장 (홈 테스트 = 스타파크식): 끝나지 않음, 적 적게 */
  practice?: boolean;
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
};

export interface MapRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 마을 배치(map.json): 숨을 수 있는 풀숲, 지나갈 수 없는 장애물, 바닥 문양, 등불 스테이션 자리 후보 */
export interface MapDef {
  bushes: MapRect[];
  /** wall·fence = 2026-11-13 미로 요소(브롤스타즈식 길목) */
  obstacles: (MapRect & { kind: 'rocks' | 'barrels' | 'lamp' | 'wall' | 'fence' })[];
  rings: { x: number; y: number }[];
  stations: { x: number; y: number }[];
  /** 빛을 잃은 친구(토리·도토)가 기다리는 자리 후보 (2026-11-13) */
  friendSpots: { x: number; y: number }[];
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

/** 지금 게임에 나오는 적 */
/** 스테이지 순서 (선택 화면·진행) */
export const STAGE_ORDER = ['stage-1', 'stage-2', 'stage-3', 'stage-4'] as const;

export const IMPLEMENTED_ENEMIES: readonly EnemyId[] = GameData.enemies.filter((e) => e.implemented).map((e) => e.id);

/** 스테이지 길이로 하늘빛 시간대를 초 단위로 (NightClock 설정) */
export function nightConfig(stage: StageDef): { durationSec: number; phases: Record<PhaseId, [number, number]> } {
  const d = stage.durationSec;
  const p = GameData.game.stage.phases;
  const sec = (k: PhaseId): [number, number] => [p[k][0] * d, p[k][1] * d];
  return { durationSec: d, phases: { dusk: sec('dusk'), midnight: sec('midnight'), predawn: sec('predawn') } };
}
