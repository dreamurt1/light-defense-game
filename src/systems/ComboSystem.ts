// 콤보와 시너지 게이지 (순수 로직). 감소는 피격·유지 시간 초과 모두 절반(소수점 버림).
import type { ComboReason, GameBus } from '../core/events';
import type { GameConfig } from '../data';
import { multiplierFor } from './ScoreCalculator';

/** 콤보 연출 단계 (스킬 gameplay-systems.md: 5·10·20·30에서 등불이 커지고 배경 불빛이 더 켜진다) */
export const COMBO_MILESTONES: readonly number[] = [5, 10, 20, 30];

/** 5·10·20·30, 그 뒤로는 10마다 (제안: 기획서에 없음 — 30 이후 연출 간격) */
export function isComboMilestone(combo: number): boolean {
  return COMBO_MILESTONES.includes(combo) || (combo > 30 && combo % 10 === 0);
}

export interface ComboConfig {
  combo: GameConfig['combo'];
  synergy: GameConfig['synergy'];
}

export class ComboSystem {
  combo = 0;
  maxCombo = 0;
  synergy = 0;
  /** 마지막 되돌림 후 남은 유지 시간 */
  windowLeft = 0;
  /** 별 목걸이 등 장착물 보너스(M3) */
  windowBonusSec = 0;
  synergyBonusPerReturn = 0;

  constructor(
    private readonly cfg: ComboConfig,
    private readonly bus?: GameBus,
  ) {}

  get windowSec(): number {
    return this.cfg.combo.windowSec + this.windowBonusSec;
  }

  get multiplier(): number {
    return multiplierFor(this.combo, this.cfg.combo);
  }

  /** 되돌림 1회. 증가 후 콤보를 돌려준다 */
  registerReturn(): number {
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.windowLeft = this.windowSec;
    this.emitCombo('gain');

    const s = this.cfg.synergy;
    const gain = this.combo >= s.highComboThreshold ? s.gainPerReturnHighCombo : s.gainPerReturn;
    this.addSynergy(gain + this.synergyBonusPerReturn);
    return this.combo;
  }

  /** 악당이 등불에 처음 닿았을 때 */
  registerLanternHit(): void {
    if (this.combo === 0) return;
    this.halve('hit');
  }

  update(dt: number): void {
    if (this.combo > 0) {
      this.windowLeft -= dt;
      if (this.windowLeft <= 0) {
        this.halve('timeout');
        this.windowLeft = this.combo > 0 ? this.windowSec : 0;
      }
    }

    if (this.synergy > 0) {
      const before = Math.floor(this.synergy);
      this.synergy = Math.max(0, this.synergy - this.cfg.synergy.decayPerSec * dt);
      if (Math.floor(this.synergy) !== before) this.bus?.emit('synergy:change', { value: this.synergy });
    }
  }

  reset(): void {
    this.combo = 0;
    this.maxCombo = 0;
    this.synergy = 0;
    this.windowLeft = 0;
  }

  private halve(reason: Exclude<ComboReason, 'gain'>): void {
    this.combo = Math.floor(this.combo / 2);
    this.emitCombo(reason);
  }

  private addSynergy(amount: number): void {
    this.synergy = Math.min(this.cfg.synergy.max, this.synergy + amount);
    if (this.synergy >= this.cfg.synergy.max) {
      this.synergy = 0;
      this.bus?.emit('synergy:burst');
    }
    this.bus?.emit('synergy:change', { value: this.synergy });
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
