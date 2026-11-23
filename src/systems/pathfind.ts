// 길찾기 (2026-11-23 밤 나들이 v3, NIGHT_RUN.md 7-4절) — 순수 A*.
//  - 4방향 + 대각선(양옆 칸이 모두 걸을 수 있을 때만 — 모서리를 비스듬히 뚫고 지나가지 않게)
//  - 목표 칸이 막혀 있으면 가장 가까운 걷는 칸으로 (예: 집 앞의 루미)
//  - 걷는 적(웨어울프·개구리·고슴도치·레서판다)과 행렬이 쓴다. 나는 적은 직선(scenes/play/GridWorld.ts)
import type { Cell } from './grid';

const SQRT2 = Math.SQRT2;
const DIRS: readonly [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, SQRT2],
  [1, -1, SQRT2],
  [-1, 1, SQRT2],
  [-1, -1, SQRT2],
];

const ok = (walk: readonly (readonly boolean[])[], c: number, r: number) => r >= 0 && r < walk.length && c >= 0 && c < walk[r].length && walk[r][c];

/** 막힌 칸이면 가장 가까운 걷는 칸 (반지름 maxR 안, 없으면 null) */
export function nearestWalkable(walk: readonly (readonly boolean[])[], at: Cell, maxR = 4): Cell | null {
  if (ok(walk, at.col, at.row)) return at;
  for (let r = 1; r <= maxR; r++) {
    let best: Cell | null = null;
    let bestD = Infinity;
    for (let dr = -r; dr <= r; dr++) {
      for (let dc = -r; dc <= r; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== r || !ok(walk, at.col + dc, at.row + dr)) continue;
        const d = dc * dc + dr * dr;
        if (d < bestD) {
          bestD = d;
          best = { col: at.col + dc, row: at.row + dr };
        }
      }
    }
    if (best) return best;
  }
  return null;
}

/** from → to 칸 경로 (from 다음 칸부터 to까지). 못 가면 null, 같은 칸이면 [] */
export function findPath(walk: readonly (readonly boolean[])[], from: Cell, to: Cell): Cell[] | null {
  const start = nearestWalkable(walk, from, 2);
  const goal = nearestWalkable(walk, to);
  if (!start || !goal) return null;
  if (start.col === goal.col && start.row === goal.row) return [];
  const rows = walk.length;
  const cols = walk[0]?.length ?? 0;
  const idx = (c: number, r: number) => r * cols + c;
  const g = new Float64Array(rows * cols).fill(Infinity);
  const came = new Int32Array(rows * cols).fill(-1);
  const closed = new Uint8Array(rows * cols);
  const h = (c: number, r: number) => {
    const dx = Math.abs(c - goal.col);
    const dy = Math.abs(r - goal.row);
    return dx + dy + (SQRT2 - 2) * Math.min(dx, dy);
  };
  // 작은 격자(33×19)라 배열 힙 대신 단순 열린 목록
  const open: number[] = [idx(start.col, start.row)];
  g[open[0]] = 0;
  const f = new Float64Array(rows * cols).fill(Infinity);
  f[open[0]] = h(start.col, start.row);
  const goalI = idx(goal.col, goal.row);
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (f[open[i]] < f[open[bi]]) bi = i;
    const cur = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    if (cur === goalI) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cc = cur % cols;
    const cr = (cur - cc) / cols;
    for (const [dc, dr, cost] of DIRS) {
      const nc = cc + dc;
      const nr = cr + dr;
      if (!ok(walk, nc, nr)) continue;
      // 대각선은 양옆이 모두 비었을 때만
      if (dc !== 0 && dr !== 0 && (!ok(walk, cc + dc, cr) || !ok(walk, cc, cr + dr))) continue;
      const ni = idx(nc, nr);
      if (closed[ni]) continue;
      const ng = g[cur] + cost;
      if (ng >= g[ni]) continue;
      g[ni] = ng;
      f[ni] = ng + h(nc, nr);
      came[ni] = cur;
      open.push(ni);
    }
  }
  if (came[goalI] < 0) return null;
  const path: Cell[] = [];
  for (let i = goalI; i !== idx(start.col, start.row); i = came[i]) path.push({ col: i % cols, row: Math.floor(i / cols) });
  return path.reverse();
}
