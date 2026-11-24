// 밤 n의 규칙 (2026-11-23 밤 나들이 v3, 정본 docs/design/NIGHT_RUN.md 4-1절) — 순수 로직.
// nights.json 표에서 밤 n의 StageDef와 같은 모양(+ 구간·맵·행렬·호스틸 비중·길·이벤트 조정)을 만든다.
//  - 표(stations·hostileRatio·roster·groupsByNight·sizeByNight)는 보간이 아니라 구간값: 밤 n 이하에서 가장 큰 키의 값
//  - 적 수·간격: 밤 1~3은 고정값(spawn.overrides), 밤 4부터 밤 3 값에서 이어지는 곡선(늘고 줄며 상한·하한) — 2026-11-24 다듬기 1차. 적 섞기는 로스터의 호스틸이 hostileRatio를, 잃어버린 주민이 나머지를 같은 몫으로
//  - 맵은 그 밤 구간의 풀에서 고르되 같은 맵이 두 밤 연속 나오지 않게, 구간에 맵이 없으면 바로 아래 구간에서
//  - 친구 구출·노월은 밤 시작 때 seed로 정한다(정해진 밤이면 반드시). 구출 밤에는 노월·어둠 바람이 없다
// 같은 런 seed·같은 밤이면 늘 같은 결과(nightSeed).
import { Rng } from '../core/rng';
import { GameData, enemyById, type BandId, type CharacterId, type EnemyId, type NightBand, type NightSpawnCurve, type NightSpawnFixed, type NightsDef, type NightTable, type SpawnTable, type StageDef } from '../data';
import type { EventMods, RunEventKind } from './runEvents';

/** 두 길: 지키는 길(자비 > 돌려보냄) · 넓히는 길(돌려보냄 > 자비) · 중립 */
export type RunPath = 'keep' | 'expand' | 'mixed';

export function pathOf(r: { mercy: number; banish: number }): RunPath {
  if (r.mercy > r.banish) return 'keep';
  if (r.banish > r.mercy) return 'expand';
  return 'mixed';
}

/** 노월의 모습 (NIGHT_RUN.md 8절): 넓히는 길 = 분노한 노월, 지키는 길·중립 = 찾아온 노월 */
export function witchFormOf(path: RunPath | undefined): 'calm' | 'angry' {
  return path === 'expand' ? 'angry' : 'calm';
}

/** 밤 규칙에 필요한 런의 상태 */
export interface RunInfo {
  seed: number;
  keeperId: CharacterId;
  /** 이번 런에 되찾은 친구와 되찾은 밤 */
  friendNights: Partial<Record<CharacterId, number>>;
  witchSeen: boolean;
  lastMapId: string | null;
  /** 런 전체의 자비 수 / 돌려보낸 패시브 수 */
  mercy: number;
  banish: number;
}

/** 어둠의 행렬 계획: 묶음 수 × 한 묶음 마릿수, everySec마다 */
export interface ParadePlan {
  groups: number;
  size: number;
  everySec: number;
  kinds: EnemyId[];
}

export interface NightDef extends StageDef {
  night: number;
  band: BandId;
  bandName: string;
  /** 격자 맵 id (Phase 10 전까지는 기록만) */
  mapId: string | null;
  parade: ParadePlan | null;
  hostileRatio: number;
  path: RunPath;
  eventMods: EventMods;
  /** 이 밤에 노월이 오는가 (boss에도 들어 있음) */
  witch: boolean;
}

/** 구간값 표에서 밤 n의 값 */
export function stepValue<T>(table: NightTable<T>, n: number): T {
  const keys = Object.keys(table)
    .map(Number)
    .filter((k) => Number.isFinite(k))
    .sort((a, b) => a - b);
  if (keys.length === 0) throw new Error('빈 구간 표');
  let pick = keys[0];
  for (const k of keys) if (k <= n) pick = k;
  return table[String(pick)];
}

