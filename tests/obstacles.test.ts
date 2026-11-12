import { describe, expect, it } from 'vitest';
import { bushAt, insideRect, pushOut } from '../src/systems/obstacles';

const rock = { x: 100, y: 100, w: 80, h: 40 };

describe('pushOut', () => {
  it('leaves a circle that does not touch alone', () => {
    expect(pushOut({ x: 50, y: 50 }, 16, [rock])).toEqual({ x: 50, y: 50 });
  });

  it('pushes a circle touching an edge back to exactly its radius', () => {
    const p = pushOut({ x: 140, y: 90 }, 16, [rock]);
    expect(p.x).toBeCloseTo(140);
    expect(p.y).toBeCloseTo(84);
  });

  it('pushes out around a corner', () => {
    const p = pushOut({ x: 95, y: 95 }, 16, [rock]);
    expect(Math.hypot(p.x - 100, p.y - 100)).toBeCloseTo(16);
  });

  it('moves a centre inside the rectangle out through the nearest side', () => {
    const p = pushOut({ x: 175, y: 120 }, 16, [rock]);
    expect(p).toEqual({ x: 196, y: 120 });
  });

  it('cannot walk through: stepping into the rock from the left stops at its side', () => {
    expect(pushOut({ x: 105, y: 120 }, 16, [rock]).x).toBeCloseTo(84);
  });
});

describe('bushes', () => {
  const bushes = [
    { x: 0, y: 0, w: 100, h: 100 },
    { x: 300, y: 300, w: 200, h: 100 },
  ];

  it('knows which bush the keeper is hiding in', () => {
    expect(bushAt({ x: 350, y: 350 }, bushes, 20)).toBe(1);
    expect(bushAt({ x: 200, y: 200 }, bushes, 20)).toBe(-1);
  });

  it('needs to be a little inside the edge to hide', () => {
    expect(insideRect({ x: 10, y: 50 }, bushes[0], 20)).toBe(false);
    expect(insideRect({ x: 30, y: 50 }, bushes[0], 20)).toBe(true);
  });
});
