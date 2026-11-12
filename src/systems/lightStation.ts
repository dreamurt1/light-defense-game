// 등불 스테이션 (순수 로직, 2026-11-12 새 기획). HP 없이 광도(LP 게이지)만 갖는다(XMind).
//  off(꺼짐, 광도 '낮음') --빛을 맞음--> igniting(igniteSec) --> on(크게 밝음)
//  켜진 뒤 적에게 맞으면 천천히 준다. off 값까지 내려가면 다시 꺼짐(다시 켤 수 있음)
//  보이는 광도는 맵 전체 광도가 더 크면 그것을 따른다(XMind)
import type { GameConfig } from '../data';

type StationCfg = GameConfig['station'];

export type StationMode = 'off' | 'igniting' | 'on';

export class StationState {
  mode: StationMode = 'off';
  value: number;
  igniteLeft = 0;

  constructor(private readonly cfg: StationCfg) {
    this.value = cfg.off;
  }

  get lit(): boolean {
    return this.mode === 'on';
  }

  /** 0(꺼짐) ~ 1(가득) */
  get ratio(): number {
    return (this.value - this.cfg.off) / (this.cfg.on - this.cfg.off);
  }

  /** 빛을 맞음. 꺼져 있었으면 점화를 시작하고 true */
  ignite(): boolean {
    if (this.mode !== 'off') return false;
    this.mode = 'igniting';
    this.igniteLeft = this.cfg.igniteSec;
    return true;
  }

  /** @returns 이번 프레임에 켜졌으면 true */
  update(dt: number): boolean {
    if (this.mode !== 'igniting') return false;
    this.igniteLeft -= dt;
    if (this.igniteLeft > 0) return false;
    this.igniteLeft = 0;
    this.mode = 'on';
    this.value = this.cfg.on;
    return true;
  }

  /** 적의 공격 (광원 피해 × damageMultiplier). @returns 이번에 꺼졌으면 true */
  damage(sourceDamage: number): boolean {
    if (this.mode !== 'on') return false;
    this.value = Math.max(this.cfg.off, this.value - sourceDamage * this.cfg.damageMultiplier);
    if (this.value > this.cfg.off) return false;
    this.mode = 'off';
    return true;
  }

  /** 보이는 광도: 맵 전체 광도(0~100)가 더 크면 그것을 따른다 */
  level(mapLevel: number): number {
    return Math.max(this.value, mapLevel);
  }
}
