// 아침 상점 (2026-11-23 밤 나들이 v3, NIGHT_RUN.md 6-3절) — 순수 로직. 별가루로 이번 나들이(런) 동안만 쓰는 준비물을 산다.
//  - perRun 1(등불 기름·여분 하트·큰 주머니) = 한 런에 한 번, 그 런 내내 효력 → run.prep
//  - perRun 0(빛의 부적 하나 더) = 아침마다 살 수 있고 다음 밤만 → run.nextNightPrep (밤이 지나면 비움, systems/nightRun.ts)
//  - 여분 하트는 사는 순간 하트 +1 (최대 run.maxHearts)
import type { PrepDef } from '../data';
import type { RunData } from './nightRun';

export type BuyCheck = 'ok' | 'owned' | 'short';

/** 살 수 있는지: 이미 가진 한 번짜리 / 별가루가 모자람 / 살 수 있음 */
export function canBuy(def: PrepDef, run: RunData, dust: number): BuyCheck {
  if (def.perRun === 1 && run.prep.includes(def.id)) return 'owned';
  if (dust < def.price) return 'short';
  return 'ok';
}

/** 산 뒤의 런 (별가루는 Progress.spendDust가 뺀다) */
export function buyPrep(def: PrepDef, run: RunData, maxHearts: number): RunData {
  const hearts = def.effect.hearts ? Math.min(maxHearts, run.hearts + def.effect.hearts) : run.hearts;
  if (def.perRun === 1) return { ...run, prep: [...run.prep, def.id], hearts };
  return { ...run, nextNightPrep: [...run.nextNightPrep, def.id], hearts };
}

export interface PrepEffects {
  /** 켜진 등불이 초당 줄어드는 양 (없으면 game.json station.decayPerSec) */
  stationDecayPerSec: number | null;
  /** 아이템 칸 수 */
  itemSlots: number;
  /** 밤을 시작할 때 갖는 빛의 부적 수 */
  charms: number;
}

/** 이번 밤에 효력이 있는 준비물의 효과 (기본 칸·부적 수에서) */
export function prepEffects(run: Pick<RunData, 'prep' | 'nextNightPrep'> | null, defs: readonly PrepDef[], base: { itemSlots: number; charms: number }): PrepEffects {
  const out: PrepEffects = { stationDecayPerSec: null, itemSlots: base.itemSlots, charms: base.charms };
  if (!run) return out;
  for (const id of [...run.prep, ...run.nextNightPrep]) {
    const e = defs.find((d) => d.id === id)?.effect;
    if (!e) continue;
    if (e.stationDecayPerSec !== undefined) out.stationDecayPerSec = e.stationDecayPerSec;
    if (e.itemSlots !== undefined) out.itemSlots = Math.max(out.itemSlots, e.itemSlots);
    if (e.charmPerStage !== undefined) out.charms = Math.max(out.charms, e.charmPerStage);
  }
  return out;
}
