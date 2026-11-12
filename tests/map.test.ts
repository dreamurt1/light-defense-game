import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';
import { walkArea } from '../src/systems/movement';

// 마을 배치 검사 (2026-11-06: 마을 16:9 3200×1800 — 요소 크기는 그대로 위치만 옮김)
const { world, keeper, lantern } = GameData.game;
const area = walkArea(world.width, world.height, keeper.walkInset);
const items = [...GameData.map.bushes.map((b, i) => ({ ...b, id: `bush${i}` })), ...GameData.map.obstacles.map((o, i) => ({ ...o, id: `${o.kind}${i}` }))];

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
        const overlap = a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
        expect(overlap, `${a.id} · ${b.id}`).toBe(false);
      }
  });

  it('시작 자리(마을 가운데)는 비어 있다', () => {
    expect(lantern.x).toBe(world.width / 2);
    expect(lantern.y).toBe(world.height / 2);
    for (const r of items) {
      const dx = Math.max(r.x - lantern.x, 0, lantern.x - (r.x + r.w));
      const dy = Math.max(r.y - lantern.y, 0, lantern.y - (r.y + r.h));
      expect(Math.hypot(dx, dy), r.id).toBeGreaterThan(120);
    }
  });
});
