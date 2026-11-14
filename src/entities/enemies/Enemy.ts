// 적 공통 (2026-11-12 새 기획): 목표(주인공·중앙 광원·켜진 등불)로 다가가 몸으로 들이받아 피해를 준다(2026-11-13 몸박치기),
// 빛에 맞으면 넉백·스턴, HP 0이면 무리별로 퇴장한다(잃어버린 주민 = 구출되어 마을로, 호스틸 = 맵 밖으로).
//  - 목표 고르기: 주인공이 보이고 aggroRadius 안이면 주인공, 아니면 가장 가까운 광원(중앙 광원·켜진 등불)
//  - 숨은 주인공을 쫓던 적은 lostSightSec 동안 마을을 맴돌다(2026-11-06 라이언 지시) 광원으로 간다
//  - 붙어 있다가 목표가 멀어지면(detachRatio) 떨어져 다시 쫓는다
//  - 켜진 등불의 결계(밝기 비례 둘레)는 피해 돌아가고, 결계가 등불 몸에 닿을 만큼 줄어야 그 등불을 공격한다.
//    등불을 노리는 뱀파이어(role station)·기다리는 친구·퇴장 중인 적은 예외 (2026-11-14 라이언, systems/lampWard)
import Phaser from 'phaser';
import type { EnemyDef } from '../../data';
import type { Vec } from '../../systems/fan';
import { keepOut, steerAround, type Ward } from '../../systems/lampWard';
import { pushOut, type Rect } from '../../systems/obstacles';
import { GameData } from '../../data';

const WARD = GameData.game.station.ward;
/** 켜진 등불의 결계들 */
const wardsOf = (sources: readonly EnemyTarget[]): Ward[] => sources.filter((s) => (s.ward ?? 0) > 0).map((s) => ({ x: s.x, y: s.y, r: s.ward ?? 0 }));

/**
 * 호스틸 역할 (2026-11-13 Phase 3: 추적 / 중앙 광원 공격 / 등불 공격). enemies.json behaviorParams.role.
 * chase = 보이면 주인공(기본), central = 중앙 광원으로 곧장(아주 가까울 때만 주인공), station = 켜진 등불 먼저,
 * source = 가장 가까운 광원(중앙 광원·켜진 등불)으로 곧장, 아주 가까울 때만 주인공 (2026-11-14: 잃어버린 주민은 빛을 찾아감 —
 *          루미만 쫓으면 곁을 지키는 동안 광원이 위협받지 않아 '등불을 켜러 나갈지 중앙을 지킬지'가 생기지 않았음, 제안)
 */
type Role = 'chase' | 'central' | 'station' | 'source';
/** 역할 공격 거리·벽 우회 (원본 game.json enemyAi.closeAggro·stuckSec·detourDist·detourSec, 제안) */
const AI = GameData.game.enemyAi;
const CLOSE_AGGRO = AI.closeAggro;
// 몸박치기 수치는 game.json enemyAi.slamBack·slamSec·chargeDist·chargeLead·chargeSpeed
const STUCK_SEC = AI.stuckSec;
const DETOUR = { dist: AI.detourDist, sec: AI.detourSec };

/** attached = 목표 곁에서 다음 들이받기를 기다리며 숨 고르는 중 (2026-11-13부터 붙어 있지 않음) */
export type EnemyState = 'approach' | 'attached' | 'stunned' | 'returning';

/** 'player' 또는 광원 id('central', 'station-0' …) */
export type TargetId = string;

export interface EnemyTarget extends Vec {
  id: TargetId;
  radius: number;
  /** 켜진 등불만: 광도(0~100)와 결계 반지름 (2026-11-14) */
  light?: number;
  ward?: number;
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
  /** 화난 패시브: 주인공만 쫓는다 */
  protected playerOnly = false;
  private readonly role: Role;
  private blocked = 0;
  private detourLeft = 0;
  private detour: Vec = { x: 0, y: 0 };
  private lastDir = { x: 0, y: 1 };
  /** 들이받은 뒤 튕겨 물러나는 남은 시간과 방향 */
  private recoilLeft = 0;
  private recoilTotal = 0;
  private readonly recoilDir = new Phaser.Math.Vector2();

  constructor(
    scene: Phaser.Scene,
    readonly def: EnemyDef,
    x: number,
    y: number,
  ) {
    super(scene, x, y);
    this.hp = def.hp;
    this.base = new Phaser.Math.Vector2(x, y);
    const role = def.behaviorParams?.role;
    this.role = role === 'central' || role === 'station' || role === 'source' ? role : 'chase';
    scene.add.existing(this);
  }

  get radius(): number {
    return this.def.radius;
  }

  /** 등불의 결계를 무시하는 적: 등불을 노리는 뱀파이어, 기다리는 친구, 퇴장 중 */
  private get wardFree(): boolean {
    return this.role === 'station' || !!this.def.friend || this.mode === 'returning';
  }

