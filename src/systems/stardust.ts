// 별가루 ✦ (2026-11-23 밤 나들이 v3, NIGHT_RUN.md 6-2절) — 순수 로직. 돈: 아침 준비물·빛 색을 산다.
//  - 한 밤 동안 모은다: 등불 켜기 2 · 구출 1 · 자비 1 · 노월 진정 20, 밤 끝에 승리 5 / 완전 승리 10 (game.json dust)
//  - 아침(또는 런의 끝)에 Progress.dust에 쌓여 런이 끝나도 남는다(core/runFlow.ts). 패시브 돌려보냄은 별가루 없음
import type { GameConfig } from '../data';
import type { StageOutcome } from './stageOutcome';

export type DustCfg = GameConfig['dust'];
export type DustSource = 'station' | 'rescue' | 'mercy' | 'witch';

export class DustTally {
  total = 0;

  constructor(private readonly cfg: DustCfg) {}

  add(source: DustSource, count = 1): number {
    const gain = this.cfg[source] * count;
    this.total += gain;
    return gain;
  }

  /** 밤의 끝: 승리 5 / 완전 승리 10 / 오늘은 여기까지 0 */
  finish(outcome: StageOutcome): number {
    const gain = outcome === 'complete' ? this.cfg.complete : outcome === 'victory' ? this.cfg.victory : 0;
    this.total += gain;
    return gain;
  }
}
