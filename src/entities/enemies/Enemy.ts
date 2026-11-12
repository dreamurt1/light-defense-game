// 어둠에 변한 이웃 공통: 등불로 접근, 닿으면 멈춰서 주기마다 피해, 빛에 맞으면 넉백·스턴, HP 0이면 되돌림.
// 2026-11-04부터 등불은 등불지기가 들고 움직인다: 매 프레임 바뀌는 등불 위치를 쫓고,
// 붙어 있다가 등불이 멀어지면 떨어져 다시 쫓는다(다시 붙을 때는 콤보를 또 깎지 않는다).
// 등불지기가 풀숲에 숨어 보이지 않으면 루미를 쫓지 못하고 마을을 맴돈다(2026-11-06 라이언 지시).
import Phaser from 'phaser';
import type { EnemyDef } from '../../data';
import type { Vec } from '../../systems/fan';

export type EnemyState = 'approach' | 'attached' | 'stunned' | 'returning';

export interface EnemyContext {
  /** 실제 등불: 닿으면 피해 */
  lantern: Vec & { radius: number };
  /** 등불지기가 풀숲에 숨어 보이지 않을 때: 마을을 맴돌 다음 지점을 고른다. 없으면 등불을 쫓는다 */
  roam?: (from: Vec) => Vec;
  /** 맴돌 때 속도 배율 */
  roamSpeed?: number;
  /** 느림 가루 등 장착물 배율(M3) */
  speedMultiplier: number;
}

export interface EnemyStep {
  /** 이번 프레임에 처음 닿았나 (콤보 절반) */
  firstContact: boolean;
  /** 이번 프레임에 준 등불 피해 */
  damage: number;
}

let nextUid = 1;

/** 붙어 있던 이웃이 떨어지는 거리 = 닿는 거리 × 이 배율 (제안: 기획서에 없음) */
const DETACH_RATIO = 1.25;

export abstract class Enemy extends Phaser.GameObjects.Container {
  readonly uid = nextUid++;
  hp: number;
  mode: EnemyState = 'approach';
  /** 접근 경로 위의 기준점. 화면 위치는 여기에 옆 흔들림을 더한 값 */
  protected base: Phaser.Math.Vector2;
  protected age = 0;
  private knockSpeed = 0;
  private readonly knockDir = new Phaser.Math.Vector2();
  private stunLeft = 0;
  /** 맴돌며 향하는 지점 (숨은 등불지기를 못 볼 때만) */
  private roamTo: Vec | null = null;
  private stunTotal = 0;
  private tickLeft = 0;
  /** 등불지기가 걸어가서 떨어진 상태: 다시 붙어도 '처음 닿음'(콤보 절반)이 아니다 */
  private trailing = false;

  constructor(
    scene: Phaser.Scene,
    readonly def: EnemyDef,
    x: number,
    y: number,
  ) {
    super(scene, x, y);
    this.hp = def.hp;
    this.base = new Phaser.Math.Vector2(x, y);
    scene.add.existing(this);
  }

  get radius(): number {
    return this.def.radius;
  }

  get targetable(): boolean {
    return this.mode !== 'returning';
  }

  /** 옆 흔들림(접근 방향에 수직) */
  protected abstract lateralOffset(t: number): number;
  protected abstract animate(dt: number): void;
  /** 되돌림 연출. 끝나면 스스로 destroy */
  protected abstract playReturn(lantern: Vec): void;
  protected abstract playHit(): void;

  /** 빛에 맞음. 되돌아가면 true */
  hitByLight(power: number, knockback: number, stunSec: number, lantern: Vec): boolean {
    if (!this.targetable) return false;
    this.hp -= power;
    this.trailing = false;
    if (this.hp <= 0) {
      this.mode = 'returning';
      this.playReturn(lantern);
      return true;
    }
    const dist = knockback * (this.def.knockbackMultiplier ?? 1);
    this.knockDir.set(this.x - lantern.x, this.y - lantern.y).normalize();
    this.base.set(this.x, this.y);
    // 스턴 동안 속도를 선형으로 줄여 정확히 dist만큼 밀린다
    this.knockSpeed = (2 * dist) / stunSec;
    this.stunLeft = this.stunTotal = stunSec;
    this.mode = 'stunned';
    this.playHit();
    return false;
  }

  step(dt: number, ctx: EnemyContext): EnemyStep {
    const out: EnemyStep = { firstContact: false, damage: 0 };
    if (this.mode === 'returning') return out;
    this.age += dt;
    this.animate(dt);

    if (this.mode === 'stunned') {
      const speed = this.knockSpeed * (this.stunLeft / this.stunTotal);
      this.base.x += this.knockDir.x * speed * dt;
      this.base.y += this.knockDir.y * speed * dt;
      this.setPosition(this.base.x, this.base.y);
      this.stunLeft -= dt;
      if (this.stunLeft <= 0) this.mode = 'approach';
      this.setDepth(this.y);
      return out;
    }

    const reach = ctx.lantern.radius + this.radius;
    if (this.mode === 'attached') {
      if (Phaser.Math.Distance.Between(this.x, this.y, ctx.lantern.x, ctx.lantern.y) > reach * DETACH_RATIO) {
        this.mode = 'approach';
        this.trailing = true;
        this.base.set(this.x, this.y);
        return out;
      }
      this.tickLeft -= dt;
      if (this.tickLeft <= 0) {
        this.tickLeft += this.def.damageTickSec;
        out.damage = this.def.lanternDamage;
      }
      return out;
    }

    // 숨은 등불지기를 못 보면 마을을 맴돈다: 지점에 다다르면 다음 지점으로
    let target: Vec = ctx.lantern;
    let pace = 1;
    if (ctx.roam) {
      if (!this.roamTo || Phaser.Math.Distance.Between(this.base.x, this.base.y, this.roamTo.x, this.roamTo.y) < 24) this.roamTo = ctx.roam(this.base);
      target = this.roamTo;
      pace = ctx.roamSpeed ?? 1;
    } else {
      this.roamTo = null;
    }
    const toLantern = new Phaser.Math.Vector2(target.x - this.base.x, target.y - this.base.y);
    const dir = toLantern.clone().normalize();
    const move = this.def.speed * ctx.speedMultiplier * pace * dt;
    this.base.x += dir.x * move;
    this.base.y += dir.y * move;

    // 등불에 가까워질수록 흔들림을 줄여 똑바로 닿게 한다
    const closeness = Math.min(1, toLantern.length() / 160);
    const lateral = this.lateralOffset(this.age) * closeness;
    this.setPosition(this.base.x - dir.y * lateral, this.base.y + dir.x * lateral);
    this.setRotation(Math.atan2(dir.y, dir.x) + Math.PI / 2);
    this.setDepth(this.y);

    if (Phaser.Math.Distance.Between(this.x, this.y, ctx.lantern.x, ctx.lantern.y) <= reach) {
      this.mode = 'attached';
      if (this.trailing) {
        // 따라와서 다시 붙음: 피해 주기는 이어서, 콤보는 그대로
        this.trailing = false;
        return out;
      }
      // 닿는 순간 첫 피해를 주고 이후 주기마다 (제안: 기획서에 없음 — 첫 피해 시점)
      out.firstContact = true;
      out.damage = this.def.lanternDamage;
      this.tickLeft = this.def.damageTickSec;
    }
    return out;
  }
}
