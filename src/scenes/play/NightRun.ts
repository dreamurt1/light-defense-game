// 런의 밤 한 판 (2026-11-23 밤 나들이 v3) — PlayScene을 600줄 아래로 유지하려고 떼어 낸 조립 조각.
//  - 이번 판의 규칙: 런의 밤이면 밤 n(systems/nightRules.ts), 아니면 stages.json(튜토리얼·트라이얼)
//  - 밤을 시작할 때의 하트(밤 사이에 이어짐)·켜진 채 시작할 등불(완전 승리 보상)
//  - HUD 점수 = 런 누적(정식 런), 결과에 덧붙일 밤 번호·맵·되찾은 친구·노월
import { bus, type GameEvents, type RunResult } from '../../core/events';
import { RunState } from '../../core/RunState';
import { Progress } from '../../core/Progress';
import { GameData, stageById, type CharacterId, type StageDef } from '../../data';
import { rulesForNight, type NightDef } from '../../systems/nightRules';
import { runInfo } from '../../systems/nightRun';

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
  private readonly off: () => void;

  constructor(stage: StageDef) {
    this.def = isNightDef(stage) ? stage : null;
    this.off = bus.on('friend:rescued', (e) => {
      if (!this.friends.includes(e.characterId)) this.friends.push(e.characterId);
    });
  }

  dispose(): void {
    this.off();
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

  /** run:start에 덧붙임: 밤 번호·빛 레벨·별가루 잔액 */
  startInfo(): Pick<GameEvents['run:start'], 'night' | 'level' | 'dust'> {
    if (!this.def) return {};
    return { night: this.def.night, level: RunState.run?.level ?? 1, dust: RunState.isRealRun ? Progress.data.dust : 0 };
  }

  /** 결과에 덧붙임 */
  extras(): Partial<RunResult> {
    if (!this.def) return {};
    return { night: this.def.night, mapId: this.def.mapId, friends: [...this.friends], witch: this.def.witch, banish: 0, dust: 0, xp: RunState.run?.xp, level: RunState.run?.level };
  }
}
