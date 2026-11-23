import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';
import { cellCenter, cellOf, cellsBlocked, checkMap, farFloorCells, firstBlockDist, lampCells, lightGrid, lineBlocked, parseBlobs, walkGrid, type GridMap } from '../src/systems/grid';

// 2026-11-23 밤 나들이 v3 — 격자 맵 (NIGHT_RUN.md 7절)
const D = GameData.grid;
const map = (rows: string[]): GridMap => ({ id: 't', name: 't', band: 'A', theme: 'light-village', rows });

describe('격자 규격', () => {
  it('33×19칸, 한 칸 96px, 칸 중심 = 칸×96 + 48', () => {
    expect([D.cols, D.rows, D.cell]).toEqual([33, 19, 96]);
    expect(cellCenter(0, 0, D)).toEqual({ x: 48, y: 48 });
    expect(cellCenter(16, 9, D)).toEqual({ x: 1584, y: 912 });
    expect(cellOf({ x: 1600, y: 900 }, D)).toEqual({ col: 16, row: 9 }); // 중앙 광원은 광장 가운데 칸
  });
  it('이어진 같은 문자의 직사각형 = 장애물 하나, 술통은 칸마다', () => {
    const blobs = parseBlobs(map(['HH.T', 'HH.T', '....']), D);
    expect(blobs.map((b) => `${b.kind}${b.w}x${b.h}`)).toEqual(['house2x2', 'barrel1x1', 'barrel1x1']);
  });
});

describe('맵 3장 검사 (scripts/map-check.mjs와 같은 규칙)', () => {
  for (const [id, m] of Object.entries(GameData.maps)) {
    it(`${id} ${m.name}`, () => {
      expect(checkMap(m, D)).toEqual([]);
      expect(lampCells(m, D)).toHaveLength(4);
    });
  }
  it('밤 구간의 맵이 모두 있다', () => {
    for (const b of GameData.nights.bands) for (const id of b.maps) expect(GameData.maps[id], id).toBeTruthy();
  });
  it('틀린 맵은 어느 칸인지 알려 준다', () => {
    const rows = [...GameData.maps.A1.rows];
    rows[1] = 'R' + rows[1].slice(1); // 가장자리 칸에 바위
    rows[9] = rows[9].slice(0, 13) + '.' + rows[9].slice(14); // 광장 비움 깨짐
    const errs = checkMap(map(rows), D);
    expect(errs.some((e) => e.includes('가장자리 칸(0,1)'))).toBe(true);
    expect(errs.some((e) => e.includes('(13,9) 광장'))).toBe(true);
  });
});

describe('빛 차단 (바위·집·술통·건초·울타리는 막고, 풀숲·강·다리는 안 막음)', () => {
  const m = map(['.....', '..R..', '.....', '..G..', '.....']);
  const block = lightGrid(m, D);
  it('바위 너머는 막힘, 풀숲 너머는 맞음', () => {
    expect(cellsBlocked(block, { col: 2, row: 0 }, { col: 2, row: 2 })).toBe(true);
    expect(cellsBlocked(block, { col: 2, row: 2 }, { col: 2, row: 4 })).toBe(false);
    expect(cellsBlocked(block, { col: 0, row: 0 }, { col: 4, row: 0 })).toBe(false);
  });
  it('쏜 칸·맞는 칸 자체는 막지 않는다 (바위 위의 박쥐도 맞음)', () => {
    expect(cellsBlocked(block, { col: 2, row: 0 }, { col: 2, row: 1 })).toBe(false);
    expect(lineBlocked(block, D, cellCenter(0, 1, D), cellCenter(2, 1, D))).toBe(false);
  });
  it('처음 막히는 거리: 오른쪽 바위까지 / 없으면 최대', () => {
    const d = firstBlockDist(block, D, cellCenter(0, 1, D), 0, 500);
    expect(d).toBeGreaterThan(96);
    expect(d).toBeLessThan(2 * 96);
    expect(firstBlockDist(block, D, cellCenter(0, 4, D), 0, 400)).toBe(400);
  });
  it('강·다리는 빛을 막지 않지만 걸어서는 강을 못 건넌다', () => {
    const r = map(['.W.', '.B.', '.W.']);
    expect(lightGrid(r, D)[0][1]).toBe(false);
    expect(walkGrid(r, D)[0][1]).toBe(false);
    expect(walkGrid(r, D)[1][1]).toBe(true);
  });
});

describe('먼 바닥 칸 (빛을 잃은 친구 자리)', () => {
  it('네 귀퉁이 쪽, 가장자리 칸이 아닌 바닥', () => {
    for (const m of Object.values(GameData.maps)) {
      const far = farFloorCells(m, D);
      expect(far).toHaveLength(4);
      for (const c of far) {
        expect(m.rows[c.row][c.col]).toBe('.');
        expect(c.row > 0 && c.row < 18 && c.col > 0 && c.col < 32).toBe(true);
      }
    }
  });
});
