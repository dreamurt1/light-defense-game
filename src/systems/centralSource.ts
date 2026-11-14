// 중앙 광원 (순수 로직): 마을의 최후 보루.
// 2026-11-14 라이언: HP와 광도를 나눈다 — 화면의 게이지는 HP, 광도(보이는 밝기)는 HP에 비례.
//  HP는 가득 찬 채 시작하고 적에게 맞으면 준다. 빛을 쏴도·시간이 지나도 회복되지 않고(시간 회복까지 없앤 것은 제안),
//  **꺼진 등불을 켜면 조금 오른다**(라이언 11-14: 등불에 관심을 둘 근거 — 양은 game.json station.centralHeal).
//  HP 0 = 꺼짐 = 게임 오버.
import type { GameConfig } from '../data';

type CentralCfg = GameConfig['central'];

export class CentralSourceState {
  hp: number;

  constructor(private readonly cfg: CentralCfg) {
    this.hp = cfg.maxHp;
  }

  get maxHp(): number {
    return this.cfg.maxHp;
  }

  get out(): boolean {
    return this.hp <= 0;
  }

  /** 0(꺼짐) ~ 1(가득) */
  get ratio(): number {
    return Math.max(0, this.hp / this.cfg.maxHp);
  }

  /** 광도 0~100: HP에 비례 (4단계 판정·밝기용) */
  get light(): number {
    return this.ratio * 100;
  }

  /** 꺼진 등불을 켰을 때 회복. 꺼진 뒤에는 오르지 않는다. @returns 실제로 오른 양 */
  heal(amount: number): number {
    if (this.out) return 0;
    const before = this.hp;
    this.hp = Math.min(this.cfg.maxHp, this.hp + amount);
    return this.hp - before;
  }

  damage(amount: number): void {
    if (this.out) return;
    this.hp = Math.max(0, this.hp - amount);
  }
}