  /** 켜진 등불의 결계 안이면 밖으로 밀려난다 (갑자기 켜져도 순간 이동하지 않게 초당 pushPerSec까지) */
  avoidWards(sources: readonly EnemyTarget[], dt: number): void {
    if (this.wardFree) return;
    const wards = wardsOf(sources);
    if (wards.length === 0) return;
    // 막 들어오려는 적(돌진 포함)은 가장자리에서 바로 막고, 켜질 때 안에 있던 적은 pushPerSec로 천천히 밀어낸다
    const p = keepOut({ x: this.x, y: this.y }, this.radius, wards, Math.max(WARD.pushPerSec, this.def.speed * AI.chargeSpeed * 1.5) * dt);
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    if (dx === 0 && dy === 0) return;
    this.base.x += dx;
    this.base.y += dy;
    this.setPosition(p.x, p.y);
  }

  get targetable(): boolean {
    return this.mode !== 'returning';
  }

  /** 지금 노리는 대상 (확인용) */
  get targetId(): TargetId | null {
    return this.target;
  }

  /** 주기마다 주는 주인공 피해 (화난 패시브는 재정의) */
  protected get attackDamage(): number {
    return this.def.damage;
  }

  /**
   * 걷는 적은 벽·장애물에 막힌다(2026-11-13 미로 요소). 막힌 채로 STUCK_SEC가 지나면 옆으로 돌아갈 지점을 잡는다.
   * 날거나 붙어 있거나 퇴장 중이면 무시
   */
  collide(rects: readonly Rect[], dt: number): void {
    if (this.def.flies || this.mode === 'returning' || this.mode === 'attached') return;
    const p = pushOut({ x: this.x, y: this.y }, this.radius * 0.8, rects);
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    if (dx === 0 && dy === 0) {
      this.blocked = Math.max(0, this.blocked - dt);
      return;
    }
    this.base.x += dx;
    this.base.y += dy;
    this.setPosition(p.x, p.y);
    this.blocked += dt;
    if (this.blocked >= STUCK_SEC && this.detourLeft <= 0) {
      const side = this.uid % 2 === 0 ? 1 : -1;
      const g = this.lastDir;
      // 마을 밖으로 나가지 않게 자른다 (코드 리뷰 2026-11-13)
      const W = GameData.game.world;
      const clamp = (v: number, max: number) => Math.min(max - 60, Math.max(60, v));
      this.detour = { x: clamp(this.x - g.y * side * DETOUR.dist - g.x * 40, W.width), y: clamp(this.y + g.x * side * DETOUR.dist - g.y * 40, W.height) };
      this.detourLeft = DETOUR.sec;
      this.blocked = 0;
    }
  }

  /** 옆 흔들림(접근 방향에 수직) */
  protected abstract lateralOffset(t: number): number;
  protected abstract animate(dt: number): void;
  /** 퇴장 연출. 끝나면 스스로 destroy */
  protected abstract playReturn(ctx: ReturnContext): void;
  protected abstract playHit(): void;

  /** 들이받는 순간의 몸짓: 부딪히는 쪽으로 납작해졌다 돌아온다 (종마다 바꿀 수 있음) */
  protected playSlam(): void {
    this.scene.tweens.add({ targets: this, scaleX: 1.18, scaleY: 0.84, duration: 70, yoyo: true, ease: 'Quad.easeOut' });
  }

  /** 들이받고 튕겨 물러난다 (피해가 없는 부딪힘은 반만) */
  private bounceOff(goal: Vec, full: boolean): void {
    this.recoilDir.set(this.x - goal.x, this.y - goal.y);
    if (this.recoilDir.lengthSq() < 1) this.recoilDir.set(-this.lastDir.x, -this.lastDir.y);
    this.recoilDir.normalize();
    this.recoilTotal = AI.slamSec * (full ? 1 : 0.6);
    this.recoilLeft = this.recoilTotal;
    this.base.set(this.x, this.y);
    this.mode = 'approach';
    if (full) this.playSlam();
  }

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

    if (this.recoilLeft > 0) {
      // 들이받은 뒤 튕겨 물러남: 속도를 선형으로 줄여 정확히 slamBack(피해 없는 부딪힘은 그보다 짧게)만큼
      const back = AI.slamBack * (this.recoilTotal / AI.slamSec);
      const speed = ((2 * back) / this.recoilTotal) * (this.recoilLeft / this.recoilTotal);
      this.base.x += this.recoilDir.x * speed * dt;
      this.base.y += this.recoilDir.y * speed * dt;
      this.setPosition(this.base.x, this.base.y);
      this.recoilLeft -= dt;
      this.setDepth(this.y);
      return out;
    }

    const goal = this.chooseTarget(dt, ctx);
    const reach = goal ? goal.radius + this.radius : 0;
    const dist = goal ? Phaser.Math.Distance.Between(this.x, this.y, goal.x, goal.y) : Infinity;

