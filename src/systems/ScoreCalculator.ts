// 점수 계산 (순수 로직). 공식은 game.json combo·score와 enemies.json score를 따른다.
// 2026-11-12 새 기획: 등불 켜기(낮음) < 호스틸(기본) < 잃어버린 주민(높음), 자비 > 호스틸, 보스 최고.
// 콤보 유지 중 얻는 모든 점수에 배율. 완전 승리면 총점 × completeMultiplier(2~3배, 제안 2.5).
import type { GameConfig } from '../data';

type ComboCfg = GameConfig['combo'];
type ScoreCfg = GameConfig['score'];

/** 배율 = 1 + ⌊콤보 ÷ step⌋ × perStep, 최대 maxMultiplier */
export function multiplierFor(combo: number, cfg: ComboCfg): number {
  const m = 1 + Math.floor(Math.max(0, combo) / cfg.multiplierStep) * cfg.multiplierPerStep;
  return Math.min(cfg.maxMultiplier, m);
}

/** 점수 × 그때 콤보의 배율 (몹을 처리한 점수는 이번 처리까지 센 콤보로) */
export function returnPoints(points: number, combo: number, cfg: ComboCfg): number {
  return Math.round(points * multiplierFor(combo, cfg));
}

export class ScoreCalculator {
  total = 0;

  constructor(
    private readonly combo: ComboCfg,
    private readonly score: ScoreCfg,
  ) {}

  /** 몹을 빛으로 처리(구출·돌려보냄·보스): 몹 점수 × 콤보 배율. 얻은 점수를 돌려준다 */
  addReturn(enemyScore: number, combo: number): number {
    return this.add(returnPoints(enemyScore, combo, this.combo));
  }

  /** 등불을 켬 */
  addStation(combo: number): number {
    return this.add(returnPoints(this.score.station, combo, this.combo));
  }

  /** 자비 (Phase 3) */
  addMercy(combo: number): number {
    return this.add(returnPoints(this.score.mercy, combo, this.combo));
  }

  addItem(combo: number): number {
    return this.add(returnPoints(this.score.itemPickup, combo, this.combo));
  }

  /** 아침까지 버팀 */
  addClear(): number {
    return this.add(this.score.clearBase);
  }

  /** 완전 승리: 총점에 배율. 늘어난 만큼을 돌려준다 */
  applyComplete(): number {
    const before = this.total;
    this.total = Math.round(this.total * this.score.completeMultiplier);
    return this.total - before;
  }

  private add(points: number): number {
    this.total += points;
    return points;
  }
}
