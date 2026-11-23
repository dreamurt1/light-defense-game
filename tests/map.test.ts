import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';
import { walkArea } from '../src/systems/movement';
import { bushRects, cellCenter, collisionRects, farFloorCells, lampCells } from '../src/systems/grid';

// 마을 배치 검사 — 2026-11-23 밤 나들이 v3부터 격자 맵(33×19, src/data/maps/*.json)마다 (옛 map.json 배치 대신)
const { world, keeper, central } = GameData.game;
const D = GameData.grid;
const area = walkArea(world.width, world.height, keeper.walkInset);
const start = { x: central.x, y: central.y + keeper.startOffsetY };
const inside = (p: { x: number; y: number }, r: { x: number; y: number; w: number; h: number }, pad = 0) => p.x > r.x - pad && p.x < r.x + r.w + pad && p.y > r.y - pad && p.y < r.y + r.h + pad;

describe('마을 배치 (격자 맵)', () => {
  it('마을은 16:9, 격자(3168×1824)가 마을을 덮는다', () => {
    expect(world.width / world.height).toBeCloseTo(16 / 9);
    expect(D.cols * D.cell).toBeGreaterThanOrEqual(world.width - D.cell);
    expect(D.rows * D.cell).toBeGreaterThanOrEqual(world.height);
  });
  it('걷는 영역 = 노는 칸 1~17행 × 1~31열 쪽 (가장자리 칸은 둘레 띠)', () => {
    expect(area.y).toBeLessThanOrEqual(D.cell + 10);
    expect(area.y + area.h).toBeGreaterThanOrEqual(17 * D.cell);
    expect(area.x).toBeLessThanOrEqual(D.cell + 10);
  });
  for (const m of Object.values(GameData.maps)) {
    describe(`${m.id} ${m.name}`, () => {
      const rects = collisionRects(m, D);
      it('중앙 광원과 루미 시작 자리 둘레(광장)는 비어 있다', () => {
        for (const r of [...rects, ...bushRects(m, D)]) {
          expect(inside(central, r, 150)).toBe(false);
          expect(inside(start, r, 60)).toBe(false);
        }
      });
      it('등불 자리는 중앙 광원에서 4칸(384) 넘게, 8칸 대각선 안 (규칙: 광장 가운데에서 가로·세로 중 큰 값 4~8칸)', () => {
        for (const c of lampCells(m, D)) {
          const p = cellCenter(c.col, c.row, D);
          const d = Math.hypot(p.x - central.x, p.y - central.y);
          expect(d).toBeGreaterThan(380);
          expect(d).toBeLessThan(8 * D.cell * Math.SQRT2);
        }
      });
      it('빛을 잃은 친구 자리는 걷기 영역 안, 장애물 밖', () => {
        for (const c of farFloorCells(m, D)) {
          const p = cellCenter(c.col, c.row, D);
          expect(p.x >= area.x && p.x <= area.x + area.w && p.y >= area.y && p.y <= area.y + area.h, `${c.col},${c.row}`).toBe(true);
          for (const r of rects) expect(inside(p, r)).toBe(false);
        }
      });
    });
  }
});
