import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';
import { itemSpot, type Rect } from '../src/systems/obstacles';
import { walkArea } from '../src/systems/movement';
import { collisionRects, lampCells, cellCenter } from '../src/systems/grid';

const g = GameData.game;
const I = g.items;
const area = walkArea(g.world.width, g.world.height, g.keeper.walkInset);
/** 광원·등불의 발자리(CentralSource·LightStation과 같은 모양) */
const foot = (x: number, y: number, w: number, h: number): Rect => ({ x: x - w / 2, y: y - h, w, h });
const gap = (p: { x: number; y: number }, r: Rect) => Math.hypot(Math.max(r.x - p.x, 0, p.x - (r.x + r.w)), Math.max(r.y - p.y, 0, p.y - (r.y + r.h)));

describe('아이템 자리 (완료 기준 G3: 주울 수 없는 곳에 생기지 않음)', () => {
  it('광원·등불 둘레 고리는 그 몸 바깥에서 시작한다', () => {
    expect(I.spawnRingMin).toBeGreaterThan(g.central.radius);
    expect(I.lampRingMin).toBeGreaterThan(g.station.radius);
  });

  // 2026-11-23: 격자 맵마다 (등불 자리 = 맵의 L, 밑동은 칸 중심 + 22 — scenes/play/GridWorld.ts)
  for (const map of Object.values(GameData.maps)) {
    it(`${map.id}: 광원·등불 둘레 어디에 떨어져도 장애물·발자리·강 밖, 걷기 영역 안`, () => {
      const lamps = lampCells(map, GameData.grid).map((c) => { const p = cellCenter(c.col, c.row, GameData.grid); return { x: p.x, y: p.y + 22 }; });
      const sources = [foot(g.central.x, g.central.y + 50, g.central.footprint.w, g.central.footprint.h), ...lamps.map((s) => foot(s.x, s.y + 20, g.station.footprint.w, g.station.footprint.h))];
      const rects = [...collisionRects(map, GameData.grid), ...sources];
      const bases = [{ b: g.central, min: I.spawnRingMin, max: I.spawnRingMax }, ...lamps.map((s) => ({ b: s, min: I.lampRingMin, max: I.lampRingMax }))];
      let bad = 0;
      for (const { b, min, max } of bases) {
        for (let i = 0; i < 1500; i++) {
          const p = itemSpot(b, (i / 1500) * Math.PI * 14, min + (((i * 37) % 100) / 100) * (max - min), 30, rects, area);
          const inArea = p.x >= area.x && p.x <= area.x + area.w && p.y >= area.y && p.y <= area.y + area.h;
          if (!inArea || rects.some((r) => gap(p, r) < 1)) bad++;
        }
      }
      expect(bad).toBe(0);
    });
  }
});
