// 적 공통 (2026-11-12 새 기획): 목표(주인공·중앙 광원·켜진 등불)로 다가가 닿으면 멈춰서 주기마다 피해,
// 빛에 맞으면 넉백·스턴, HP 0이면 무리별로 퇴장한다(잃어버린 주민 = 구출되어 마을로, 호스틸 = 맵 밖으로).
//  - 목표 고르기: 주인공이 보이고 aggroRadius 안이면 주인공, 아니면 가장 가까운 광원(중앙 광원·켜진 등불)
//  - 숨은 주인공을 쫓던 적은 lostSightSec 동안 마을을 맴돌다(2026-11-06 라이언 지시) 광원으로 간다
//  - 붙어 있다가 목표가 멀어지면(detachRatio) 떨어져 다시 쫓는다
import Phaser from 'phaser';
import type { EnemyDef } from '../../data';
import type { Vec } from '../../systems/fan';

export type EnemyState = 'approach' | 'attached' | 'stunned' | 'returning';

/** 'player' 또는 광원 id('central', 'station-0' …) */
export type TargetId = string;

export interface EnemyTarget extends Vec {
  id: TargetId;
  radius: number;
}

export interface EnemyContext {
  /** 주인공 (쓰러져 있으면 null). seen = 숨지 않았거나 아주 가까움. 무적 중에도 쫓지만 피해는 Vitals가 막는다 */
  player: (EnemyTarget & { seen: boolean }) | null;
  /** 중앙 광원과 켜진 등불 */
  sources: readonly EnemyTarget[];
  aggroRadius: number;
  /** 숨은 주인공도 이 거리 안이면 알아챈다 */
  revealDist: number;
  retargetSec: number;
  detachRatio: number;
  lostSightSec: number;
  /** 숨은 주인공을 놓쳤을 때 맴돌 다음 지점 */
  roam: (from: Vec) => Vec;
  roamSpeed: number;
  /** 별 목걸이 등 아이템 배율(Phase 4) */
  speedMultiplier: number;
}

export interface EnemyStep {
  /** 이번 프레임에 준 피해와 그 대상 */
  hit: { target: TargetId; damage: number; sourceDamage: number } | null;
}

/** 퇴장 연출에 넘기는 자리: 맞은 빛이 온 곳, 마을(중앙 광원) */
export interface ReturnContext {
  from: Vec;
  home: Vec;
}

