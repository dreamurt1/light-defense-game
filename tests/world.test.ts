import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';
import { walkArea } from '../src/systems/movement';
import { layoutFor } from '../src/systems/mapTheme';
import { visionAt, zoneAt } from '../src/systems/zones';
import { planEvent, resolveKind } from '../src/systems/runEvents';

const { world, keeper, central, station, zones, runEvents } = GameData.game;
const area = walkArea(world.width, world.height, keeper.walkInset);
const stationRects = GameData.map.stations.map((p, i) => ({ x: p.x - station.footprint.w / 2, y: p.y - station.footprint.h, w: station.footprint.w, h: station.footprint.h, id: `station${i}` }));

describe('테마별 지도 모양 (2026-11-18)', () => {
  for (const theme of ['light-village', 'border', 'dark-village']) {
    const lay = layoutFor(GameData.map, theme);
    const items = [...lay.bushes.map((b, i) => ({ ...b, id: `bush${i}` })), ...lay.obstacles.map((o, i) => ({ ...o, id: `${o.kind}${i}` })), ...stationRects];

    it(`${theme}: 모두 걷기 영역 안, 서로 24 넘게 떨어짐(돌담끼리 L자 제외)`, () => {
      for (const r of items) {
        expect(r.x >= area.x && r.y >= area.y && r.x + r.w <= area.x + area.w && r.y + r.h <= area.y + area.h, r.id).toBe(true);
      }
      for (let i = 0; i < items.length; i++)
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i];
          const b = items[j];
          if (a.id.startsWith('wall') && b.id.startsWith('wall')) continue;
          const pad = 24;
          const overlap = a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
          expect(overlap, `${theme} ${a.id} · ${b.id}`).toBe(false);
        }
    });

    it(`${theme}: 중앙 광원 둘레 120은 비어 있고 친구 자리는 장애물 밖`, () => {
      for (const r of items) {
        const dx = Math.max(r.x - central.x, 0, central.x - (r.x + r.w));
        const dy = Math.max(r.y - central.y, 0, central.y - (r.y + r.h));
        expect(Math.hypot(dx, dy), r.id).toBeGreaterThan(120);
      }
      for (const p of GameData.map.friendSpots) for (const r of lay.obstacles) expect(p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h).toBe(false);
    });
  }

  it('빛의 마을은 기본 배치 그대로, 경계·어둠의 마을은 더 많다', () => {
    expect(layoutFor(GameData.map, 'light-village').obstacles.length).toBe(GameData.map.obstacles.length);
    expect(layoutFor(GameData.map, 'border').bushes.length).toBeGreaterThan(GameData.map.bushes.length);
    expect(layoutFor(GameData.map, 'dark-village').obstacles.length).toBeGreaterThan(GameData.map.obstacles.length);
  });
});

describe('구획 시야 (2026-11-18)', () => {
  const c = { x: central.x, y: central.y };
  it('거리로 빛의 마을 · 경계 · 어둠의 마을', () => {
    expect(zoneAt(c, { x: c.x + 100, y: c.y }, zones)).toBe('light');
    expect(zoneAt(c, { x: c.x + 800, y: c.y }, zones)).toBe('border');
    expect(zoneAt(c, { x: c.x + 1300, y: c.y }, zones)).toBe('dark');
  });
  it('시야는 빛의 마을이 넓고 어둠의 마을이 좁다, 경계에서 툭 바뀌지 않는다', () => {
    const at = (d: number) => visionAt(c, { x: c.x + d, y: c.y }, zones);
    expect(at(0)).toBeCloseTo(zones.vision.light);
    expect(at(1400)).toBeCloseTo(zones.vision.dark);
    expect(at(zones.lightRadius + 1)).toBeCloseTo(zones.vision.light, 1);
    expect(at(zones.darkRadius - 1)).toBeCloseTo(zones.vision.dark, 1);
    expect(at(780)).toBeCloseTo(zones.vision.border, 1);
  });
});

describe('랜덤 이벤트 (2026-11-18)', () => {
  const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]; };
  it('튜토리얼·트라이얼엔 없다', () => {
    expect(planEvent({ id: 'tutorial', tutorial: true }, runEvents, Math.random)).toBeNull();
    expect(planEvent({ id: 'trial', endless: true }, runEvents, Math.random)).toBeNull();
  });
  it('진행 atMin~atMax 사이에 한 번', () => {
    for (let i = 0; i < 50; i++) {
      const e = planEvent({ id: 'stage-3' }, runEvents, Math.random);
      expect(e).not.toBeNull();
      expect(e!.atProgress).toBeGreaterThanOrEqual(runEvents.atMin);
      expect(e!.atProgress).toBeLessThanOrEqual(runEvents.atMax);
    }
  });
  it('첫 스테이지에는 어둠 바람이 없다', () => {
    for (let i = 0; i < 100; i++) expect(planEvent({ id: 'stage-1' }, runEvents, Math.random)?.kind).not.toBe('darkWind');
    expect(planEvent({ id: 'stage-2' }, runEvents, seq(0.999, 0.5))?.kind).toBe('darkWind');
  });
  it('선물은 자비를 베푼 판에만, 아니면 반딧불 무리', () => {
    expect(resolveKind('gift', 0)).toBe('fireflies');
    expect(resolveKind('gift', 2)).toBe('gift');
    expect(resolveKind('parade', 0)).toBe('parade');
  });
});
