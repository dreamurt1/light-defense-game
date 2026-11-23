// 랜덤 이벤트 (2026-11-18, 기획서 Phase 5): 정식 스테이지에서 한 판에 한 번 — 무엇·언제는 systems/runEvents.ts(seed), 여기서는 일으키고 끝낸다.
//  - 반딧불 무리: 루미에게서 먼 쉼터 자리(map.json rings)에 빛 고임 + 노란 화살표, 곁에 가면 LP가 등불 곁처럼 차오름(durationSec)
//  - 길 잃은 주민 행렬: 그 스테이지의 잃어버린 주민 여럿이 루미에게서 먼 쪽에서 한꺼번에 — 빛을 찾아 광원으로 온다(구출 기회)
//  - 작은 화해: 이번 판에 자비를 베풀었으면 지나쳐 준 주민이 루미 곁에 선물(아이템) — 아니면 반딧불 무리
//  - 어둠 바람: 마을이 한 번 어두워지고 적이 잠깐(durationSec) 빨라진다 — 첫 스테이지엔 없음
import { bus } from '../../core/events';
import type { Rng } from '../../core/rng';
import { GameData, enemyById, type EnemyId, type StageDef } from '../../data';
import type { Vec } from '../../systems/fan';
import { planEvent, resolveKind, type PlannedEvent } from '../../systems/runEvents';
import { carryItemIds } from '../../systems/unlocks';
import type { EnemyField } from './EnemyField';
import type { Items } from './Items';
import type { Sources } from './Sources';

const CFG = GameData.game.runEvents;

export interface EventHost {
  field: EnemyField;
  items: Items;
  sources: Sources;
  keeper: () => Vec;
  mercyCount: () => number;
  /** 광장에서 먼 바닥 칸 (격자 맵, 2026-11-23) */
  farSpots: readonly Vec[];
}

export class RunEvents {
  private readonly plan: PlannedEvent | null;
  private fired = false;
  private windLeft = 0;
  private swarmLeft = 0;

  constructor(
    private readonly host: EventHost,
    private readonly stage: StageDef,
    private readonly rng: Rng,
  ) {
    this.plan = planEvent(stage, CFG, () => rng.range(0, 1));
  }

  /** 어둠 바람이 부는 동안 적 이동 배율 */
  get enemySpeed(): number {
    return this.windLeft > 0 ? CFG.darkWind.enemySpeed : 1;
  }

  update(dt: number, progress: number): void {
    this.windLeft = Math.max(0, this.windLeft - dt);
    if (this.swarmLeft > 0) {
      this.swarmLeft -= dt;
      if (this.swarmLeft <= 0) this.host.sources.extraPools = [];
    }
    if (this.fired || !this.plan || progress < this.plan.atProgress) return;
    this.fired = true;
    this.fire(resolveKind(this.plan.kind, this.host.mercyCount()));
  }

  private fire(kind: PlannedEvent['kind']): void {
    const p = this.host.keeper();
    if (kind === 'fireflies') {
      const spot = this.farSpot(p);
      this.host.sources.extraPools = [{ x: spot.x, y: spot.y, radius: CFG.fireflies.radius, alpha: 0.9, beacon: true }];
      this.swarmLeft = CFG.fireflies.durationSec;
      bus.emit('run:event', { kind, x: spot.x, y: spot.y });
    } else if (kind === 'lostParade') {
      const lost = Object.keys(this.stage.spawn.normal.weights).filter((id) => enemyById(id as EnemyId).kind === 'lost') as EnemyId[];
      const spot = this.farSpot(p);
      for (let i = 0; i < CFG.lostParade.count; i++) {
        const id = lost.length ? lost[i % lost.length] : 'frog';
        this.host.field.spawnAt(id, spot.x + (i - 1) * 60, spot.y + (i % 2) * 40);
      }
      bus.emit('run:event', { kind, x: spot.x, y: spot.y });
    } else if (kind === 'gift') {
      const ids = carryItemIds(GameData.items);
      const id = ids[Math.floor(this.rng.range(0, ids.length)) % ids.length];
      this.host.items.drop(id, p.x + 90, p.y + 40);
      bus.emit('run:event', { kind, x: p.x, y: p.y });
    } else {
      this.windLeft = CFG.darkWind.durationSec;
      this.host.sources.mapLight.hit('central', true);
      bus.emit('run:event', { kind, x: p.x, y: p.y });
    }
  }

  /** 루미에게서 먼 바닥 칸 (격자 맵, 2026-11-23 — 옛 map.json 쉼터 자리 대신) */
  private farSpot(p: Vec): Vec {
    const list = this.host.farSpots.length ? this.host.farSpots : [{ x: GameData.game.central.x, y: GameData.game.central.y }];
    return [...list].sort((a, b) => Math.hypot(b.x - p.x, b.y - p.y) - Math.hypot(a.x - p.x, a.y - p.y))[0];
  }
}
