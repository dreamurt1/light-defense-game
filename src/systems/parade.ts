// 어둠의 행렬 (2026-11-23 밤 나들이 v3, NIGHT_RUN.md 5-1절) — 순수 로직.
// 패시브(올빼미·나방·반딧불이)는 떠돌지 않고, 빛의 영역이 넓어져 옛 길이 마을을 지나게 된 '행렬'로 맵을 가로질러 간다.
//  - 한 마리: walk → 빛을 맞으면 cower(제자리 웅크림, 말풍선) → flee(진행 방향으로 ×1.5) → walk. 반격·추적 없음(피해 0)
//  - 세 번 맞으면 돌려보냄(banished): 맵 밖으로, 그 너머에서 호스틸 1마리 (systems/anger.ts)
//  - 행렬 계획: everySec마다 한 묶음(한 종류 size마리, 0.5초 간격), 맵 한 변에서 맞은편 변으로
import type { Rng } from '../core/rng';
import type { EnemyId } from '../data';
import type { Vec } from './fan';
import type { ParadePlan } from './nightRules';
import type { Rect } from './obstacles';

export type ParadeMode = 'walk' | 'cower' | 'flee';

export interface ParadeCfg {
  hitsToBanish: number;
  cowerSec: number;
  fleeSec: number;
  fleeMultiplier: number;
}

/** 빛을 맞을 때마다 (1·2·3번째) — 호스틸의 '눈부셔..'는 쓰지 않는다 */
export const PARADE_LINES = ['싸우기 싫어..', '우린 지나가는 거야', '제발..'] as const;

/** 한 줄 사이 간격(초) */
export const PARADE_GAP_SEC = 0.5;

export class ParadeState {
  mode: ParadeMode = 'walk';
  hits = 0;
  private left = 0;

  constructor(private readonly cfg: ParadeCfg) {}

  /** 빛을 맞음: 'banished' = 세 번째(돌려보냄), 아니면 웅크림 */
  hit(): 'cower' | 'banished' {
    this.hits += 1;
    if (this.hits >= this.cfg.hitsToBanish) return 'banished';
    this.mode = 'cower';
    this.left = this.cfg.cowerSec;
    return 'cower';
  }

  /** 이번에 맞은 말풍선 */
  get line(): string {
    return PARADE_LINES[Math.min(PARADE_LINES.length, Math.max(1, this.hits)) - 1];
  }

  update(dt: number): ParadeMode {
    if (this.mode === 'walk') return this.mode;
    this.left -= dt;
    if (this.left > 0) return this.mode;
    if (this.mode === 'cower') {
      this.mode = 'flee';
      this.left = this.cfg.fleeSec;
    } else this.mode = 'walk';
    return this.mode;
  }

  /** 걷는 속도에 곱함: 웅크림 0, 도망 fleeMultiplier */
  get speedMultiplier(): number {
    return this.mode === 'cower' ? 0 : this.mode === 'flee' ? this.cfg.fleeMultiplier : 1;
  }
}

export type Edge = 'left' | 'right' | 'top' | 'bottom';
const OPPOSITE: Record<Edge, Edge> = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };

export interface ParadeGroup {
  /** 나오는 때(밤 시작부터 초) */
  atSec: number;
  kind: EnemyId;
  size: number;
  from: Edge;
  to: Edge;
  /** 변을 따라 어디쯤 (0~1) — 들어오는 곳 / 나가는 곳 */
  laneIn: number;
  laneOut: number;
}

/** 밤의 행렬 계획: everySec × 1, 2, …번째에 한 묶음씩 (밤이 끝나기 전에 다 나오게) */
export function planParades(plan: ParadePlan | null, durationSec: number, rng: Rng): ParadeGroup[] {
  if (!plan || plan.groups <= 0) return [];
  const out: ParadeGroup[] = [];
  const edges: Edge[] = ['left', 'right', 'top', 'bottom'];
  for (let i = 0; i < plan.groups; i++) {
    const atSec = plan.everySec * (i + 1);
    if (atSec + plan.size * PARADE_GAP_SEC >= durationSec * 0.95) break;
    const from = rng.pick(edges);
    out.push({ atSec, kind: rng.pick(plan.kinds), size: plan.size, from, to: OPPOSITE[from], laneIn: rng.range(0.25, 0.75), laneOut: rng.range(0.25, 0.75) });
  }
  return out;
}

/** 변 위의 한 점 (area 바깥으로 out만큼) */
export function edgePoint(edge: Edge, lane: number, area: Rect, out = 80): Vec {
  switch (edge) {
    case 'left':
      return { x: area.x - out, y: area.y + area.h * lane };
    case 'right':
      return { x: area.x + area.w + out, y: area.y + area.h * lane };
    case 'top':
      return { x: area.x + area.w * lane, y: area.y - out };
    default:
      return { x: area.x + area.w * lane, y: area.y + area.h + out };
  }
}

/** 행렬이 지나갔는가: 나가는 점에 닿았거나 맞은편 변 밖 */
export function passedEdge(p: Vec, to: Edge, area: Rect): boolean {
  switch (to) {
    case 'left':
      return p.x < area.x - 40;
    case 'right':
      return p.x > area.x + area.w + 40;
    case 'top':
      return p.y < area.y - 40;
    default:
      return p.y > area.y + area.h + 40;
  }
}
