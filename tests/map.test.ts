import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';
import { walkArea } from '../src/systems/movement';

// 마을 배치 검사 (2026-11-06: 마을 16:9 3200×1800 — 요소 크기는 그대로 위치만 옮김)
const { world, keeper, central, station } = GameData.game;
const area = walkArea(world.width, world.height, keeper.walkInset);
// 2026-11-12: 등불 스테이션 자리(밑동 기준 판정 크기)도 함께 검사
const stationRects = GameData.map.stations.map((p, i) => ({ x: p.x - station.footprint.w / 2, y: p.y - station.footprint.h, w: station.footprint.w, h: station.footprint.h, id: `station${i}` }));
const items = [
  ...GameData.map.bushes.map((b, i) => ({ ...b, id: `bush${i}` })),
  ...GameData.map.obstacles.map((o, i) => ({ ...o, id: `${o.kind}${i}` })),
  ...stationRects,
];

describe('마을 배치', () => {
  it('마을은 16:9', () => {
    expect(world.width / world.height).toBeCloseTo(16 / 9);
  });

  it('풀숲·장애물은 모두 걷기 영역 안', () => {
    for (const r of items) {
      expect(r.x, r.id).toBeGreaterThanOrEqual(area.x);
      expect(r.y, r.id).toBeGreaterThanOrEqual(area.y);
      expect(r.x + r.w, r.id).toBeLessThanOrEqual(area.x + area.w);
      expect(r.y + r.h, r.id).toBeLessThanOrEqual(area.y + area.h);
    }
  });

  it('서로 겹치지 않는다 (사이 24 이상)', () => {
    const pad = 24;
    for (let i = 0; i < items.length; i++)
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        // 돌담 두 토막은 일부러 붙여 L자를 만든다 (2026-11-13 미로 요소)
        if (a.id.startsWith('wall') && b.id.startsWith('wall')) continue;
        const overlap = a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
        expect(overlap, `${a.id} · ${b.id}`).toBe(false);
      }
  });

  it('중앙 광원은 마을 가운데, 그 둘레(광원과 루미 시작 자리)는 비어 있다', () => {
    expect(central.x).toBe(world.width / 2);
    expect(central.y).toBe(world.height / 2);
    for (const r of items) {
      const dx = Math.max(r.x - central.x, 0, central.x - (r.x + r.w));
      const dy = Math.max(r.y - central.y, 0, central.y - (r.y + r.h));
      expect(Math.hypot(dx, dy), r.id).toBeGreaterThan(120);
      const sy = central.y + keeper.startOffsetY;
      const sdx = Math.max(r.x - central.x, 0, central.x - (r.x + r.w));
      const sdy = Math.max(r.y - sy, 0, sy - (r.y + r.h));
      expect(Math.hypot(sdx, sdy), r.id).toBeGreaterThan(60);
    }
  });

  it('빛을 잃은 친구 자리는 걷기 영역 안, 벽·장애물 밖 (2026-11-13)', () => {
    expect(GameData.map.friendSpots.length).toBeGreaterThan(0);
    for (const [i, p] of GameData.map.friendSpots.entries()) {
      expect(p.x >= area.x && p.x <= area.x + area.w && p.y >= area.y && p.y <= area.y + area.h, `friend${i}`).toBe(true);
      for (const r of GameData.map.obstacles) expect(p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h, `friend${i} · ${r.kind}`).toBe(false);
    }
  });

  it('등불 자리는 중앙 광원 가까이 (2026-11-12 라이언: 멀다 → 약 340~370)', () => {
    for (const p of GameData.map.stations) {
      const d = Math.hypot(p.x - central.x, p.y - central.y);
      expect(d).toBeGreaterThan(300);
      expect(d).toBeLessThan(420);
    }
  });
});
