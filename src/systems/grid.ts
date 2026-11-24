// 격자 맵 (2026-11-23 밤 나들이 v3, NIGHT_RUN.md 7절) — 순수 로직. 다른 파일을 가져오지 않는다:
// scripts/map-check.mjs가 node로 바로 읽는다(타입만 지우면 되는 문법만 — enum·namespace·매개변수 속성 없음).
//  - 33×19칸, 한 칸 96px, (0,0) 왼쪽 위, 칸 중심 = 칸×96 + 48
//  - 맵 = ASCII 19줄(문자 범례는 사전 chars). 이어진 같은 문자의 직사각형 = 장애물 하나(1×1만 있는 종류는 칸마다)
//  - 빛 차단: 쏜 칸과 맞는 칸 사이를 브레젠험으로 따라가 빛을 막는 칸이 있으면 막힘(양 끝 칸은 뺌)

export interface GridVec {
  x: number;
  y: number;
}

export interface KindDef {
  sizes?: number[][];
  line?: boolean;
  split?: boolean;
  walk: boolean;
  blocksLight: boolean;
  fliersOver?: boolean;
  frameOk?: boolean;
  hide?: boolean;
}

export interface GridDict {
  cell: number;
  cols: number;
  rows: number;
  plaza: { col0: number; col1: number; row0: number; row1: number };
  lampCount: number;
  lampDist: [number, number];
  chars: Record<string, string>;
  kinds: Record<string, KindDef>;
}

export interface GridMap {
  id: string;
  name: string;
  band: string;
  theme: string;
  rows: string[];
}

/** 장애물 하나 (칸 단위) */
export interface Blob {
  kind: string;
  col: number;
  row: number;
  w: number;
  h: number;
}

export interface Cell {
  col: number;
  row: number;
}

export function kindAt(map: GridMap, dict: GridDict, col: number, row: number): string {
  const ch = map.rows[row]?.[col];
  return ch === undefined ? 'outside' : (dict.chars[ch] ?? 'unknown');
}

export function cellCenter(col: number, row: number, dict: GridDict): GridVec {
  return { x: col * dict.cell + dict.cell / 2, y: row * dict.cell + dict.cell / 2 };
}

export function cellOf(p: GridVec, dict: GridDict): Cell {
  return { col: Math.floor(p.x / dict.cell), row: Math.floor(p.y / dict.cell) };
}

export function blobRect(b: Blob, dict: GridDict): { x: number; y: number; w: number; h: number } {
  return { x: b.col * dict.cell, y: b.row * dict.cell, w: b.w * dict.cell, h: b.h * dict.cell };
}

/** 이어진 같은 문자의 덩어리 (바닥·광장 제외). split 종류는 칸마다 */
export function parseBlobs(map: GridMap, dict: GridDict): (Blob & { cells: number; rect: boolean })[] {
  const out: (Blob & { cells: number; rect: boolean })[] = [];
  const seen = map.rows.map((r) => Array.from(r, () => false));
  for (let row = 0; row < map.rows.length; row++) {
    for (let col = 0; col < map.rows[row].length; col++) {
      const kind = kindAt(map, dict, col, row);
      if (seen[row][col] || kind === 'floor' || kind === 'plaza') continue;
      const ch = map.rows[row][col];
      if (dict.kinds[kind]?.split) {
        seen[row][col] = true;
        out.push({ kind, col, row, w: 1, h: 1, cells: 1, rect: true });
        continue;
      }
      const stack: Cell[] = [{ col, row }];
      seen[row][col] = true;
      let c0 = col;
      let c1 = col;
      let r0 = row;
      let r1 = row;
      let cells = 0;
      while (stack.length) {
        const c = stack.pop() as Cell;
        cells++;
        c0 = Math.min(c0, c.col);
        c1 = Math.max(c1, c.col);
        r0 = Math.min(r0, c.row);
        r1 = Math.max(r1, c.row);
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nc = c.col + dc;
          const nr = c.row + dr;
          if (nr < 0 || nr >= map.rows.length || nc < 0 || nc >= map.rows[nr].length) continue;
          if (seen[nr][nc] || map.rows[nr][nc] !== ch) continue;
          seen[nr][nc] = true;
          stack.push({ col: nc, row: nr });
        }
      }
      const w = c1 - c0 + 1;
      const h = r1 - r0 + 1;
      out.push({ kind, col: c0, row: r0, w, h, cells, rect: cells === w * h });
    }
  }
  return out;
}

