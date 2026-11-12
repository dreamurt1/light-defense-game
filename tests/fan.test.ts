import { describe, expect, it } from 'vitest';
import { inFan, normalizeAngle } from '../src/systems/fan';

const origin = { x: 270, y: 560 };
const right = 0;

describe('normalizeAngle', () => {
  it('folds angles into (-π, π]', () => {
    expect(normalizeAngle(Math.PI * 3)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(-Math.PI * 1.5)).toBeCloseTo(Math.PI / 2);
    expect(normalizeAngle(0.5)).toBeCloseTo(0.5);
  });
});

describe('inFan', () => {
  it('hits a point straight ahead within range', () => {
    expect(inFan(origin, right, 60, 220, { x: 470, y: 560 })).toBe(true);
  });

  it('misses beyond range, but is lenient by the point radius', () => {
    expect(inFan(origin, right, 60, 220, { x: 500, y: 560 })).toBe(false);
    expect(inFan(origin, right, 60, 220, { x: 500, y: 560 }, 16)).toBe(true);
  });

  it('uses half the fan angle on each side', () => {
    const at = (deg: number) => ({ x: 270 + 100 * Math.cos((deg * Math.PI) / 180), y: 560 + 100 * Math.sin((deg * Math.PI) / 180) });
    expect(inFan(origin, right, 60, 220, at(29))).toBe(true);
    expect(inFan(origin, right, 60, 220, at(31))).toBe(false);
    expect(inFan(origin, right, 60, 220, at(-29))).toBe(true);
  });

  it('widens the angle by the radius the point occupies', () => {
    const p = { x: 270 + 100 * Math.cos((35 * Math.PI) / 180), y: 560 + 100 * Math.sin((35 * Math.PI) / 180) };
    expect(inFan(origin, right, 60, 220, p, 0)).toBe(false);
    expect(inFan(origin, right, 60, 220, p, 16)).toBe(true);
  });

  it('works across the ±π seam', () => {
    expect(inFan(origin, Math.PI, 60, 220, { x: 100, y: 570 })).toBe(true);
    expect(inFan(origin, -Math.PI + 0.01, 60, 220, { x: 100, y: 550 })).toBe(true);
  });

  it('always hits a point overlapping the origin', () => {
    expect(inFan(origin, right, 60, 220, { x: 260, y: 560 }, 16)).toBe(true);
  });
});
