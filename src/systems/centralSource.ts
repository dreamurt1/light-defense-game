// 중앙 광원 (순수 로직, 2026-11-12 새 기획): 마을의 최후 보루. 광도(XMind: 광원 HP와 광도는 비례 → 한 값)를
// '중간'(start)에서 시작해 서서히 키우고, 적에게 맞으면 줄며, outAt(광도 '낮음'의 바닥)에 닿으면 꺼진다 = 게임 오버.
import type { GameConfig } from '../data';

type CentralCfg = GameConfig['central'];

export class CentralSourceState {
  value: number;

  constructor(private readonly cfg: CentralCfg) {
    this.value = cfg.start;
  }

  get out(): boolean {
    return this.value <= this.cfg.outAt;
  }

  /** 0(꺼짐) ~ 1(가득) */
  get ratio(): number {
    return Math.max(0, (this.value - this.cfg.outAt) / (this.cfg.max - this.cfg.outAt));
  }

  damage(amount: number): void {
    if (this.out) return;
    this.value = Math.max(this.cfg.outAt, this.value - amount);
  }

  update(dt: number): void {
    if (this.out) return;
    this.value = Math.min(this.cfg.max, this.value + this.cfg.growPerSec * dt);
  }
}