/** 런 seed와 밤 번호(와 용도)로 그 밤의 seed */
export function nightSeed(seed: number, n: number, salt = 0): number {
  let h = (seed ^ Math.imul(n + 1, 0x9e3779b1) ^ Math.imul(salt + 7, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** 밤 n의 구간: 닿은 구간 중 맵이 있는 가장 깊은 곳(맵이 없는 구간은 바로 아래 구간) */
export function bandFor(n: number, nights: NightsDef = GameData.nights): NightBand {
  const reached = nights.bands.filter((b) => b.fromNight <= n).sort((a, b) => a.fromNight - b.fromNight);
  for (let i = reached.length - 1; i >= 0; i--) if (reached[i].maps.length > 0) return reached[i];
  return reached[0] ?? nights.bands[0];
}

/**
 * 밤 n에 고를 맵 풀: 그 구간의 맵. 단 맵이 한 장뿐인 구간은 첫 밤이 지나면 바로 아래 구간 맵도 섞는다
 * (2026-11-24 기본값 — C가 C1 한 장이라 밤 6부터 늘 같은 맵이 되지 않게, 첫 밤은 새 지역 카드대로 그 구간 맵)
 */
export function mapPoolFor(n: number, band: NightBand, nights: NightsDef = GameData.nights): string[] {
  if (band.maps.length !== 1 || n <= band.fromNight) return band.maps;
  const below = nights.bands.filter((b) => b.fromNight < band.fromNight && b.maps.length > 0).sort((a, b) => b.fromNight - a.fromNight)[0];
  return below ? [...band.maps, ...below.maps] : band.maps;
}

/** 같은 맵이 두 밤 연속 나오지 않게 (풀에 한 장이면 그 장) */
export function pickMap(pool: readonly string[], lastMapId: string | null, rng: Rng): string | null {
  const choices = pool.length > 1 ? pool.filter((m) => m !== lastMapId) : pool;
  return choices.length ? rng.pick(choices) : null;
}

/** 로스터를 호스틸 비중대로 나눈 가중치 (호스틸끼리·잃어버린 주민끼리 같은 몫) */
export function rosterWeights(roster: readonly EnemyId[], hostileRatio: number): Partial<Record<EnemyId, number>> {
  const hostiles = roster.filter((id) => enemyById(id).kind === 'hostile');
  const lost = roster.filter((id) => enemyById(id).kind === 'lost');
  const ratio = Math.min(1, Math.max(0, hostileRatio));
  const out: Partial<Record<EnemyId, number>> = {};
  const hostileShare = lost.length ? ratio : 1;
  const lostShare = hostiles.length ? 1 - ratio : 1;
  for (const id of hostiles) out[id] = hostileShare / hostiles.length;
  for (const id of lost) out[id] = lostShare / lost.length;
  return out;
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** 밤 n의 적 표 하나: 고정값(fixed)이 있으면 그 값, 아니면 fromNight부터의 곡선 */
export function spawnTable(c: NightSpawnCurve, n: number, weights: SpawnTable['weights'], fixed?: NightSpawnFixed): SpawnTable {
  if (fixed) return { maxAlive: fixed.maxAlive, intervalStart: fixed.interval[0], intervalEnd: fixed.interval[1], weights };
  const k = Math.max(0, n - c.fromNight);
  return {
    maxAlive: Math.min(c.maxAliveCap, Math.round(c.maxAliveStart + c.maxAlivePerNight * k)),
    intervalStart: r3(Math.max(c.intervalFloor[0], c.intervalStart[0] * c.intervalPerNight ** k)),
    intervalEnd: r3(Math.max(c.intervalFloor[1], c.intervalStart[1] * c.intervalPerNight ** k)),
    weights,
  };
}

/** 밤 n의 호스틸 비중 (넓히는 길이면 돌려보낸 패시브가 자비보다 많은 만큼 더함, 상한) */
export function hostileRatioFor(n: number, run: Pick<RunInfo, 'mercy' | 'banish'>, nights: NightsDef = GameData.nights): number {
  const base = stepValue(nights.spawn.hostileRatio, n);
  const extra = Math.min(nights.expand.hostileRatioCap, nights.expand.hostileRatioPerBanish * Math.max(0, run.banish - run.mercy));
  return Math.min(1, r3(base + extra));
}

/** 이번 런에 함께하는 친구인가 (고른 주인공이거나 이미 되찾음) */
function withYou(run: RunInfo, id: CharacterId): boolean {
  return run.keeperId === id || run.friendNights[id] !== undefined;
}

/** 이 밤에 되찾을 친구 (토리 → 도토 순, 한 밤에 하나) */
export function rescueFriendFor(n: number, run: RunInfo, nights: NightsDef = GameData.nights): CharacterId | null {
  const roll = new Rng(nightSeed(run.seed, n, 2)).next();
  const t = nights.rescue.tori;
  if (!withYou(run, 'tori')) return n >= t.fromNight && (n >= t.guaranteedNight || roll < t.chance) ? 'tori' : null;
  if (withYou(run, 'doto')) return null;
  const d = nights.rescue.doto;
  // 토리로 뛰는 런은 토리가 처음 나올 밤에 함께한 것으로 친다
  const toriNight = run.friendNights.tori ?? t.fromNight;
  const from = toriNight + d.nightsAfterTori;
  return n >= from && (n >= from + d.guaranteedAfter || roll < d.chance) ? 'doto' : null;
}

/** 이 밤에 노월이 오는가 (한 런에 한 번, 친구들이 함께일 때, 구출 밤이 아닐 때) */
export function witchComesOn(n: number, run: RunInfo, rescueNight: boolean, nights: NightsDef = GameData.nights): boolean {
  const w = nights.witch;
  if (rescueNight || n < w.fromNight) return false;
  if (w.oncePerRun && run.witchSeen) return false;
  if (!w.requiresFriends.every((id) => withYou(run, id))) return false;
  const roll = new Rng(nightSeed(run.seed, n, 3)).next();
  return n >= w.guaranteedNight || roll < w.chancePerNight;
}

/** 랜덤 이벤트 조정: 어둠 바람은 밤 2부터·밤 6부터 ×2, 지키는 길 = 어둠 바람 없음·작은 화해 ×2, 넓히는 길 = 반딧불 무리 없음, 구출 밤 = rescue.excludeEvents(어둠 바람) 없음 */
export function eventModsFor(n: number, path: RunPath, nights: NightsDef = GameData.nights, rescueNight = false): EventMods {
  const exclude: RunEventKind[] = rescueNight ? [...nights.rescue.excludeEvents] : [];
  const weightMul: Partial<Record<RunEventKind, number>> = {};
  if (n < nights.runEvents.darkWindFromNight) exclude.push('darkWind');
  if (n >= 6) weightMul.darkWind = nights.runEvents.darkWindWeightMultiplierFromNight6;
  if (path === 'keep') {
    exclude.push('darkWind');
    weightMul.gift = 2;
  } else if (path === 'expand') exclude.push('fireflies');
  return { exclude, weightMul };
}

export interface NightOptions {
  /** 테스트 메뉴에서 맵을 고름 */
  mapId?: string | null;
}

/** 밤 n의 규칙 */
export function rulesForNight(n: number, run: RunInfo, opts: NightOptions = {}, nights: NightsDef = GameData.nights): NightDef {
  const night = Math.max(1, Math.floor(n));
  const band = bandFor(night, nights);
  const path = pathOf(run);
  const mapId = opts.mapId !== undefined ? opts.mapId : pickMap(mapPoolFor(night, band, nights), run.lastMapId, new Rng(nightSeed(run.seed, night, 1)));
  const hostileRatio = hostileRatioFor(night, run, nights);
  const weights = rosterWeights(stepValue(nights.spawn.roster, night), hostileRatio);
  const friend = rescueFriendFor(night, run, nights);
  const witch = witchComesOn(night, run, friend !== null, nights);
  const p = nights.parade;
  const it = nights.items;
  const fixed = nights.spawn.overrides?.[String(night)];
  const climax = spawnTable(nights.spawn.climax, night, weights, fixed?.climax);
  // 구출 밤 동시 최대 배율 (다듬기 1차 (나) 클라이맥스 · 2차 보통 시간대 — 측정에서 필요할 때만 nights.json에 둔다)
  const cm = friend ? (nights.rescue.climaxMultiplier ?? 1) : 1;
  if (cm !== 1) climax.maxAlive = Math.max(1, Math.round(climax.maxAlive * cm));
  const normal = spawnTable(nights.spawn.normal, night, weights, fixed?.normal);
  const nm = friend ? (nights.rescue.normalMultiplier ?? 1) : 1;
  if (nm !== 1) normal.maxAlive = Math.max(1, Math.round(normal.maxAlive * nm));
  return {
    id: `night-${night}`,
    name: `밤 ${night}`,
    theme: band.theme,
    durationSec: nights.durationSec,
    stations: stepValue(nights.stations, night),
    spawn: {
      onlyHostileUntilSec: nights.spawn.onlyHostileUntilSec,
      normal,
      climax,
    },
    rescue: friend ? { enemyId: `${friend}-lost` as EnemyId, atProgress: nights.rescue.atProgress } : undefined,
    boss: witch ? { enemyId: 'witch', atSec: nights.witch.atSec } : undefined,
    items: { firstSec: it.firstSec, intervalSec: Math.max(it.intervalFloor, it.intervalStart + it.intervalPerNight * (night - 1)) },
    blurb: band.name,
    night,
    band: band.id,
    bandName: band.name,
    mapId,
    parade: night >= p.fromNight ? { groups: stepValue(p.groupsByNight, night), size: stepValue(p.sizeByNight, night), everySec: p.everySec, kinds: [...p.kinds] } : null,
    hostileRatio,
    path,
    eventMods: eventModsFor(night, path, nights, friend !== null),
    witch,
  };
}

/** 밤 n이 그 구간에 처음 닿는 밤인가 (새 지역 — 구간의 fromNight이고 맵이 있을 때) */
export function firstNightOfBand(n: number, nights: NightsDef = GameData.nights): NightBand | null {
  const band = bandFor(n, nights);
  return band.fromNight === n ? band : null;
}