/** 칸마다: 걸어서 지나갈 수 있는가 */
export function walkGrid(map: GridMap, dict: GridDict): boolean[][] {
  return map.rows.map((r, row) => Array.from(r, (_c, col) => !!dict.kinds[kindAt(map, dict, col, row)]?.walk));
}

/** 칸마다: 빛을 막는가 */
export function lightGrid(map: GridMap, dict: GridDict): boolean[][] {
  return map.rows.map((r, row) => Array.from(r, (_c, col) => !!dict.kinds[kindAt(map, dict, col, row)]?.blocksLight));
}

export function plazaCenter(dict: GridDict): Cell {
  return { col: Math.floor((dict.plaza.col0 + dict.plaza.col1) / 2), row: Math.floor((dict.plaza.row0 + dict.plaza.row1) / 2) };
}

/** 4방향으로 이어진 걷는 칸 (광장 가운데에서) — 거리(칸 수)도 함께 */
export function reachFromPlaza(map: GridMap, dict: GridDict): number[][] {
  const walk = walkGrid(map, dict);
  const dist = map.rows.map((r) => Array.from(r, () => -1));
  const s = plazaCenter(dict);
  const q: Cell[] = [s];
  dist[s.row][s.col] = 0;
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c.col + dc;
      const nr = c.row + dr;
      if (nr < 0 || nr >= walk.length || nc < 0 || nc >= walk[nr].length) continue;
      if (dist[nr][nc] >= 0 || !walk[nr][nc]) continue;
      dist[nr][nc] = dist[c.row][c.col] + 1;
      q.push({ col: nc, row: nr });
    }
  }
  return dist;
}

/** 등불 자리 L 칸들 (위에서 아래, 왼쪽에서 오른쪽 순) */
export function lampCells(map: GridMap, dict: GridDict): Cell[] {
  const out: Cell[] = [];
  map.rows.forEach((r, row) => Array.from(r).forEach((_c, col) => kindAt(map, dict, col, row) === 'lamp' && out.push({ col, row })));
  return out;
}

const isFrame = (c: Cell, dict: GridDict) => c.row === 0 || c.col === 0 || c.row === dict.rows - 1 || c.col === dict.cols - 1;

/** 광장 가운데에서 가로·세로 중 큰 값(칸) */
export function plazaDist(c: Cell, dict: GridDict): number {
  const pc = plazaCenter(dict);
  return Math.max(Math.abs(c.col - pc.col), Math.abs(c.row - pc.row));
}

/**
 * 맵 검사 (scripts/map-check.mjs, tests/maps.test.ts) — 문제마다 한 줄, 없으면 빈 배열.
 * lampDist = 등불 자리 거리(구간마다 다를 수 있음 — 2026-11-24 A 구간 4~6, 없으면 사전 값)
 */
