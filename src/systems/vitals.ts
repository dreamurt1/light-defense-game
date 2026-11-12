// 주인공 HP와 하트 (순수 로직, 2026-11-12 새 기획). 수치는 game.json player·stage.hearts (제안).
//  - 피격하면 HP가 준다(무적 중·쓰러진 동안은 받지 않음). HP 0 → 하트 1개 차감, 쓰러짐
//  - 하트가 남아 있으면 respawnDelaySec 뒤 HP 100%로 다시 일어나고(라이언 답변) invulnSec 무적
//  - 하트가 0이면 게임 오버 (다시 일어나지 않음)
//  - regenDelaySec 동안 맞지 않으면 자연 회복, 중앙 광원 곁에서는 더 빨리
import type { GameConfig } from '../data';

type PlayerCfg = GameConfig['player'];

/** none = 안 맞음(무적 등), hurt = HP만 줄어듦, down = 하트를 잃고 쓰러짐, out = 마지막 하트까지 잃음 */
export type HurtResult = 'none' | 'hurt' | 'down' | 'out';

export class Vitals {
  hp: number;
  hearts: number;
  invulnLeft = 0;
  /** 쓰러져 다시 일어나기까지 남은 시간 (쓰러지지 않았으면 0) */
  respawnLeft = 0;
  private sinceHurt = Infinity;

  constructor(
    private readonly cfg: PlayerCfg,
    hearts: number,
  ) {
    this.hp = cfg.maxHp;
    this.hearts = hearts;
  }

  get maxHp(): number {
    return this.cfg.maxHp;
  }

  /** 하트를 다 써서 게임 오버 */
  get out(): boolean {
    return this.hearts <= 0;
  }

  get down(): boolean {
    return this.respawnLeft > 0 || this.out;
  }

  get invulnerable(): boolean {
    return this.invulnLeft > 0 || this.down;
  }

  get low(): boolean {
    return this.hp / this.cfg.maxHp <= this.cfg.lowHpRatio;
  }

  hurt(amount: number): HurtResult {
    if (this.invulnerable || amount <= 0) return 'none';
    this.sinceHurt = 0;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp > 0) return 'hurt';
    this.hearts -= 1;
    if (this.hearts <= 0) return 'out';
    this.respawnLeft = this.cfg.respawnDelaySec;
    return 'down';
  }

  heal(amount: number): void {
    if (this.down) return;
    this.hp = Math.min(this.cfg.maxHp, this.hp + amount);
  }

  /** @returns 이번 프레임에 다시 일어났으면 true */
  update(dt: number, nearCentral: boolean): boolean {
    this.invulnLeft = Math.max(0, this.invulnLeft - dt);
    if (this.out) return false;
    if (this.respawnLeft > 0) {
      this.respawnLeft -= dt;
      if (this.respawnLeft > 0) return false;
      this.respawnLeft = 0;
      this.hp = this.cfg.maxHp;
      this.invulnLeft = this.cfg.invulnSec;
      this.sinceHurt = Infinity;
      return true;
    }
    this.sinceHurt += dt;
    const rate = (nearCentral ? this.cfg.centralRegenPerSec : 0) + (this.sinceHurt >= this.cfg.regenDelaySec ? this.cfg.regenPerSec : 0);
    if (rate > 0) this.hp = Math.min(this.cfg.maxHp, this.hp + rate * dt);
    return false;
  }
}
