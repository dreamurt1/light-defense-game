// 어둠의 행렬 (2026-11-23 밤 나들이 v3, NIGHT_RUN.md 5-1절) — 판 위의 조립 조각(계획·상태는 systems/parade.ts).
//  - 밤 규칙의 parade 계획대로 everySec마다 한 묶음: 한 종류 size마리가 0.5초 간격으로 맵 한 변 밖에서 나와 맞은편 변 밖으로 간다
//  - 맞은편 변을 지나면 점수 없이 사라진다. 길이 막혀 너무 오래 걸리면(격자 맵·길찾기 전) 조용히 빠진다
//  - 한 묶음이 다 나가면(또는 아침이 오면, finish) parade:passed — 한 마리도 돌려보내지 않았으면 토스트 '길을 터 줬어요 · 자비 +n'
// 튜토리얼·트라이얼·밤 1에는 행렬이 없다(계획이 null).
import { bus } from '../../core/events';
import type { Rng } from '../../core/rng';
import type { EnemyId, StageDef } from '../../data';
import { Creature } from '../../entities/enemies/Creature';
import type { Vec } from '../../systems/fan';
import type { NightDef } from '../../systems/nightRules';
import type { Rect } from '../../systems/obstacles';
import { edgePoint, passedEdge, planParades, PARADE_GAP_SEC, type Edge, type ParadeGroup } from '../../systems/parade';
import type { EnemyField } from './EnemyField';

/** 길을 못 찾아 맴돌 때 빼내는 여유: 곧게 가는 데 걸릴 시간 × 이만큼 + LATE_EXTRA초 */
const LATE_FACTOR = 2.5;
const LATE_EXTRA = 12;

interface Pending {
  at: number;
  group: number;
  kind: EnemyId;
  from: Vec;
  to: Vec;
}

interface GroupState {
  plan: ParadeGroup;
  to: Edge;
  members: { c: Creature; deadline: number }[];
  spawned: number;
  banished: number;
  mercy: number;
  done: boolean;
}

export class Parade {
  private readonly queue: Pending[] = [];
  private readonly groups: GroupState[];

  constructor(
    private readonly field: EnemyField,
    stage: StageDef,
    rng: Rng,
    private readonly area: Rect,
  ) {
    const plans = planParades((stage as Partial<NightDef>).parade ?? null, stage.durationSec, rng);
    this.groups = plans.map((plan) => ({ plan, to: plan.to, members: [], spawned: 0, banished: 0, mercy: 0, done: false }));
    plans.forEach((g, gi) => {
      for (let i = 0; i < g.size; i++) {
        // 줄지어: 같은 입구에서 0.5초 간격, 옆으로 조금씩 엇갈리게
        const from = edgePoint(g.from, g.laneIn, area, 80 + i * 6);
        const to = edgePoint(g.to, g.laneOut, area, 200);
        const side = (i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2) * 22;
        const horizontal = g.from === 'left' || g.from === 'right';
        this.queue.push({ at: g.atSec + i * PARADE_GAP_SEC, group: gi, kind: g.kind, from: horizontal ? { x: from.x, y: from.y + side } : { x: from.x + side, y: from.y }, to });
      }
    });
  }

  /** 지금까지 계획된 묶음 수 (확인용) */
  get plannedGroups(): number {
    return this.groups.length;
  }

  /** t = 밤 시작부터 흐른 초 */
  update(t: number): void {
    while (this.queue.length && this.queue[0].at <= t) {
      const q = this.queue.shift() as Pending;
      const g = this.groups[q.group];
      g.spawned += 1;
      if (g.spawned === 1) bus.emit('parade:enter', { enemyId: q.kind, group: q.group });
      const e = this.field.spawnAt(q.kind, q.from.x, q.from.y);
      if (!(e instanceof Creature)) continue;
      e.route = q.to;
      const straight = Math.hypot(q.to.x - q.from.x, q.to.y - q.from.y) / Math.max(1, e.def.speed);
      g.members.push({ c: e, deadline: t + straight * LATE_FACTOR + LATE_EXTRA });
    }
    for (const g of this.groups) {
      if (g.done) continue;
      for (const m of g.members) {
        if (!m.c.active || !m.c.targetable) continue;
        if (passedEdge(m.c, g.to, this.area) || t > m.deadline) m.c.leaveQuietly();
      }
      if (g.spawned < g.plan.size || g.members.some((m) => m.c.active && m.c.targetable)) continue;
      g.done = true;
      bus.emit('parade:passed', { enemyId: g.plan.kind, size: g.plan.size, banished: g.banished, mercy: g.mercy });
    }
  }

  /** 아침(밤 승리): 아직 지나가는 중인 묶음도 지나간 것으로 친다 — 패시브 빠르기로는 맵을 가로로 건너는 데 60~85초라 늦게 나온 묶음이 밤 안에 다 나가지 못함 (2026-11-23 기본값) */
  finish(): void {
    for (const g of this.groups) {
      if (g.done || g.spawned === 0) continue;
      g.done = true;
      bus.emit('parade:passed', { enemyId: g.plan.kind, size: g.plan.size, banished: g.banished, mercy: g.mercy });
    }
  }

  private groupOf(c: Creature): GroupState | undefined {
    return this.groups.find((g) => g.members.some((m) => m.c === c));
  }

  /** 세 번 맞아 돌려보냄 */
  noteBanish(c: Creature): void {
    const g = this.groupOf(c);
    if (g) g.banished += 1;
  }

  /** 자비를 줌 */
  noteMercy(c: Creature): void {
    const g = this.groupOf(c);
    if (g) g.mercy += 1;
  }
}