export function checkMap(map: GridMap, dict: GridDict, lampDist: [number, number] = dict.lampDist): string[] {
  const err: string[] = [];
  if (map.rows.length !== dict.rows) err.push(`줄 수 ${map.rows.length} (${dict.rows}이어야)`);
  map.rows.forEach((r, row) => r.length !== dict.cols && err.push(`${row}행 폭 ${r.length} (${dict.cols}이어야)`));
  if (err.length) return err;
  map.rows.forEach((r, row) =>
    Array.from(r).forEach((ch, col) => {
      if (!dict.chars[ch]) err.push(`(${col},${row}) 모르는 문자 '${ch}'`);
      const inPlaza = col >= dict.plaza.col0 && col <= dict.plaza.col1 && row >= dict.plaza.row0 && row <= dict.plaza.row1;
      if (inPlaza !== (dict.chars[ch] === 'plaza')) err.push(`(${col},${row}) 광장 ${inPlaza ? '안이 비어 있지 않음' : '밖의 C'}`);
    }),
  );
  for (const b of parseBlobs(map, dict)) {
    const k = dict.kinds[b.kind];
    if (!k) continue;
    const at = `${b.kind}@(${b.col},${b.row}) ${b.w}×${b.h}`;
    if (!b.rect) err.push(`${at} 직사각형이 아님`);
    else if (k.line ? b.w !== 1 && b.h !== 1 : !(k.sizes ?? []).some(([w, h]) => (w === b.w && h === b.h) || (w === b.h && h === b.w))) err.push(`${at} 사전에 없는 크기`);
    if (!k.frameOk) {
      for (let r = b.row; r < b.row + b.h; r++) for (let c = b.col; c < b.col + b.w; c++) if (isFrame({ col: c, row: r }, dict)) err.push(`${at} 가장자리 칸(${c},${r})에 있음`);
    }
  }
  const dist = reachFromPlaza(map, dict);
  const walk = walkGrid(map, dict);
  walk.forEach((r, row) => r.forEach((w, col) => w && dist[row][col] < 0 && err.push(`(${col},${row}) 광장에서 갈 수 없는 칸`)));
  const lamps = lampCells(map, dict);
  if (lamps.length !== dict.lampCount) err.push(`등불 자리 ${lamps.length}개 (${dict.lampCount}개여야)`);
  for (const l of lamps) {
    const d = plazaDist(l, dict);
    if (d < lampDist[0] || d > lampDist[1]) err.push(`등불 자리 (${l.col},${l.row}) 광장 가운데에서 ${d}칸 (${lampDist[0]}~${lampDist[1]}칸이어야)`);
  }
  const has = (kind: string) => map.rows.some((r, row) => Array.from(r).some((_c, col) => kindAt(map, dict, col, row) === kind));
  if (has('river') && !has('bridge')) err.push('강이 있는데 다리가 없음');
  return err;
}

/** 브레젠험: a 칸과 b 칸 사이(양 끝 제외)에 막는 칸이 있는가 */
export function cellsBlocked(block: boolean[][], a: Cell, b: Cell): boolean {
  let x = a.col;
  let y = a.row;
  const dx = Math.abs(b.col - a.col);
  const dy = -Math.abs(b.row - a.row);
  const sx = a.col < b.col ? 1 : -1;
  const sy = a.row < b.row ? 1 : -1;
  let e = dx + dy;
  for (;;) {
    if (x === b.col && y === b.row) return false;
    if (!(x === a.col && y === a.row) && block[y]?.[x]) return true;
    const e2 = 2 * e;
    if (e2 >= dy) {
      e += dy;
      x += sx;
    }
    if (e2 <= dx) {
      e += dx;
      y += sy;
    }
  }
}

/** 월드 점 a → b의 빛이 막히는가 */
export function lineBlocked(block: boolean[][], dict: GridDict, a: GridVec, b: GridVec): boolean {
  return cellsBlocked(block, cellOf(a, dict), cellOf(b, dict));
}

/** origin에서 angle 쪽으로 처음 막히는 칸까지의 거리 (없으면 maxDist) — 조준 원뿔·빛 별을 그 자리에서 끊는다 */
export function firstBlockDist(block: boolean[][], dict: GridDict, origin: GridVec, angle: number, maxDist: number): number {
  const step = dict.cell / 4;
  const start = cellOf(origin, dict);
  for (let d = step; d < maxDist; d += step) {
    const c = cellOf({ x: origin.x + Math.cos(angle) * d, y: origin.y + Math.sin(angle) * d }, dict);
    if ((c.col !== start.col || c.row !== start.row) && block[c.row]?.[c.col]) {
      // 그 칸의 가장자리까지 (칸 중심보다 조금 앞)
      return Math.max(dict.cell / 2, d - step / 2);
    }
  }
  return maxDist;
}

