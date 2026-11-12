// 밸런스 원본: light-defense-game 스킬 assets/data/*.json 복사본. 수치는 여기 JSON에서만 바꾼다.
import gameJson from './game.json';
import charactersJson from './characters.json';
import enemiesJson from './enemies.json';
import itemsJson from './items.json';
import equipmentJson from './equipment.json';
import wavesJson from './waves.json';
import mapJson from './map.json';

export type CharacterId = 'lumi' | 'tori' | 'doto' | 'baru' | 'mong';
export type EnemyId = 'bat' | 'croc' | 'slime' | 'ghost' | 'hyena' | 'witch';
export type PhaseId = 'dusk' | 'midnight' | 'predawn';
export type NightPhase = PhaseId | 'dawn';

export interface GameConfig {
  /** 세로 540×960. 가로(2026-11-06)는 높이 540 고정, 폭은 화면 비율(720~1280) — core/layout.ts */
  viewport: { width: number; height: number; orientation: 'portrait'; landscape: { height: number; minWidth: number; maxWidth: number } };
  /** 마을(월드) 크기. 카메라가 등불지기를 따라간다 */
  world: { width: number; height: number };
  /** 등불지기 이동: 속도(px/초), 장애물 판정 반지름, 마을 둘레에서 걷지 못하는 폭(위는 집 줄, 옆·아래는 덤불 띠) */
  keeper: { moveSpeed: number; radius: number; walkInset: { top: number; side: number; bottom: number } };
  /** 풀숲에 숨기: 이웃이 알아채는 거리, 빛을 쏘면 드러나는 시간, 숨었을 때 등불지기·풀숲 불투명도 */
  /** 숨었을 때 못 본 이웃은 마을을 맴돈다(2026-11-06): 속도 배율, 다음 지점까지 거리 범위 */
  hide: { revealDist: number; revealAfterFireSec: number; keeperAlpha: number; bushAlphaInside: number; roamSpeed: number; roamMin: number; roamMax: number };
  /** 두 스틱: 데드존(반지름 대비) */
  controls: { deadzone: number; mouseCancelRadius: number };
  lantern: {
    /** 시작 위치 (등불지기가 들고 다닌다) */
    x: number;
    y: number;
    radius: number;
    maxHp: number;
    lowHpRatio: number;
    glowMin: number;
    glowMax: number;
  };
  night: { durationSec: number; phases: Record<PhaseId, [number, number]> };
  /** 마을 분위기 (2026-11-06): 밤이 흐를수록 밝아짐, 등불이 맞을수록 어두워짐 — systems/villageMood.ts */
  village: { brightenMax: number; brightenPower: number; gloomBase: number; gloomGrowth: number };
  light: {
    mode: 'aimStick';
    fanDeg: number;
    cooldownSec: number;
    expandSec: number;
    knockback: number;
    stunSec: number;
    burstPowerMultiplier: number;
    burstKnockback: number;
    burstFlashSec: number;
  };
  combo: {
    windowSec: number;
    lossMode: 'half';
    multiplierStep: number;
    multiplierPerStep: number;
    maxMultiplier: number;
  };
  synergy: {
    max: number;
    gainPerReturn: number;
    gainPerReturnHighCombo: number;
    highComboThreshold: number;
    decayPerSec: number;
  };
  score: { itemPickup: number; witchBonus: number; clearBase: number; clearPerLanternHp: number };
  playfield: { margin: number };
  items: { lifetimeSec: number; blinkLastSec: number; spawnRadiusMin: number; spawnRadiusMax: number };
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
  trait: 'nightEyes' | 'quickPaw' | 'cheekPouch' | 'warmth' | 'bark';
  traitParams: Record<string, number>;
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
  name: string;
  nameEn: string;
  animal: string;
  boss?: boolean;
  hp: number;
  speed: number;
  lanternDamage: number;
  damageTickSec: number;
  score: number;
  radius: number;
  knockbackMultiplier?: number;
  colorDark: string;
  colorTrue: string;
  behavior: string;
  behaviorParams?: Record<string, number | boolean>;
  group?: EnemyGroup;
}

export interface WavePhaseDef {
  id: PhaseId;
  from: number;
  to: number;
  maxAlive: number;
  spawnIntervalStart: number;
  spawnIntervalEnd: number;
  weights: Partial<Record<EnemyId, number>>;
  rules?: { onlyBatUntilSec?: number; slimeFromSec?: number };
  hazards?: Record<string, { everySec: number; durationSec: number }>;
  boss?: EnemyId;
}

export interface WavesDef {
  phases: WavePhaseDef[];
  hazards: Record<string, Record<string, number>>;
}

export interface ItemDef {
  id: string;
  name: string;
  effect: string;
  dropChance: number;
  periodicSpawnSec: number;
  color: string;
  [key: string]: string | number;
}

export interface EquipmentDef {
  id: string;
  name: string;
  giver: string;
  line: string;
  effect: Record<string, number>;
}

// JSON 추론 타입(튜플·선택 필드)이 인터페이스와 정확히 맞지 않아 unknown을 거쳐 붙인다
export const GameData = {
  game: gameJson as unknown as GameConfig,
  characters: charactersJson as unknown as CharacterDef[],
  enemies: enemiesJson as unknown as EnemyDef[],
  items: itemsJson as unknown as ItemDef[],
  equipment: equipmentJson as unknown as EquipmentDef[],
  waves: wavesJson as unknown as WavesDef,
  map: mapJson as unknown as MapDef,
};

export interface MapRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 마을 배치(map.json): 숨을 수 있는 풀숲, 지나갈 수 없는 장애물, 바닥 문양 */
export interface MapDef {
  bushes: MapRect[];
  obstacles: (MapRect & { kind: 'rocks' | 'barrels' | 'lamp' })[];
  rings: { x: number; y: number }[];
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
