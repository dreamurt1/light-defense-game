// 판 위의 격자 맵 (2026-11-23 밤 나들이 v3, NIGHT_RUN.md 7절) — 이번 판의 맵(33×19)과 그 쓰임:
//  - 등불 자리(맵의 L 4곳) · 빛을 잃은 친구 자리(광장에서 먼 바닥 칸 4곳) · 랜덤 이벤트의 먼 자리
//  - 빛 차단: 루미 → 대상 직선이 빛을 막는 칸(바위·집·술통·건초·울타리)을 지나면 맞지 않음, 조준 원뿔·빛 별은 처음 막히는 거리에서 끊음
//  - 길찾기: 걷는 적·행렬은 목표가 바뀔 때와 1초마다 A* 경로를 받아 다음 칸 중심으로 걷는다(한 틱에 최대 4마리 — 줄 세움). 나는 적은 직선
// 순수 계산은 systems/grid.ts·pathfind.ts.
import { GameData, gridMapById, type StageDef } from '../../data';
import type { Vec } from '../../systems/fan';
import { Rng } from '../../core/rng';
import { cellCenter, cellOf, farFloorCells, firstBlockDist, friendSpotCells, lampCells, lightGrid, lineBlocked, walkGrid, type Cell, type GridMap } from '../../systems/grid';
import type { NightDef } from '../../systems/nightRules';
import { findPath } from '../../systems/pathfind';

const D = GameData.grid;
/** 등불 밑동 = 칸 중심에서 조금 아래 (등불 그림이 칸 안에 서게) */
const LAMP_FOOT_DY = 22;
/** 경로를 다시 받는 간격(초) */
const REPATH_SEC = 1;
/** 한 틱에 계산하는 경로 수 */
const PATHS_PER_TICK = 4;
/** 웨이포인트에 이만큼 다가가면 다음 칸으로 */
const REACH = D.cell * 0.45;

/** 이번 판의 맵 id: 런의 밤이면 밤 규칙의 맵, 튜토리얼·트라이얼은 A1 */
export function mapIdFor(stage: StageDef): string {
  return (stage as Partial<NightDef>).mapId ?? 'A1';
}

/** 적이 길을 물어볼 때 (Enemy·Creature) */
export interface PathProvider {
  /** 목표 쪽으로 가는 다음 칸 중심 (아직 경로가 없으면 null = 곧게) */
  waypoint(who: { uid: number; x: number; y: number }, goal: Vec): Vec | null;
}

interface PathEntry {
  goal: Cell;
  path: Cell[] | null;
  i: number;
  age: number;
  queued: boolean;
}

class Paths implements PathProvider {
  private readonly entries = new Map<number, PathEntry>();
  private readonly queue: { uid: number; from: Cell }[] = [];
  private seen = new Set<number>();
  /** 걷는 칸 − 켜진 등불의 결계 안 칸 (결계를 지나는 경로는 결계에 밀려 제자리에 서므로, 2026-11-23) */
  private open: boolean[][];
  private wardKey = '';

  constructor(private readonly walk: boolean[][]) {
    this.open = walk;
  }

  /** 켜진 등불의 결계 (EnemyTarget.ward) — 바뀌었을 때만 칸 표를 다시 만든다 */
  setWards(targets: readonly { x: number; y: number; ward?: number }[]): void {
    const wards = targets.filter((t) => (t.ward ?? 0) > 0);
    const key = wards.map((w) => `${Math.round(w.x)},${Math.round(w.y)},${Math.round((w.ward ?? 0) / 24)}`).join('|');
    if (key === this.wardKey) return;
    this.wardKey = key;
    this.open = this.walk.map((row, r) =>
      row.map((ok, c) => {
        if (!ok) return false;
        const p = cellCenter(c, r, D);
        return !wards.some((w) => Math.hypot(p.x - w.x, p.y - w.y) < (w.ward ?? 0) + 20);
      }),
    );
  }