let nextUid = 1;

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
  private stunTotal = 0;
  /** 다음 피해까지 남은 시간. 떨어졌다 다시 붙어도 이어진다(밀려났다 붙을 때마다 바로 피해를 주지 않게) */
  private tickLeft = 0;
  private target: TargetId | null = null;
  private retargetLeft = 0;
  /** 숨은 주인공을 놓친 뒤 맴도는 남은 시간 */
  private lostLeft = 0;
  private roamTo: Vec | null = null;

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

  /** 지금 노리는 대상 (확인용) */
  get targetId(): TargetId | null {
    return this.target;
  }

  /** 옆 흔들림(접근 방향에 수직) */
  protected abstract lateralOffset(t: number): number;
  protected abstract animate(dt: number): void;
  /** 퇴장 연출. 끝나면 스스로 destroy */
  protected abstract playReturn(ctx: ReturnContext): void;
  protected abstract playHit(): void;

  /** 빛에 맞음. HP 0이 되어 퇴장하면 true */
  hitByLight(power: number, knockback: number, stunSec: number, ctx: ReturnContext): boolean {
    if (!this.targetable) return false;
    this.hp -= power;
    if (this.hp <= 0) {
      this.mode = 'returning';
      this.playReturn(ctx);
      return true;
    }
    const dist = knockback * (this.def.knockbackMultiplier ?? 1);
    this.knockDir.set(this.x - ctx.from.x, this.y - ctx.from.y).normalize();
    this.base.set(this.x, this.y);
    // 스턴 동안 속도를 선형으로 줄여 정확히 dist만큼 밀린다
    this.knockSpeed = (2 * dist) / stunSec;
    this.stunLeft = this.stunTotal = stunSec;
    this.mode = 'stunned';
    this.playHit();
    return false;
  }

  step(dt: number, ctx: EnemyContext): EnemyStep {
    const out: EnemyStep = { hit: null };
    if (this.mode === 'returning') return out;
    this.age += dt;
    this.tickLeft = Math.max(0, this.tickLeft - dt);
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

    const goal = this.chooseTarget(dt, ctx);

    if (this.mode === 'attached') {
      if (!goal || Phaser.Math.Distance.Between(this.x, this.y, goal.x, goal.y) > (goal.radius + this.radius) * ctx.detachRatio) {
        this.mode = 'approach';
        this.base.set(this.x, this.y);
        return out;
      }
      if (this.tickLeft <= 0) {
        this.tickLeft = this.def.damageTickSec;
        out.hit = { target: goal.id, damage: this.def.damage, sourceDamage: this.def.sourceDamage };
      }
      return out;
    }

    // 맴돌기(숨은 주인공을 놓침) 또는 목표로 다가간다
    let dest: Vec | null = goal;
    let pace = 1;
    if (!goal) {
      if (!this.roamTo || Phaser.Math.Distance.Between(this.base.x, this.base.y, this.roamTo.x, this.roamTo.y) < 24) this.roamTo = ctx.roam(this.base);
      dest = this.roamTo;
      pace = ctx.roamSpeed;
    } else {
      this.roamTo = null;
    }
    if (!dest) return out;
    const toward = new Phaser.Math.Vector2(dest.x - this.base.x, dest.y - this.base.y);
    const dir = toward.clone().normalize();
    const move = this.def.speed * ctx.speedMultiplier * pace * dt;
    this.base.x += dir.x * move;
    this.base.y += dir.y * move;

    // 목표에 가까워질수록 흔들림을 줄여 똑바로 닿게 한다
    const closeness = Math.min(1, toward.length() / 160);
    const lateral = this.lateralOffset(this.age) * closeness;
    this.setPosition(this.base.x - dir.y * lateral, this.base.y + dir.x * lateral);
    this.face(dir);
    this.setDepth(this.y);

    if (goal && Phaser.Math.Distance.Between(this.x, this.y, goal.x, goal.y) <= goal.radius + this.radius) {
      this.mode = 'attached';
      // 닿는 순간 첫 피해를 주고 이후 주기마다 (제안: 기획서에 없음 — 첫 피해 시점). 주기가 안 됐으면 기다린다
      if (this.tickLeft <= 0) {
        this.tickLeft = this.def.damageTickSec;
        out.hit = { target: goal.id, damage: this.def.damage, sourceDamage: this.def.sourceDamage };
      }
    }
    return out;
  }

  /** 다가가는 방향을 보여 준다 (박쥐는 몸을 돌리고, 걷는 적은 좌우만 뒤집는 식으로 재정의) */
  protected face(dir: Phaser.Math.Vector2): void {
    this.setRotation(Math.atan2(dir.y, dir.x) + Math.PI / 2);
  }

  /** 목표 고르기. null = 맴돌기 */
  private chooseTarget(dt: number, ctx: EnemyContext): EnemyTarget | null {
    const p = ctx.player;
    // 쫓던 주인공이 숨으면 잠시 맴돈다
    const sees = !!p && (p.seen || this.dist(p) <= ctx.revealDist);
    if (this.target === 'player' && !sees) {
      if (p && this.lostLeft <= 0) this.lostLeft = ctx.lostSightSec;
      this.target = null;
    }
    if (this.lostLeft > 0) {
      this.lostLeft -= dt;
      if (sees && this.dist(p) <= ctx.aggroRadius) this.lostLeft = 0;
      else return null;
    }

    this.retargetLeft -= dt;
    const current = this.target === 'player' ? (sees ? p : null) : this.find(this.target, ctx);
    if (current && (this.retargetLeft > 0 || this.mode === 'attached')) return current;
    this.retargetLeft = ctx.retargetSec;

    let next: EnemyTarget | null = sees && this.dist(p) <= ctx.aggroRadius ? p : null;
    if (!next) {
      let best = Infinity;
      for (const s of ctx.sources) {
        const d = this.dist(s);
        if (d < best) {
          best = d;
          next = s;
        }
      }
    }
    if (next?.id !== this.target && this.mode === 'attached') this.mode = 'approach';
    this.target = next?.id ?? null;
    return next;
  }

  private find(id: TargetId | null, ctx: EnemyContext): EnemyTarget | null {
    if (!id) return null;
    return ctx.sources.find((s) => s.id === id) ?? null;
  }

  private dist(v: Vec): number {
    return Math.hypot(v.x - this.x, v.y - this.y);
  }
}