    if (this.mode === 'attached') {
      // 숨 고르기: 목표가 멀어지면 다시 쫓고, 다음 공격 주기가 다가오면 돌진한다
      if (!goal || dist > reach * ctx.detachRatio + AI.chargeDist) {
        this.mode = 'approach';
        this.base.set(this.x, this.y);
        return out;
      }
      if (this.tickLeft > AI.chargeLead) {
        const dir = new Phaser.Math.Vector2(goal.x - this.base.x, goal.y - this.base.y).normalize();
        // 제자리에서 앞뒤로 들썩이며 노려본다
        const paw = Math.sin(this.age * 9) * 3;
        this.setPosition(this.base.x + dir.x * paw, this.base.y + dir.y * paw);
        this.face(dir);
        this.setDepth(this.y);
        return out;
      }
      this.mode = 'approach';
    }

    // 맴돌기(숨은 주인공을 놓침) 또는 목표로 다가간다
    let dest: Vec | null = goal;
    let pace = 1;
    if (!goal) {
      // 맴돌 지점이 켜진 등불의 결계 안이면 다시 고른다
      const inWard = (p: Vec) => !this.wardFree && wardsOf(ctx.sources).some((w) => Math.hypot(p.x - w.x, p.y - w.y) < w.r);
      if (!this.roamTo || Phaser.Math.Distance.Between(this.base.x, this.base.y, this.roamTo.x, this.roamTo.y) < 24 || inWard(this.roamTo)) this.roamTo = ctx.roam(this.base);
      dest = this.roamTo;
      pace = ctx.roamSpeed;
    } else {
      this.roamTo = null;
    }
    if (this.detourLeft > 0) {
      this.detourLeft -= dt;
      dest = this.detour;
    }
    if (!dest) return out;
    const toward = new Phaser.Math.Vector2(dest.x - this.base.x, dest.y - this.base.y);
    const dir = toward.clone().normalize();
    // 켜진 등불의 결계는 둘레로 비켜 간다 (목적지가 결계 안이면 가장자리까지만)
    if (!this.wardFree) {
      const s = steerAround(this.base, dir, this.radius, dest, wardsOf(ctx.sources), WARD.steerBuffer);
      dir.set(s.x, s.y);
    }
    this.lastDir = { x: dir.x, y: dir.y };
    // 목표 곁(chargeDist 안)에 왔는데 아직 공격 주기가 남았으면 멈춰 숨을 고르고, 곧이면 빠르게 돌진한다
    const near = goal && dest === goal && dist - reach <= AI.chargeDist;
    if (near && this.tickLeft > AI.chargeLead) {
      this.mode = 'attached';
      this.base.set(this.x, this.y);
      this.face(dir);
      return out;
    }
    if (near) pace *= AI.chargeSpeed;
    const move = this.def.speed * ctx.speedMultiplier * pace * dt;
    this.base.x += dir.x * move;
    this.base.y += dir.y * move;

    // 목표에 가까워질수록 흔들림을 줄여 똑바로 닿게 한다
    const closeness = Math.min(1, toward.length() / 160);
    const lateral = this.lateralOffset(this.age) * closeness;
    this.setPosition(this.base.x - dir.y * lateral, this.base.y + dir.x * lateral);
    this.face(dir);
    this.setDepth(this.y);

    if (goal && Phaser.Math.Distance.Between(this.x, this.y, goal.x, goal.y) <= reach) {
      // 들이받음: 주기가 됐으면 피해를 주고 튕겨 물러난다. 아직이면(목표가 다가와 부딪힘) 피해 없이 살짝 물러난다
      if (this.tickLeft <= 0) {
        this.tickLeft = this.def.damageTickSec;
        out.hit = { target: goal.id, damage: this.attackDamage, sourceDamage: this.def.sourceDamage };
        this.bounceOff(goal, true);
      } else {
        this.bounceOff(goal, false);
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

    const reach = this.playerOnly ? ctx.aggroRadius * 1.5 : this.role === 'chase' ? ctx.aggroRadius : CLOSE_AGGRO;
    let next: EnemyTarget | null = sees && this.dist(p) <= reach ? p : null;
    if (!next && !this.playerOnly) {
      // 역할: 등불 공격은 켜진 등불 먼저, 중앙 광원 공격은 중앙 광원으로, 그 밖에는 가장 가까운 광원
      // 결계가 아직 넓은(밝은) 등불은 뱀파이어만 노린다 — 다른 적은 결계가 등불 몸에 닿을 만큼 줄어야 다가와 공격 (2026-11-14)
      const reachable = this.role === 'station' ? ctx.sources : ctx.sources.filter((s) => (s.ward ?? 0) <= s.radius + this.radius);
      const pool =
        this.role === 'station' && reachable.some((s) => s.id !== 'central')
          ? reachable.filter((s) => s.id !== 'central')
          : this.role === 'central'
            ? reachable.filter((s) => s.id === 'central')
            : reachable;
      let best = Infinity;
      for (const s of pool) {
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
