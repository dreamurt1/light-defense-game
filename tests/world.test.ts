import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';

import { visionAt, zoneAt } from '../src/systems/zones';
import { planEvent, resolveKind } from '../src/systems/runEvents';

const { central, zones, runEvents } = GameData.game;

// 테마별 지도 모양(2026-11-18 map.json themes)은 2026-11-23 격자 맵으로 바뀌었다 → tests/maps.test.ts·map.test.ts

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
    expect(planEvent({ tutorial: true }, runEvents, Math.random)).toBeNull();
    expect(planEvent({ endless: true }, runEvents, Math.random)).toBeNull();
  });
  it('진행 atMin~atMax 사이에 한 번', () => {
    for (let i = 0; i < 50; i++) {
      const e = planEvent({}, runEvents, Math.random);
      expect(e).not.toBeNull();
      expect(e!.atProgress).toBeGreaterThanOrEqual(runEvents.atMin);
      expect(e!.atProgress).toBeLessThanOrEqual(runEvents.atMax);
    }
  });
  it('뺄 이벤트·가중치 배율(밤 규칙의 eventMods): 밤 1에는 어둠 바람이 없다', () => {
    const night1 = { eventMods: { exclude: ['darkWind' as const] } };
    for (let i = 0; i < 100; i++) expect(planEvent(night1, runEvents, Math.random)?.kind).not.toBe('darkWind');
    expect(planEvent({}, runEvents, seq(0.999, 0.5))?.kind).toBe('darkWind');
    // 작은 화해 ×2면 같은 난수에서도 화해 쪽이 넓어진다
    const total = Object.values(runEvents.weights).reduce((a, b) => a + b, 0);
    const beforeGift = (runEvents.weights.fireflies + runEvents.weights.lostParade) / (total + runEvents.weights.gift);
    expect(planEvent({ eventMods: { weightMul: { gift: 2 } } }, runEvents, seq(beforeGift + 0.01, 0.5))?.kind).toBe('gift');
  });
  it('선물은 자비를 베푼 판에만, 아니면 반딧불 무리', () => {
    expect(resolveKind('gift', 0)).toBe('fireflies');
    expect(resolveKind('gift', 2)).toBe('gift');
    expect(resolveKind('lostParade', 0)).toBe('lostParade');
  });
});
