// 런 = 끝없는 연속 밤 (2026-11-23 밤 나들이 v3, 정본 docs/design/NIGHT_RUN.md 4-2·4-3절) — 순수 로직.
//  - 밤 1부터. 아침마다 다음 밤으로 / 집으로. 하트는 밤 사이에 이어진다(game.json run.morningHeal 0)
//  - 완전 승리 = 하트 +1(최대 run.maxHearts) + 다음 밤 등불 하나 켜진 채(run.completeLitStations)
//  - 하트 0·중앙 광원 꺼짐 = 런 끝. 런 점수 = 밤 점수의 합
//  - 아침마다 저장(core/runSave.ts) — 런이 끝날 때 지운다(밤 도중에 나가면 그 밤을 처음부터, NIGHT_RUN.md 13절)
// '밤 n' 기록 = 아침을 맞은 밤 수(nights): 런 상태의 night은 다음에(또는 지금) 뛸 밤이라 늘 night − 1.
import type { CharacterId } from '../data';
import type { EndReason, StageOutcome } from './stageOutcome';
import { pathOf, type RunInfo, type RunPath } from './nightRules';

export interface RunStats {
  rescued: number;
  retreated: number;
  stationsLit: number;
  maxCombo: number;
  /** 런 전체에서 버틴 시간(초) */
  survivedSec: number;
  itemsUsed: number;
}

export interface RunData {
  v: 1;
  seed: number;
  characterId: CharacterId;
  /** 지금(또는 다음에) 뛸 밤 */
  night: number;
  hearts: number;
  /** 빛 레벨 ★ (런 안에서만, Phase 9) */
  level: number;
  xp: number;
  /** 런 전체의 자비 수 / 세 번 맞혀 돌려보낸 패시브 수 (두 길) */
  mercy: number;
  banish: number;
  /** 다음 밤에 켜진 채 시작하는 등불 수 (완전 승리) */
  carriedLitStations: number;
  /** 아침 상점 준비물: 이번 런 내내 / 다음 밤만 (Phase 9) */
  prep: string[];
  nextNightPrep: string[];
  /** 이번 런에 얻은 별가루 (Progress.dust에 이미 쌓인 것 포함, 표시용) */
  dustEarned: number;
  /** 아침을 맞은 밤들의 점수 합 */
  score: number;
  friendNights: Partial<Record<CharacterId, number>>;
  witchSeen: boolean;
  lastMapId: string | null;
  stats: RunStats;
}

/** 한 밤의 결과에서 런에 쌓을 것 */
export interface NightOutcome {
  outcome: StageOutcome;
  score: number;
  survivedSec: number;
  heartsLeft: number;
  rescued: number;
  retreated: number;
  stationsLit: number;
  maxCombo: number;
  mercy: number;
  itemsUsed: number;
  banish?: number;
  dust?: number;
  xp?: number;
  level?: number;
  /** 이 밤에 되찾은 친구 */
  friends?: CharacterId[];
  /** 이 밤에 노월이 왔는가 */
  witch?: boolean;
  mapId?: string | null;
}

export interface RunConfig {
  maxHearts: number;
  morningHeal: number;
  completeLitStations: number;
}

const EMPTY_STATS: RunStats = { rescued: 0, retreated: 0, stationsLit: 0, maxCombo: 0, survivedSec: 0, itemsUsed: 0 };

export function newRunData(seed: number, characterId: CharacterId, hearts: number): RunData {
  return {
    v: 1,
    seed: seed >>> 0,
    characterId,
    night: 1,
    hearts,
    level: 1,
    xp: 0,
    mercy: 0,
    banish: 0,
    carriedLitStations: 0,
    prep: [],
    nextNightPrep: [],
    dustEarned: 0,
    score: 0,
    friendNights: {},
    witchSeen: false,
    lastMapId: null,
    stats: { ...EMPTY_STATS },
  };
}

/** 밤 규칙(systems/nightRules.ts)에 넘길 것 */
export function runInfo(run: RunData): RunInfo {
  return { seed: run.seed, keeperId: run.characterId, friendNights: run.friendNights, witchSeen: run.witchSeen, lastMapId: run.lastMapId, mercy: run.mercy, banish: run.banish };
}

export function runPath(run: RunData): RunPath {
  return pathOf(run);
}

/** 아침을 맞은 밤 수 */
export function nightsCleared(run: RunData): number {
  return Math.max(0, run.night - 1);
}

