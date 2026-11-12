// 점수 계산 (순수 로직). 공식은 game.json combo·score 값을 따른다.
import type { GameConfig } from '../data';

type ComboCfg = GameConfig['combo'];
type ScoreCfg = GameConfig['score'];

/** 배율 = 1 + ⌊콤보 ÷ step⌋ × perStep, 최대 maxMultiplier */
export function multiplierFor(combo: number, cfg: ComboCfg): number {
  const m = 1 + Math.floor(Math.max(0, combo) / cfg.multiplierStep) * cfg.multiplierPerStep;
  return Math.min(cfg.maxMultiplier, m);
}

/**
 * 되돌림 1회 점수. combo는 이번 되돌림까지 센 값(증가 후)으로 계산한다
 * (제안: 기획서에 없음 — 증가 전/후 중 증가 후를 택함, 5번째 되돌림부터 배율이 오른다).
 */
export function returnPoints(enemyScore: number, combo: number, cfg: ComboCfg): number {
  return Math.round(enemyScore * multiplierFor(combo, cfg));
}

export class ScoreCalculator {
  total = 0;

  constructor(
    private readonly combo: ComboCfg,
    private readonly score: ScoreCfg,
  ) {}

  /** 얻은 점수를 돌려준다 */
  addReturn(enemyScore: number, combo: number): number {
    return this.add(returnPoints(enemyScore, combo, this.combo));
  }

  addItem(): number {
    return this.add(this.score.itemPickup);
  }

  /** 노월 되돌림: 배율 미적용 */
  addWitch(): number {
    return this.add(this.score.witchBonus);
  }

  addClear(lanternHp: number): number {
    return this.add(this.score.clearBase + Math.max(0, Math.round(lanternHp)) * this.score.clearPerLanternHp);
  }

  private add(points: number): number {
    this.total += points;
    return points;
  }
}