/**
 * 광장에서 먼 바닥 칸 n곳 (빛을 잃은 친구 자리 등) — 네 귀퉁이 쪽에서 하나씩 고르고 가장자리 칸은 뺀다.
 * 4방향 걸음 수로 멀수록
 */
export function farFloorCells(map: GridMap, dict: GridDict, n = 4): Cell[] {
  const dist = reachFromPlaza(map, dict);
  const pc = plazaCenter(dict);
  const quad = (c: Cell) => (c.col < pc.col ? 0 : 1) + (c.row < pc.row ? 0 : 2);
  const best: (Cell & { d: number })[] = [];
  map.rows.forEach((r, row) =>
    Array.from(r).forEach((_ch, col) => {
      if (kindAt(map, dict, col, row) !== 'floor' || isFrame({ col, row }, dict) || dist[row][col] < 0) return;
      const q = quad({ col, row });
      const d = dist[row][col];
      if (!best[q] || d > best[q].d) best[q] = { col, row, d };
    }),
  );
  return best.filter(Boolean).sort((a, b) => b.d - a.d).slice(0, n).map(({ col, row }) => ({ col, row }));
}

/**
 * 빛을 잃은 친구 자리 후보 (2026-11-24 다듬기 1차): 광장 가운데에서 가로·세로 중 큰 값이 dist 범위인 바닥 칸
 * (가장자리 칸은 빼고, 광장에서 걸어갈 수 있는 칸만 — 울타리 고리 안쪽이어도 됨). 판이 seed로 하나를 고른다
 */
export function friendSpotCells(map: GridMap, dict: GridDict, dist: [number, number]): Cell[] {
  const reach = reachFromPlaza(map, dict);
  const out: Cell[] = [];
  map.rows.forEach((r, row) =>
    Array.from(r).forEach((_ch, col) => {
      const c = { col, row };
      if (kindAt(map, dict, col, row) !== 'floor' || isFrame(c, dict) || reach[row][col] < 0) return;
      const d = plazaDist(c, dict);
      if (d >= dist[0] && d <= dist[1]) out.push(c);
    }),
  );
  return out;
}

/** 판정 사각형을 칸보다 이만큼 안쪽으로 (그림 가장자리에서 걸리지 않게) — 길찾기·빛 차단은 칸 단위 그대로 */
const COLLIDE_INSET: Record<string, number> = { rock: 14, barrel: 20, hay: 10, house: 6, river: 0 };
/** 울타리 판정 두께(칸 가운데 줄) */
const FENCE_THICK = 48;

/** 걸어서 못 지나가는 장애물의 판정 사각형 (월드 좌표, entities/MapProps.ts·systems/obstacles.ts) */
export function collisionRects(map: GridMap, dict: GridDict): { x: number; y: number; w: number; h: number }[] {
  const out: { x: number; y: number; w: number; h: number }[] = [];
  for (const b of parseBlobs(map, dict)) {
    if (dict.kinds[b.kind]?.walk !== false) continue;
    const r = blobRect(b, dict);
    if (b.kind === 'fence') {
      out.push(r.w >= r.h ? { x: r.x, y: r.y + r.h / 2 - FENCE_THICK / 2, w: r.w, h: FENCE_THICK } : { x: r.x + r.w / 2 - FENCE_THICK / 2, y: r.y, w: FENCE_THICK, h: r.h });
      continue;
    }
    const d = COLLIDE_INSET[b.kind] ?? 8;
    out.push({ x: r.x + d, y: r.y + d, w: Math.max(4, r.w - d * 2), h: Math.max(4, r.h - d * 2) });
  }
  return out;
}

/** 숨을 수 있는 풀숲 사각형 */
export function bushRects(map: GridMap, dict: GridDict): { x: number; y: number; w: number; h: number }[] {
  return parseBlobs(map, dict)
    .filter((b) => dict.kinds[b.kind]?.hide)
    .map((b) => blobRect(b, dict));
}
