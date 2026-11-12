// LP(Light Point): 빛 공격에 쓰는 루미의 자원 (순수 로직, 2026-11-12 새 기획). 수치는 game.json lp (제안).
//  - 최소 min(광도 '낮음')보다 내려가지 않는다. 최소에서도 쏠 수 있지만 사거리·위력이 weakest배까지 약해진다
//  - 회복: 중앙 광원 곁 > 켜진 등불 곁 > 그 밖(자연). 곁에 있으면 가장 빠른 것 하나만
//  - 일반 피격은 LP를 줄이지 않는다
import type { GameConfig } from '../data';

type LpCfg = GameConfig['lp'];

export type LpZone = 'central' | 'station' | 'field';

export class LightPoints {
  value: number;

  constructor(private readonly cfg: LpCfg) {
    this.value = cfg.start;
  }

  get min(): number {
    return this.cfg.min;
  }

  get max(): number {
    return this.cfg.max;
  }

  /** 0(최소) ~ 1(가득) */
  get ratio(): number {
    return (this.value - this.cfg.min) / (this.cfg.max - this.cfg.min);
  }

  /** 사거리·위력 배율: 가득 차면 1, 최소면 weakest */
  get effectiveness(): number {
    return this.cfg.weakest + (1 - this.cfg.weakest) * Math.min(1, Math.max(0, this.ratio));
  }

  spend(amount: number): void {
    this.value = Math.max(this.cfg.min, this.value - amount);
  }

  restore(amount: number): void {
    this.value = Math.min(this.cfg.max, this.value + amount);
  }

  update(dt: number, zone: LpZone): void {
    const rate = zone === 'central' ? this.cfg.centralRegenPerSec : zone === 'station' ? this.cfg.stationRegenPerSec : this.cfg.regenPerSec;
    this.restore(rate * dt);
  }
}