/** 한 밤을 쌓는다 (이기든 지든 공통 — 밤 번호·하트는 그대로) */
export function recordNight(run: RunData, o: NightOutcome): RunData {
  const friendNights = { ...run.friendNights };
  for (const id of o.friends ?? []) if (friendNights[id] === undefined) friendNights[id] = run.night;
  const s = run.stats;
  return {
    ...run,
    score: run.score + Math.max(0, Math.round(o.score)),
    mercy: run.mercy + (o.mercy ?? 0),
    banish: run.banish + (o.banish ?? 0),
    dustEarned: run.dustEarned + (o.dust ?? 0),
    xp: o.xp ?? run.xp,
    level: o.level ?? run.level,
    friendNights,
    witchSeen: run.witchSeen || !!o.witch,
    lastMapId: o.mapId !== undefined ? o.mapId : run.lastMapId,
    stats: {
      rescued: s.rescued + o.rescued,
      retreated: s.retreated + o.retreated,
      stationsLit: s.stationsLit + o.stationsLit,
      maxCombo: Math.max(s.maxCombo, o.maxCombo),
      survivedSec: Math.round((s.survivedSec + o.survivedSec) * 10) / 10,
      itemsUsed: s.itemsUsed + o.itemsUsed,
    },
  };
}

/** 이긴 밤 → 아침: 쌓고, 하트(완전 승리 +1·아침 회복, 최대), 켜진 채 시작할 등불, 다음 밤으로 */
export function morningAfter(run: RunData, o: NightOutcome, cfg: RunConfig): RunData {
  if (o.outcome === 'over') throw new Error('morningAfter: 진 밤에는 아침이 없다');
  const r = recordNight(run, o);
  const complete = o.outcome === 'complete';
  return {
    ...r,
    night: run.night + 1,
    hearts: Math.min(cfg.maxHearts, Math.max(1, o.heartsLeft) + (complete ? 1 : 0) + cfg.morningHeal),
    carriedLitStations: complete ? cfg.completeLitStations : 0,
    nextNightPrep: [],
  };
}

/** 런의 끝: 결과 화면·지난 밤들·최고 기록 */
export interface RunSummary {
  outcome: 'over' | 'home';
  reason: EndReason | 'home';
  /** 런이 끝난 밤(패배) / 마지막으로 아침을 맞은 밤(집으로) */
  night: number;
  /** 아침을 맞은 밤 수 */
  nights: number;
  score: number;
  /** 마지막 밤에 버틴 시간 */
  lastSurvivedSec: number;
  stats: RunStats;
  mercy: number;
  banish: number;
  dust: number;
  path: RunPath;
  characterId: CharacterId;
  seed: number;
  level: number;
}

/** over = 진 밤까지 쌓은 런, home = 아침에 집으로 (run.night은 이미 다음 밤) */
export function summarize(run: RunData, outcome: 'over' | 'home', reason: EndReason | 'home', lastSurvivedSec: number): RunSummary {
  const nights = nightsCleared(run);
  return {
    outcome,
    reason,
    night: outcome === 'home' ? nights : run.night,
    nights,
    score: run.score,
    lastSurvivedSec,
    stats: { ...run.stats },
    mercy: run.mercy,
    banish: run.banish,
    dust: run.dustEarned,
    path: pathOf(run),
    characterId: run.characterId,
    seed: run.seed,
    level: run.level,
  };
}

const CHARS: readonly CharacterId[] = ['lumi', 'tori', 'doto'];
const isNum = (v: unknown, min = 0): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min;
const isStrList = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

/** 저장된 런 읽기: 모양이 틀리면 null (깨진 저장으로 판이 멈추지 않게) */
export function parseRun(raw: string | null): RunData | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as Partial<RunData>;
    if (r.v !== 1 || !isNum(r.seed) || !CHARS.includes(r.characterId as CharacterId)) return null;
    if (!isNum(r.night, 1) || !isNum(r.hearts, 1) || !isNum(r.level, 1) || !isNum(r.xp) || !isNum(r.mercy) || !isNum(r.banish)) return null;
    if (!isNum(r.carriedLitStations) || !isNum(r.dustEarned) || !isNum(r.score) || !isStrList(r.prep) || !isStrList(r.nextNightPrep)) return null;
    const s = r.stats as Partial<RunStats> | undefined;
    if (!s || !isNum(s.rescued) || !isNum(s.retreated) || !isNum(s.stationsLit) || !isNum(s.maxCombo) || !isNum(s.survivedSec) || !isNum(s.itemsUsed)) return null;
    const friendNights: Partial<Record<CharacterId, number>> = {};
    for (const [k, v] of Object.entries(r.friendNights ?? {})) if (CHARS.includes(k as CharacterId) && isNum(v, 1)) friendNights[k as CharacterId] = v;
    return {
      ...(r as RunData),
      night: Math.floor(r.night),
      friendNights,
      witchSeen: !!r.witchSeen,
      lastMapId: typeof r.lastMapId === 'string' ? r.lastMapId : null,
    };
  } catch {
    return null;
  }
}
