// 판 위의 적들: 스폰(Spawner가 고른 화면 가장자리 점 → 지금 보이는 영역 바깥의 마을 좌표), 종류별 생성, 매 프레임 이동·공격.
// PlayScene을 600줄 아래로 유지하려고 떼어 낸 조립 조각이다(판정은 Enemy·systems가 한다).
import type Phaser from 'phaser';
import { enemyById, type EnemyId } from '../../data';
import { Bat } from '../../entities/enemies/Bat';
import { Frog } from '../../entities/enemies/Frog';
import type { Enemy, EnemyContext, EnemyStep } from '../../entities/enemies/Enemy';
import type { Spawner, SpawnRequest } from '../../systems/Spawner';
import type { Vec } from '../../systems/fan';

/** 화면 밖에서 적이 나타나는 거리: 보이는 영역 가장자리에서 이만큼 바깥 (제안) */
const SPAWN_OUTSIDE = 56;

export class EnemyField {
  enemies: Enemy[] = [];
  private pending: SpawnRequest[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly spawner: Spawner,
    private readonly world: { width: number; height: number },
    private readonly margin: number,
  ) {}

  /** 빛을 맞힐 수 있는 적 (퇴장 중이 아닌) */
  get active(): Enemy[] {
    return this.enemies.filter((e) => e.targetable);
  }

  /** 스테이지 시각 t에 새 적을 낸다 */
  spawn(dt: number, t: number): void {
    const alive = this.active.length + this.pending.length;
    this.pending.push(...this.spawner.update(dt, t, alive));
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
      if (s.hit) hits.push({ enemy: e, hit: s.hit });
    }
    return hits;
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
    return null;
  }

  /** Spawner는 화면 크기 기준 가장자리 점을 준다: 지금 보이는 영역의 같은 자리에서 조금 바깥으로 밀고 마을 안으로 자른다 */
  private spawnPoint(req: SpawnRequest): Vec {
    const view = this.scene.cameras.main.worldView;
    const x = view.x + req.x;
    const y = view.y + req.y;
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