  waypoint(who: { uid: number; x: number; y: number }, goal: Vec): Vec | null {
    this.seen.add(who.uid);
    const g = clampCell(cellOf(goal, D));
    let e = this.entries.get(who.uid);
    if (!e) {
      e = { goal: g, path: null, i: 0, age: 0, queued: false };
      this.entries.set(who.uid, e);
    }
    const goalMoved = e.goal.col !== g.col || e.goal.row !== g.row;
    if ((goalMoved || e.age >= REPATH_SEC || !e.path) && !e.queued) {
      e.goal = g;
      e.queued = true;
      this.queue.push({ uid: who.uid, from: clampCell(cellOf(who, D)) });
    }
    if (!e.path) return null;
    // 다가간 칸은 건너뛴다
    while (e.i < e.path.length) {
      const c = cellCenter(e.path[e.i].col, e.path[e.i].row, D);
      if (Math.hypot(c.x - who.x, c.y - who.y) > REACH) break;
      e.i++;
    }
    if (e.i >= e.path.length) return null;
    const c = e.path[e.i];
    return cellCenter(c.col, c.row, D);
  }

  /** 매 프레임: 줄 선 경로를 최대 PATHS_PER_TICK개 계산, 사라진 적은 잊는다 */
  tick(dt: number): void {
    for (const e of this.entries.values()) e.age += dt;
    for (let n = 0; n < PATHS_PER_TICK && this.queue.length; n++) {
      const q = this.queue.shift() as { uid: number; from: Cell };
      const e = this.entries.get(q.uid);
      if (!e) continue;
      e.path = findPath(this.open, q.from, e.goal) ?? findPath(this.walk, q.from, e.goal);
      e.i = 0;
      e.age = 0;
      e.queued = false;
    }
    // 이번 프레임에 묻지 않은 적(사라짐·나는 적이 됨)은 잊는다
    for (const uid of [...this.entries.keys()]) if (!this.seen.has(uid) && !this.entries.get(uid)?.queued) this.entries.delete(uid);
    this.seen = new Set();
  }
}

function clampCell(c: Cell): Cell {
  return { col: Math.min(D.cols - 1, Math.max(0, c.col)), row: Math.min(D.rows - 1, Math.max(0, c.row)) };
}

export class GridWorld {
  readonly map: GridMap;
  readonly walk: boolean[][];
  private readonly light: boolean[][];
  readonly paths: Paths;

  constructor(mapId: string) {
    this.map = gridMapById(mapId);
    this.walk = walkGrid(this.map, D);
    this.light = lightGrid(this.map, D);
    this.paths = new Paths(this.walk);
  }

  /** 등불 자리 후보 (맵의 L 4곳, 등불 밑동 좌표) */
  stationSpots(): Vec[] {
    return lampCells(this.map, D).map((c) => {
      const p = cellCenter(c.col, c.row, D);
      return { x: p.x, y: p.y + LAMP_FOOT_DY };
    });
  }

  /** 광장에서 먼 바닥 칸 4곳 (랜덤 이벤트) */
  farSpots(): Vec[] {
    return farFloorCells(this.map, D).map((c) => cellCenter(c.col, c.row, D));
  }

  /** 빛을 잃은 친구 자리 (2026-11-24): 광장에서 rescue.spotDist(6~9칸) 바닥 칸 중 seed로 하나, 없으면 먼 바닥 칸 */
  friendSpots(seed: number): Vec[] {
    const cells = friendSpotCells(this.map, D, GameData.nights.rescue.spotDist);
    if (!cells.length) return this.farSpots();
    const c = new Rng(seed).pick(cells);
    return [cellCenter(c.col, c.row, D)];
  }

  /** a → b 빛이 막히는가 */
  blocked(a: Vec, b: Vec): boolean {
    return lineBlocked(this.light, D, a, b);
  }

  /** 조준 원뿔·빛 별을 처음 막히는 거리에서 끊는다 */
  clip(origin: Vec, angle: number, range: number): number {
    return firstBlockDist(this.light, D, origin, angle, range);
  }
}
