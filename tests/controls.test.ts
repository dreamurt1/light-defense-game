import { describe, expect, it } from 'vitest';
import { AimStick, autoAimAngle, dragAim } from '../src/systems/aimStick';
import { keysVector, stepMove, stickVector, strongerInput, walkArea } from '../src/systems/movement';

describe('stickVector', () => {
  it('is zero inside the dead zone', () => {
    expect(stickVector(0.1, 0.05, 0.18)).toEqual({ x: 0, y: 0 });
  });

  it('rescales outside the dead zone and never exceeds length 1', () => {
    const half = stickVector(0.59, 0, 0.18);
    expect(half.x).toBeCloseTo(0.5);
    const full = stickVector(3, 4, 0.18);
    expect(Math.hypot(full.x, full.y)).toBeCloseTo(1);
    expect(full.x / full.y).toBeCloseTo(0.75);
  });
});

describe('keysVector', () => {
  it('walks diagonally at the same speed', () => {
    const v = keysVector(false, true, true, false);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1);
    expect(v.x).toBeGreaterThan(0);
    expect(v.y).toBeLessThan(0);
  });

  it('cancels opposite keys', () => {
    expect(keysVector(true, true, false, false)).toEqual({ x: 0, y: 0 });
  });
});

describe('strongerInput', () => {
  it('prefers the input pushed further', () => {
    expect(strongerInput({ x: 0.2, y: 0 }, { x: 0, y: 1 })).toEqual({ x: 0, y: 1 });
  });
});

describe('stepMove', () => {
  const area = walkArea(1080, 1920, { top: 70, side: 70, bottom: 70 });

  it('moves at speed × dt and caps the input length at 1', () => {
    const p = stepMove({ x: 500, y: 500 }, { x: 3, y: 4 }, 150, 0.1, area);
    expect(p.x).toBeCloseTo(509);
    expect(p.y).toBeCloseTo(512);
  });

  it('uses a different inset at the top (row of houses)', () => {
    expect(walkArea(2400, 2400, { top: 250, side: 100, bottom: 110 })).toEqual({ x: 100, y: 250, w: 2200, h: 2040 });
  });

  it('stays inside the walk area', () => {
    expect(stepMove({ x: 75, y: 1845 }, { x: -1, y: 1 }, 150, 1, area)).toEqual({ x: 70, y: 1850 });
  });
});

describe('AimStick', () => {
  it('fires in the dragged direction on release', () => {
    const s = new AimStick(0.18);
    s.down();
    expect(s.move(0, -0.8)).toBe(true);
    expect(s.direction).toBeCloseTo(-Math.PI / 2);
    expect(s.up()).toEqual({ kind: 'fire', angle: s.direction, power: 0.8 });
  });

  it('auto-aims when released without dragging out', () => {
    const s = new AimStick(0.18);
    s.down();
    s.move(0.05, 0.02);
    expect(s.up()).toEqual({ kind: 'auto' });
  });

  it('cancels when dragged out and brought back to the centre', () => {
    const s = new AimStick(0.18);
    s.down();
    s.move(0.9, 0);
    expect(s.move(0.1, 0)).toBe(false);
    expect(s.cancelling).toBe(true);
    expect(s.up()).toEqual({ kind: 'cancel' });
    expect(s.cancelling).toBe(false);
  });

  it('ignores release without a press', () => {
    expect(new AimStick(0.18).up()).toBeNull();
  });
});

describe('autoAimAngle', () => {
  const origin = { x: 0, y: 0 };

  it('picks the nearest neighbour within range', () => {
    const a = autoAimAngle(origin, [{ x: 0, y: 150 }, { x: 100, y: 0 }], 220);
    expect(a).toBeCloseTo(0);
  });

  it('사거리 안에 아무도 없으면 쏘지 않는다 (2026-11-12 라이언 답변)', () => {
    expect(autoAimAngle(origin, [{ x: 0, y: -500 }, { x: 0, y: 300 }], 220)).toBeNull();
  });

  it('is null with no neighbours', () => {
    expect(autoAimAngle(origin, [], 220)).toBeNull();
  });
});

describe('dragAim (PC 마우스 끌기)', () => {
  const origin = { x: 100, y: 100 };

  it('커서 쪽을 향하고 반지름은 커서까지의 거리', () => {
    const aim = dragAim(origin, { x: 100, y: 250 }, 220, 32);
    expect(aim?.angle).toBeCloseTo(Math.PI / 2);
    expect(aim?.range).toBeCloseTo(150);
  });

  it('사거리를 넘지 않는다', () => {
    expect(dragAim(origin, { x: 600, y: 100 }, 220, 32)?.range).toBe(220);
  });

  it('등불 바로 위면 취소', () => {
    expect(dragAim(origin, { x: 110, y: 110 }, 220, 32)).toBeNull();
  });
});

describe('AimStick 끈 정도 (원뿔 반지름)', () => {
  it('끈 거리에 비례하고 끝까지 끌면 1', () => {
    const s = new AimStick(0.18);
    s.down();
    s.move(0.5, 0);
    expect(s.power).toBeCloseTo(0.5);
    s.move(0, 1);
    expect(s.power).toBe(1);
    const r = s.up();
    expect(r).toEqual({ kind: 'fire', angle: Math.PI / 2, power: 1 });
  });
});
