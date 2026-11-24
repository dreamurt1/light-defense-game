// 판 위의 적들: 스폰(Spawner가 고른 화면 가장자리 점 → 지금 보이는 영역 바깥의 마을 좌표), 종류별 생성, 매 프레임 이동·공격.
// PlayScene을 600줄 아래로 유지하려고 떼어 낸 조립 조각이다(판정은 Enemy·systems가 한다).
import type Phaser from 'phaser';
import { enemyById, GameData, rescueFor, type EnemyId, type StageDef } from '../../data';
import { RunState } from '../../core/RunState';
import type { Rng } from '../../core/rng';
import { Creature } from '../../entities/enemies/Creature';
import type { Rect } from '../../systems/obstacles';
import { Bat } from '../../entities/enemies/Bat';
import { Frog } from '../../entities/enemies/Frog';
import type { Enemy, EnemyContext, EnemyStep } from '../../entities/enemies/Enemy';
import type { Spawner, SpawnRequest } from '../../systems/Spawner';
import type { Vec } from '../../systems/fan';
import { spawnWeight } from '../../systems/lampWard';
import type { EnemyTarget } from '../../entities/enemies/Enemy';

const WARD = GameData.game.station.ward;

/** 화면 밖에서 적이 나타나는 거리: 보이는 영역 가장자리에서 이만큼 바깥 (제안) */
const SPAWN_OUTSIDE = 56;

