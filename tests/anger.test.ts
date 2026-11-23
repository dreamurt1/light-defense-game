import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';
import { beyondSpots } from '../src/systems/anger';

// 2026-11-23: 옛 분노 계수기 대신 — 돌려보낸 패시브 너머 380에 호스틸 1마리
describe('돌려보낸 패시브 너머의 어둠', () => {
  const area = { x: 100, y: 250, w: 3000, h: 1440 };
  const cfg = GameData.game.passive;

  it('game.json: 한 마리, 380 너머', () => {
    expect(cfg.banishHostileCount).toBe(1);
    expect(cfg.banishHostileDist).toBe(380);
  });

  it('루미 반대쪽으로 banishHostileDist만큼', () => {
    const [s] = beyondSpots({ x: 1000, y: 900 }, { x: 800, y: 900 }, cfg, area);
    expect(s.x).toBeCloseTo(1380);
    expect(s.y).toBeCloseTo(900);
  });

  it('걷는 영역 밖으로 나가지 않는다', () => {
    const [s] = beyondSpots({ x: 3000, y: 300 }, { x: 2900, y: 400 }, cfg, area);
    expect(s.x).toBeLessThanOrEqual(3100);
    expect(s.y).toBeGreaterThanOrEqual(250);
  });

  it('여러 마리면 나란히', () => {
    const spots = beyondSpots({ x: 1000, y: 900 }, { x: 800, y: 900 }, { banishHostileCount: 2, banishHostileDist: 380 }, area);
    expect(spots).toHaveLength(2);
    expect(Math.abs(spots[0].y - spots[1].y)).toBeCloseTo(90);
  });
});
