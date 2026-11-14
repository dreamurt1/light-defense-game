// 스테이지 스폰 (순수 로직). 무엇을 언제 어디서 낼지만 정하고, 실제 생성은 PlayScene이 한다.
// 2026-11-12 새 기획: 평소(0 ~ climaxAt)와 클라이맥스(climaxAt ~ 끝) 두 표(stages.json spawn).
// 클라이맥스(진행 70%부터)에는 개체수와 빈도가 크게 는다(XMind).
import type { Rng } from '../core/rng';
import type { EnemyDef, EnemyId, SpawnTable, StageDef } from '../data';

export type Edge = 'top' | 'right' | 'bottom' | 'left';

export interface SpawnRequest {
  enemyId: EnemyId;
  x: number;
  y: number;
  edge: Edge;
  /** 무리 안에서 몇 초 뒤에 나오는지 */
  delay: number;
}

export interface SpawnArea {
  width: number;
  height: number;
  margin: number;
}

const EDGES: readonly Edge[] = ['top', 'right', 'bottom', 'left'];
/** 나올 자리 후보 수 (가중치가 있을 때, 제안) */
const CANDIDATES = 4;

export class Spawner {
  /** 다음 무리까지 남은 시간. 첫 무리는 첫 간격의 절반 뒤 (제안: 기획서에 없음) */
  private timer: number;
  private readonly climaxSec: number;

  constructor(
    private readonly stage: StageDef,
    climaxAt: number,
    private readonly enemies: readonly EnemyDef[],
    private readonly rng: Rng,
    private area: SpawnArea,
    /** 지금 게임에 나오는 적만 */
    private readonly allowed: readonly EnemyId[],
  ) {
    this.climaxSec = stage.durationSec * climaxAt;
    this.timer = this.intervalAt(0) * 0.5;
  }

  isClimax(t: number): boolean {
    return t >= this.climaxSec;
  }

  tableAt(t: number): SpawnTable {
    return this.isClimax(t) ? this.stage.spawn.climax : this.stage.spawn.normal;
  }

  /** 구간 안에서 시작 → 끝 간격을 선형 보간 */
  intervalAt(t: number): number {
    const climax = this.isClimax(t);
    const from = climax ? this.climaxSec : 0;
    const to = climax ? this.stage.durationSec : this.climaxSec;
    const table = this.tableAt(t);
    const k = Math.min(1, Math.max(0, (t - from) / Math.max(1e-6, to - from)));
    return table.intervalStart + (table.intervalEnd - table.intervalStart) * k;
  }

  maxAliveAt(t: number): number {
    return this.tableAt(t).maxAlive;
  }

  /** 가중치와 특별 규칙(처음 몇 초는 호스틸만)을 반영해 한 종류를 고른다 */
  pickEnemy(t: number): EnemyId | null {
    const only = this.stage.spawn.onlyHostileUntilSec;
    const weights: Partial<Record<EnemyId, number>> = {};
    for (const [id, w] of Object.entries(this.tableAt(t).weights) as [EnemyId, number][]) {
      if (!this.allowed.includes(id)) continue;
      if (only !== undefined && t < only && this.enemies.find((e) => e.id === id)?.kind !== 'hostile') continue;
      weights[id] = w;
    }
    return this.rng.weighted(weights);
  }

  /** 화면 크기가 바뀜 (세로 ↔ 가로): 가장자리 점을 새 크기 기준으로 고른다 */
  setArea(width: number, height: number): void {
    this.area = { ...this.area, width, height };
  }

  /**
   * @param weightAt 화면 가장자리 점의 가중치(0~1). 있으면 후보 몇 곳 중에서 가중치에 비례해 고른다
   *   (2026-11-14: 켜진 등불 쪽에서는 덜 나옴 — systems/lampWard spawnWeight)
   */
  update(dt: number, t: number, alive: number, weightAt?: (p: { x: number; y: number }) => number): SpawnRequest[] {
    this.timer -= dt;
    if (this.timer > 0) return [];

    const room = this.maxAliveAt(t) - alive;
    // 동시 최대에 닿아 있으면 다음 프레임에 다시 본다
    if (room <= 0) return [];

    const enemyId = this.pickEnemy(t);
    this.timer = this.intervalAt(t);
    if (!enemyId) return [];

    const def = this.enemies.find((e) => e.id === enemyId);
    if (!def) return [];
    const count = Math.min(room, def.group ? this.rng.int(def.group.min, def.group.max) : 1);
    let edge = this.rng.pick(EDGES);
    let anchor = this.edgePoint(edge, def.radius);
    if (weightAt) {
      const cands = [{ edge, anchor, w: weightAt(anchor) }];
      for (let i = 1; i < CANDIDATES; i++) {
        const e = this.rng.pick(EDGES);
        const a = this.edgePoint(e, def.radius);
        cands.push({ edge: e, anchor: a, w: weightAt(a) });
      }
      const total = cands.reduce((s, c) => s + c.w, 0);
      let roll = this.rng.next() * total;
      const chosen = total > 0 ? (cands.find((c) => (roll -= c.w) < 0) ?? cands[cands.length - 1]) : cands[0];
      edge = chosen.edge;
      anchor = chosen.anchor;
    }
    const spread = def.radius * 3;

    const out: SpawnRequest[] = [];
    for (let i = 0; i < count; i++) {
      const jitter = i === 0 ? 0 : this.rng.range(-spread, spread);
      const horizontal = edge === 'top' || edge === 'bottom';
      out.push({
        enemyId,
        edge,
        x: horizontal ? clamp(anchor.x + jitter, 0, this.area.width) : anchor.x,
        y: horizontal ? anchor.y : clamp(anchor.y + jitter, 0, this.area.height),
        delay: i * (def.group?.intervalSec ?? 0),
      });
    }
    return out;
  }

  /** 화면 바깥, 해당 변 위의 한 점. 적 지름만큼 밖에서 나온다 */
  private edgePoint(edge: Edge, radius: number): { x: number; y: number } {
    const { width, height, margin } = this.area;
    const out = radius * 2;
    switch (edge) {
      case 'top':
        return { x: this.rng.range(margin, width - margin), y: -out };
      case 'bottom':
        return { x: this.rng.range(margin, width - margin), y: height + out };
      case 'left':
        return { x: -out, y: this.rng.range(margin, height - margin) };
      case 'right':
        return { x: width + out, y: this.rng.range(margin, height - margin) };
    }
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
