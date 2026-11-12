// 콤보 (순수 로직). 2026-11-12 새 기획: 일정 시간(windowSec) 안에 여러 몹을 빛으로 처리하면 콤보가 쌓이고,
// 유지 중 얻는 모든 점수에 배율이 붙는다. 시간이 지나면 끝(lossMode 'reset' = 0, 'half' = 절반).
// 시너지 게이지·대광원은 새 기획에 없어 없앴다(2026-11-12, Claude 판단).
import type { ComboReason, GameBus } from '../core/events';
import type { GameConfig } from '../data';
import { multiplierFor } from './ScoreCalculator';

/** 콤보 연출 단계 (5·10·20·30에서 마을 불빛이 더 켜지고 큰 금빛 글자) */
export const COMBO_MILESTONES: readonly number[] = [5, 10, 20, 30];

/** 5·10·20·30, 그 뒤로는 10마다 (제안: 기획서에 없음 — 30 이후 연출 간격) */
export function isComboMilestone(combo: number): boolean {
  return COMBO_MILESTONES.includes(combo) || (combo > 30 && combo % 10 === 0);
}

type ComboCfg = GameConfig['combo'];

export class ComboSystem {
  combo = 0;
  maxCombo = 0;
  /** 마지막 처리 후 남은 유지 시간 */
  windowLeft = 0;
  /** 아이템 등으로 늘어나는 유지 시간 (Phase 4) */
  windowBonusSec = 0;

  constructor(
    private readonly cfg: ComboCfg,
    private readonly bus?: GameBus,
  ) {}

  get windowSec(): number {
    return this.cfg.windowSec + this.windowBonusSec;
  }

  get multiplier(): number {
    return multiplierFor(this.combo, this.cfg);
  }

  /** 몹 하나를 빛으로 처리(구출·돌려보냄). 증가 후 콤보를 돌려준다 */
  registerReturn(): number {
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.windowLeft = this.windowSec;
    this.emitCombo('gain');
    return this.combo;
  }

  update(dt: number): void {
    if (this.combo <= 0) return;
    this.windowLeft -= dt;
    if (this.windowLeft > 0) return;
    this.combo = this.cfg.lossMode === 'half' ? Math.floor(this.combo / 2) : 0;
    this.windowLeft = this.combo > 0 ? this.windowSec : 0;
    this.emitCombo('timeout');
  }

  reset(): void {
    this.combo = 0;
    this.maxCombo = 0;
    this.windowLeft = 0;
  }

  private emitCombo(reason: ComboReason): void {
    this.bus?.emit('combo:change', {
      combo: this.combo,
      multiplier: this.multiplier,
      reason,
      windowSec: this.windowSec,
    });
  }
}