export class EnemyField {
  enemies: Enemy[] = [];
  private pending: SpawnRequest[] = [];
  /** 걷는 적이 막히는 벽·장애물 */
  obstacles: Rect[] = [];
  /** 나타난 빛을 잃은 친구 (구출 전) */
  friend: Creature | null = null;
  private friendSpawned = false;
  /** 빛을 잃은 친구가 기다리는 자리 후보: 광장에서 먼 바닥 칸 4곳 (2026-11-23 격자 맵, PlayScene이 넣음) */
  friendSpots: readonly Vec[] = [];
  /** 노월이 부른 박쥐 (동시 최대에 넣지 않음) */
  private readonly summoned = new WeakSet<Enemy>();
  /** 트라이얼의 고정된 적 자리 (2026-11-14): 쓰러지면 respawnSec 뒤 같은 자리에 */
  private dummies: { id: EnemyId; x: number; y: number; enemy: Enemy | null; wait: number }[] = [];
  private dummyRespawn = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly spawner: Spawner,
    private readonly world: { width: number; height: number },
    private readonly margin: number,
    /** 주민 대사 타이밍 등 (판 seed에서) */
    private readonly rng: Rng,
  ) {}

  /** 빛을 맞힐 수 있는 적 (퇴장 중이 아닌) */
  get active(): Enemy[] {
    return this.enemies.filter((e) => e.targetable);
  }

  /** 트라이얼: 고정된 적을 자리마다 하나씩 세운다 */
  setDummies(d: NonNullable<StageDef['dummies']>): void {
    this.dummyRespawn = d.respawnSec;
    this.dummies = d.list.map((s) => ({ id: s.enemyId, x: s.x, y: s.y, enemy: this.pinAt(s.enemyId, s.x, s.y), wait: 0 }));
  }

  private pinAt(id: EnemyId, x: number, y: number): Enemy | null {
    const e = this.create(id, x, y);
    if (!e) return null;
    e.pin({ x, y });
    this.enemies.push(e);
    return e;
  }

  /** 스테이지 시각 t에 새 적을 낸다. 켜진 등불(sources 중 light가 있는 것) 쪽에서는 덜 나온다 (2026-11-14) */
  spawn(dt: number, t: number, sources: readonly EnemyTarget[] = []): void {
    // 트라이얼: 쓰러진(구출·돌려보냄·자비) 고정된 적은 잠시 뒤 같은 자리에 다시
    for (const d of this.dummies) {
      if (d.enemy && d.enemy.targetable) continue;
      d.wait += dt;
      if (d.wait < this.dummyRespawn) continue;
      d.wait = 0;
      d.enemy = this.pinAt(d.id, d.x, d.y);
    }
    // 동시 최대는 스포너가 낸 적만 센다: 패시브 주민(별도 줄)·기다리는 친구·노월이 부른 박쥐는 빼고 (코드 리뷰 2026-11-13)
    const alive = this.active.filter((e) => e.def.kind !== 'passive' && !e.def.friend && !this.summoned.has(e)).length + this.pending.length;
    const lamps = sources.filter((s) => (s.light ?? 0) > 0).map((s) => ({ x: s.x, y: s.y, light: s.light ?? 0 }));
    const weightAt = lamps.length > 0 ? (p: Vec) => spawnWeight(this.toWorld(p), lamps, WARD) : undefined;
    this.pending.push(...this.spawner.update(dt, t, alive, weightAt));
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const req = this.pending[i];
      req.delay -= dt;
      if (req.delay > 0) continue;
      this.pending.splice(i, 1);
      const at = this.spawnPoint(req);
      const e = this.create(req.enemyId, at.x, at.y);
      if (e) this.enemies.push(e);
    }
  }

  step(dt: number, ctx: EnemyContext): { enemy: Enemy; hit: NonNullable<EnemyStep['hit']> }[] {
    const hits: { enemy: Enemy; hit: NonNullable<EnemyStep['hit']> }[] = [];
    for (const e of this.enemies) {
      const s = e.step(dt, ctx);
      e.tickGauge(dt);
      e.collide(this.obstacles, dt);
      e.avoidWards(ctx.sources, dt);
      if (s.hit) hits.push({ enemy: e, hit: s.hit });
    }
    return hits;
  }

  /** 구출 스테이지: 진행 atProgress에 빛을 잃은 친구가 루미에게서 가장 먼 귀퉁이에 한 번 나타난다. 고른 주인공이 그 친구면 나타나지 않음(2026-11-17) */
  spawnFriend(progress: number, stage: StageDef, player: Vec): Creature | null {
    const r = rescueFor(stage, RunState.keeperId);
    if (!r || this.friendSpawned || progress < r.atProgress) return null;
    this.friendSpawned = true;
    if (this.friendSpots.length === 0) return null;
    const spot = [...this.friendSpots].sort((a, b) => Math.hypot(b.x - player.x, b.y - player.y) - Math.hypot(a.x - player.x, a.y - player.y))[0];
    const e = this.spawnAt(r.enemyId, spot.x, spot.y);
    this.friend = e instanceof Creature ? e : null;
    return this.friend;
  }

  /** 정해진 자리에 바로 (튜토리얼·보스 소환·패시브). summoned = 노월이 부름 */
  spawnAt(id: EnemyId, x: number, y: number, summoned = false): Enemy | null {
    const e = this.create(id, x, y);
    if (e) this.enemies.push(e);
    if (e && summoned) this.summoned.add(e);
    return e;
  }

  /** 화면 크기가 바뀜: 적이 나오는 가장자리를 새 크기로 */
  setArea(width: number, height: number): void {
    this.spawner.setArea(width, height);
  }

  /** 퇴장 연출이 끝나 사라진 적을 목록에서 뺀다 */
  prune(): void {
    this.enemies = this.enemies.filter((e) => e.active);
  }

  private create(id: EnemyId, x: number, y: number): Enemy | null {
    if (id === 'bat') return new Bat(this.scene, enemyById('bat'), x, y);
    if (id === 'frog') return new Frog(this.scene, enemyById('frog'), x, y);
    if (id === 'witch') return null;
    return new Creature(this.scene, enemyById(id), x, y, this.rng);
  }

  /** 화면 기준 점 → 마을 좌표 (나올 자리 가중치용) */
  private toWorld(p: Vec): Vec {
    const view = this.scene.cameras.main.worldView;
    return { x: view.x + p.x, y: view.y + p.y };
  }

  /** Spawner는 화면 크기 기준 가장자리 점을 준다: 지금 보이는 영역의 같은 자리에서 조금 바깥으로 밀고 마을 안으로 자른다 */
  private spawnPoint(req: SpawnRequest): Vec {
    const view = this.scene.cameras.main.worldView;
    const { x, y } = this.toWorld(req);
    const dx = x - view.centerX;
    const dy = y - view.centerY;
    const len = Math.hypot(dx, dy) || 1;
    const m = this.margin;
    const place = (px: number, py: number): Vec => ({
      x: Math.min(this.world.width - m, Math.max(m, px)),
      y: Math.min(this.world.height - m, Math.max(m, py)),
    });
    const visible = (p: Vec) => p.x > view.x - 8 && p.x < view.right + 8 && p.y > view.y - 8 && p.y < view.bottom + 8;
    const ox = (dx / len) * SPAWN_OUTSIDE;
    const oy = (dy / len) * SPAWN_OUTSIDE;
    // 카메라가 마을 끝에 붙어 그쪽 바깥이 없으면, 화면 가운데를 기준으로 반대쪽 바깥에서 나온다
    const mx = 2 * view.centerX - x;
    const my = 2 * view.centerY - y;
    const candidates = [place(x + ox, y + oy), place(mx - ox, y + oy), place(x + ox, my - oy), place(mx - ox, my - oy)];
    return candidates.find((p) => !visible(p)) ?? candidates[0];
  }
}
