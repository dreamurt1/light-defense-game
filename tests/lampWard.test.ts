// 등불의 결계 (2026-11-14 라이언: 적의 이동 경로·플레이어의 동기·등불의 존재 이유)
import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';
import { keepOut, spawnWeight, steerAround, wardRadius } from '../src/systems/lampWard';

const W = GameData.game.station.ward;

describe('등불의 결계', () => {
  it('결계 반지름은 밝기에 비례하고, 꺼지면 없다', () => {
    expect(wardRadius(100, W)).toBe(W.maxRadius);
    expect(wardRadius(50, W)).toBeCloseTo(W.maxRadius / 2);
    expect(wardRadius(0, W)).toBe(0);
  });

  it('흐려진 등불(약 HP 30% 아래)만 결계가 등불 몸에 닿을 만큼 줄어 적이 공격할 수 있다', () => {
    const station = GameData.game.station.radius;
    const enemy = 20;
    expect(wardRadius(60, W)).toBeGreaterThan(station + enemy);
    expect(wardRadius(25, W)).toBeLessThanOrEqual(station + enemy);
  });

  it('켜진 등불 가까이에서는 적이 덜 나오고, 등불이 어두워지면 그 효과도 준다', () => {
    const lamp = { x: 0, y: 0 };
    const near = { x: 100, y: 0 };
    const bright = spawnWeight(near, [{ ...lamp, light: 100 }], W);
    const dim = spawnWeight(near, [{ ...lamp, light: 30 }], W);
    expect(bright).toBeLessThan(0.4);
    expect(dim).toBeGreaterThan(bright);
    expect(spawnWeight({ x: W.spawnRadius + 10, y: 0 }, [{ ...lamp, light: 100 }], W)).toBe(1);
    expect(spawnWeight(near, [], W)).toBe(1);
  });

  it('결계 안의 적은 밖으로 밀려난다 (한 번에 최대 maxStep)', () => {
    const ward = { x: 0, y: 0, r: 100 };
    const deep = keepOut({ x: 10, y: 0 }, 20, [ward], 30);
    expect(deep.x).toBeCloseTo(40);
    const edge = keepOut({ x: 110, y: 0 }, 20, [ward], 999);
    expect(edge.x).toBeCloseTo(120);
    expect(keepOut({ x: 200, y: 0 }, 20, [ward], 999)).toEqual({ x: 200, y: 0 });
  });

  it('결계 너머의 목적지로 갈 때는 둘레로 비켜 가고, 목적지가 결계 안이면 곧장 다가간다', () => {
    const ward = { x: 0, y: 0, r: 100 };
    const pos = { x: -150, y: 0 };
    const dir = { x: 1, y: 0 };
    const around = steerAround(pos, dir, 20, { x: 400, y: 0 }, [ward], 70);
    expect(Math.abs(around.y)).toBeGreaterThan(0.5);
    expect(Math.hypot(around.x, around.y)).toBeCloseTo(1);
    const straight = steerAround(pos, dir, 20, { x: 30, y: 0 }, [ward], 70);
    expect(straight).toEqual(dir);
    // 멀어지는 중이면 그대로
    expect(steerAround(pos, { x: -1, y: 0 }, 20, { x: -400, y: 0 }, [ward], 70)).toEqual({ x: -1, y: 0 });
  });
});
