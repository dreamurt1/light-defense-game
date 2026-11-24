// 런의 밤 한 판 (2026-11-23 밤 나들이 v3) — PlayScene을 600줄 아래로 유지하려고 떼어 낸 조립 조각.
//  - 이번 판의 규칙: 런의 밤이면 밤 n(systems/nightRules.ts), 아니면 stages.json(튜토리얼·트라이얼)
//  - 밤을 시작할 때의 하트(밤 사이에 이어짐)·켜진 채 시작할 등불(완전 승리 보상)
//  - HUD 점수 = 런 누적(정식 런), 결과에 덧붙일 밤 번호·맵·되찾은 친구·노월
//  - 빛 레벨 ★(경험치·효과, systems/growth.ts)·별가루 ✦(systems/stardust.ts)·아침 준비물 효과(systems/shop.ts) — Phase 9
import { bus, type GameEvents, type RunResult } from '../../core/events';
import { RunState } from '../../core/RunState';
import { Progress } from '../../core/Progress';
import { GameData, stageById, type CharacterId, type StageDef } from '../../data';
import { rulesForNight, type NightDef } from '../../systems/nightRules';
import { runInfo } from '../../systems/nightRun';
import { addXp, growthEffects, xpNeed, type GrowthEffects, type GrowthState, type XpSource } from '../../systems/growth';
import { DustTally, type DustSource } from '../../systems/stardust';
import { prepEffects, type PrepEffects } from '../../systems/shop';
import type { StageOutcome } from '../../systems/stageOutcome';

const G = GameData.game;
/** 빛의 부적 기본 수 (items.json light_charm.perStage) */
const CHARMS = Number(GameData.items.find((i) => i.id === 'light_charm')?.perStage ?? 1);

/** 이번 판의 규칙 */
export function stageDefFor(): StageDef {
  const run = RunState.run;
  if (RunState.isNight && run) return rulesForNight(run.night, runInfo(run), RunState.test && RunState.testMapId ? { mapId: RunState.testMapId } : {});
  return stageById(RunState.stageId);
}

export function isNightDef(s: StageDef): s is NightDef {
  return typeof (s as Partial<NightDef>).night === 'number';
}

export class NightRun {
  /** 런의 밤이면 그 밤의 규칙 */
  readonly def: NightDef | null;
  private readonly friends: CharacterId[] = [];
  private readonly offs: (() => void)[];
  /** 빛 레벨 (런의 밤이면 런에서 이어받음) */
  private growth: GrowthState;
  /** 이번 밤의 별가루 */
  readonly dust = new DustTally(G.dust);
  /** 지금 레벨의 효과 */
  effects: GrowthEffects;
  /** 이번 밤에 효력이 있는 준비물 */
  readonly prep: PrepEffects;
  /** 레벨이 올라 효과가 바뀜 → 판이 배율을 다시 건다 */
  onGrowth: (() => void) | null = null;

  constructor(
    stage: StageDef,
    private readonly keeperId: CharacterId,
  ) {
    this.def = isNightDef(stage) ? stage : null;
    const run = this.def ? RunState.run : null;
    this.growth = { level: run?.level ?? 1, xp: run?.xp ?? 0 };
    this.effects = growthEffects(this.growth.level, keeperId, G.growth);
    this.prep = prepEffects(run, GameData.shop.prep, { itemSlots: G.items.slots, charms: CHARMS });
    this.offs = [
      bus.on('friend:rescued', (e) => {
        if (!this.friends.includes(e.characterId)) this.friends.push(e.characterId);
      }),
    ];
    if (!this.def) return;
    // 경험치·별가루: 처리마다 (패시브 돌려보냄은 별가루 없음)
    this.offs.push(
      bus.on('enemy:returned', (e) => {
        if (e.kind === 'lost') this.gain('rescue', 'rescue');
        else if (e.kind === 'hostile') this.gain('returnHostile');
        else if (e.kind === 'passive') this.gain('banishPassive');
      }),
      bus.on('station:lit', () => this.gain('station', 'station')),
      bus.on('mercy:gain', () => this.gain('mercy', 'mercy')),
      bus.on('witch:returned', () => this.gain(null, 'witch')),
    );
  }

  dispose(): void {
    this.offs.forEach((off) => off());
  }

  get level(): number {
    return this.growth.level;
  }

  private gain(xp: XpSource | null, dust?: DustSource): void {
    if (dust) {
      this.dust.add(dust);
      bus.emit('dust:change', { dust: this.dustShown });
    }
    if (!xp) return;
    const next = addXp(this.growth, G.growth.xp[xp], G.growth);
    this.growth = { level: next.level, xp: next.xp };
    if (next.dust > 0) {
      this.dust.addRaw(next.dust);
      bus.emit('dust:change', { dust: this.dustShown });
    }
    if (next.ups > 0) {
      this.effects = growthEffects(next.level, this.keeperId, G.growth);
      this.onGrowth?.();
    }
    bus.emit('growth:change', { level: next.level, xp: next.xp, need: xpNeed(next.level, G.growth), ups: next.ups });
  }

  /** HUD의 별가루: 정식 런이면 잔액 + 이번 밤 */
  private get dustShown(): number {
    return (RunState.isRealRun ? Progress.data.dust : 0) + this.dust.total;
  }

  /** 밤을 시작할 때의 하트 */
  get hearts(): number {
    return this.def && RunState.run ? RunState.run.hearts : GameData.game.stage.hearts;
  }

  /** 켜진 채 시작할 등불 수 */
  get litAtStart(): number {
    return this.def && RunState.run ? RunState.run.carriedLitStations : 0;
  }

  /** HUD 점수 바탕 = 앞 밤들의 점수 합 (정식 런만) */
  get scoreBase(): number {
    return this.def && RunState.isRealRun && RunState.run ? RunState.run.score : 0;
  }

  emitScore(nightTotal: number, gained: number): void {
    bus.emit('score:change', { score: this.scoreBase + nightTotal, gained });
  }

  /** run:start에 덧붙임: 밤 번호·빛 레벨·별가루 잔액·구간 이름·길 */
  startInfo(): Pick<GameEvents['run:start'], 'night' | 'level' | 'dust' | 'band' | 'path'> {
    if (!this.def) return {};
    return { night: this.def.night, level: this.growth.level, dust: this.dustShown, band: this.def.bandName, path: this.def.path };
  }

  /** 결과에 덧붙임 (밤의 끝에 한 번 — 승리면 별가루 보너스) */
  extras(outcome: StageOutcome): Partial<RunResult> {
    if (!this.def) return {};
    this.dust.finish(outcome);
    return { night: this.def.night, mapId: this.def.mapId, friends: [...this.friends], witch: this.def.witch, banish: 0, dust: this.dust.total, xp: this.growth.xp, level: this.growth.level };
  }
}
