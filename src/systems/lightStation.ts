// 등불 스테이션 (순수 로직).
// 2026-11-14 라이언: HP와 광도를 나눈다 — 게이지는 HP, 광도(보이는 밝기)는 HP에 비례.
//  off(꺼짐, HP 0) --빛을 맞음--> igniting(igniteSec 연출) --> on(HP 가득)
//  켜진 뒤에는 빛을 쏴도 회복되지 않는다(빛은 꺼진 등불만 맞힘). 켜진 동안 HP가 저절로 조금씩 줄고(decayPerSec, 라이언 11-14)
//  적에게 맞아도 준다. HP 0이 되면 다시 꺼지고, 그때만 다시 켤 수 있다.
//  (옛 규칙: 보이는 광도가 맵 전체 광도를 따라 올라감 → 게이지가 저절로 차올라 회복처럼 보여 없앰)
import type { GameConfig } from '../data';

type StationCfg = GameConfig['station'];

export type StationMode = 'off' | 'igniting' | 'on';

export class StationState {
  mode: StationMode = 'off';
  hp = 0;
  igniteLeft = 0;

  constructor(private readonly cfg: StationCfg) {}

  get lit(): boolean {
    return this.mode === 'on';
  }

  get maxHp(): number {
    return this.cfg.maxHp;
  }

  /** 0(꺼짐) ~ 1(가득) */
  get ratio(): number {
    return Math.max(0, this.hp / this.cfg.maxHp);
  }

  /** 점화 진행 0~1 (점화 중이 아니면 0) */
  get igniteProgress(): number {
    return this.mode === 'igniting' ? 1 - this.igniteLeft / this.cfg.igniteSec : 0;
  }

  /** 광도 0~100: HP에 비례 (점화 중에는 달아오르는 만큼, 꺼짐 = 0) */
  get light(): number {
    if (this.mode === 'igniting') return this.igniteProgress * 100;
    return this.mode === 'on' ? this.ratio * 100 : 0;
  }

  /** 빛을 맞음. 꺼져 있었으면 점화를 시작하고 true (켜진 동안은 아무 일도 없음) */
  ignite(): boolean {
    if (this.mode !== 'off') return false;
    this.mode = 'igniting';
    this.igniteLeft = this.cfg.igniteSec;
    return true;
  }

  /** 점화·자연 감소. @returns 'lit' = 이번 프레임에 켜짐(HP 가득), 'out' = 저절로 다 타서 꺼짐, null = 그대로 */
  update(dt: number): 'lit' | 'out' | null {
    if (this.mode === 'on') {
      this.hp = Math.max(0, this.hp - this.cfg.decayPerSec * dt);
      if (this.hp > 0) return null;
      this.mode = 'off';
      return 'out';
    }
    if (this.mode !== 'igniting') return null;
    this.igniteLeft -= dt;
    if (this.igniteLeft > 0) return null;
    this.igniteLeft = 0;
    this.mode = 'on';
    this.hp = this.cfg.maxHp;
    return 'lit';
  }

  /** 적의 공격 (광원 피해 × damageMultiplier). @returns 이번에 꺼졌으면 true */
  damage(sourceDamage: number): boolean {
    if (this.mode !== 'on') return false;
    this.hp = Math.max(0, this.hp - sourceDamage * this.cfg.damageMultiplier);
    if (this.hp > 0) return false;
    this.mode = 'off';
    return true;
  }
}
