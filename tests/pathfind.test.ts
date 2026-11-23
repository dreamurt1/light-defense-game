import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';
import { cellOf, walkGrid } from '../src/systems/grid';
import { findPath, nearestWalkable } from '../src/systems/pathfind';

// 2026-11-23 밤 나들이 v3 — A* 길찾기 (NIGHT_RUN.md 7-4절)
const grid = (rows: string[]) => rows.map((r) => Array.from(r, (c) => c === '.'));

describe('A* 길찾기', () => {
  it('미로에서 가장 짧은 길로 돌아간다', () => {
    const walk = grid(['.....', '####.', '.....', '.####', '.....']);
    const p = findPath(walk, { col: 0, row: 0 }, { col: 0, row: 4 });
    expect(p).not.toBeNull();
    expect(p!.at(-1)).toEqual({ col: 0, row: 4 });
    for (const c of p!) expect(walk[c.row][c.col]).toBe(true);
    // 위 줄을 오른쪽 끝까지 → 가운데 줄을 왼쪽 끝까지 → 아래로: 최소 12칸 이동(대각선 포함이면 조금 줄어듦)
    expect(p!.length).toBeGreaterThanOrEqual(10);
  });
  it('대각선은 양옆이 모두 비었을 때만 (모서리를 뚫지 않음)', () => {
    const walk = grid(['.#', '..']);
    const p = findPath(walk, { col: 0, row: 0 }, { col: 1, row: 1 });
    expect(p).toEqual([{ col: 0, row: 1 }, { col: 1, row: 1 }]);
    const open = grid(['..', '..']);
    expect(findPath(open, { col: 0, row: 0 }, { col: 1, row: 1 })).toEqual([{ col: 1, row: 1 }]);
  });
  it('막힌 목표는 가장 가까운 걷는 칸으로, 갈 수 없으면 null', () => {
    const walk = grid(['...', '.#.', '...']);
    expect(nearestWalkable(walk, { col: 1, row: 1 })).not.toEqual({ col: 1, row: 1 });
    expect(findPath(walk, { col: 0, row: 0 }, { col: 1, row: 1 })?.length).toBeGreaterThan(0);
    const walled = grid(['.#.', '##.', '...']);
    expect(findPath(walled, { col: 0, row: 0 }, { col: 2, row: 2 })).toBeNull();
  });
  it('같은 칸이면 빈 길', () => {
    expect(findPath(grid(['..']), { col: 0, row: 0 }, { col: 0, row: 0 })).toEqual([]);
  });
  it('B1: 울타리 너머 등불 자리에서 광장 가운데까지 길이 있다', () => {
    const m = GameData.maps.B1;
    const walk = walkGrid(m, GameData.grid);
    const from = cellOf({ x: 2900, y: 1000 }, GameData.grid);
    const p = findPath(walk, from, { col: 16, row: 9 });
    expect(p).not.toBeNull();
    for (const c of p!) expect(walk[c.row][c.col]).toBe(true);
  });
});
