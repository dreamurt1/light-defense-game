// waves.json 기반 스폰. 무엇을 언제 어디서 낼지는 순수 로직이고, 실제 생성은 PlayScene이 한다.
import type { Rng } from '../core/rng';
import type { EnemyDef, EnemyId, WavePhaseDef, WavesDef } from '../data';

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

export class Spawner {
  /** 다음 무리까지 남은 시간. 첫 무리는 첫 간격의 절반 뒤 (제안: 기획서에 없음) */
  private timer: number;

  constructor(
    private readonly waves: WavesDef,
    private readonly enemies: readonly EnemyDef[],
    private readonly rng: Rng,
    private area: SpawnArea,
    /** 아직 구현된 악당만. M1은 ['bat'] */
    private readonly allowed: readonly EnemyId[],
  ) {
    this.timer = this.intervalAt(0) * 0.5;
  }

  phaseAt(t: number): WavePhaseDef {
    const phases = this.waves.phases;
    return phases.find((p) => t >= p.from && t < p.to) ?? phases[phases.length - 1];
  }

  /** 구간 안에서 시작 → 끝 간격을 선형 보간 */
  intervalAt(t: number): number {
    const p = this.phaseAt(t);
    const k = Math.min(1, Math.max(0, (t - p.from) / (p.to - p.from)));
    return p.spawnIntervalStart + (p.spawnIntervalEnd - p.spawnIntervalStart) * k;
  }

  maxAliveAt(t: number): number {
    return this.phaseAt(t).maxAlive;
  }

  /** 시간대 가중치와 특별 규칙을 반영해 한 종류를 고른다 */
  pickEnemy(t: number): EnemyId | null {
    const p = this.phaseAt(t);
    const weights: Partial<Record<EnemyId, number>> = {};
    for (const [id, w] of Object.entries(p.weights) as [EnemyId, number][]) {
      if (!this.allowed.includes(id)) continue;
      if (p.rules?.onlyBatUntilSec !== undefined && t < p.rules.onlyBatUntilSec && id !== 'bat') continue;
      if (p.rules?.slimeFromSec !== undefined && t < p.rules.slimeFromSec && id === 'slime') continue;
      weights[id] = w;
    }
    return this.rng.weighted(weights);
  }

  /** 화면 크기가 바뀜 (세로 ↔ 가로): 가장자리 점을 새 크기 기준으로 고른다 */
  setArea(width: number, height: number): void {
    this.area = { ...this.area, width, height };
  }

  update(dt: number, t: number, alive: number): SpawnRequest[] {
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
    const edge = this.rng.pick(EDGES);
    const anchor = this.edgePoint(edge, def.radius);
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

  /** 화면 바깥, 해당 변 위의 한 점. 악당 지름만큼 밖에서 나온다 */
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
