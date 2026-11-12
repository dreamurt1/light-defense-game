import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { GameData } from '../src/data';
import { Spawner } from '../src/systems/Spawner';

const area = { width: 540, height: 960, margin: 16 };

function make(seed = 1, allowed = ['bat', 'croc', 'slime', 'ghost', 'hyena'] as const) {
  return new Spawner(GameData.waves, GameData.enemies, new Rng(seed), area, allowed);
}

describe('Spawner', () => {
  it('interpolates the spawn interval inside each phase', () => {
    const s = make();
    // 초저녁은 waves.json 값 사이를 고르게 (2026-11-06 출몰 30% 감소로 3.6 → 2.6)
    const dusk = GameData.waves.phases[0];
    expect(s.intervalAt(0)).toBeCloseTo(dusk.spawnIntervalStart);
    expect(s.intervalAt(20)).toBeCloseTo((dusk.spawnIntervalStart + dusk.spawnIntervalEnd) / 2);
    expect(s.intervalAt(40)).toBeCloseTo(1.6);
    expect(s.intervalAt(100)).toBeCloseTo(1.0);
  });

  it('sends only bats in the first 5 seconds and no slime before 30', () => {
    const s = make(7);
    for (let i = 0; i < 200; i++) expect(s.pickEnemy(3)).toBe('bat');
    for (let i = 0; i < 200; i++) expect(s.pickEnemy(20)).not.toBe('slime');
  });

  it('only picks implemented enemies', () => {
    const s = make(3, ['bat'] as never);
    for (let i = 0; i < 200; i++) expect(s.pickEnemy(60)).toBe('bat');
  });

  it('sends bats in groups of 2–4 from one edge, staggered by 0.3 s', () => {
    const s = make(11, ['bat'] as never);
    const groups = [];
    let t = 0;
    for (let i = 0; i < 60 * 30; i++) {
      t += 1 / 60;
      const req = s.update(1 / 60, t, 0);
      if (req.length) groups.push(req);
    }
    expect(groups.length).toBeGreaterThan(5);
    for (const g of groups) {
      expect(g.length).toBeGreaterThanOrEqual(2);
      expect(g.length).toBeLessThanOrEqual(4);
      expect(new Set(g.map((r) => r.edge)).size).toBe(1);
      g.forEach((r, i) => expect(r.delay).toBeCloseTo(i * 0.3));
    }
  });

  it('waits while the night is full', () => {
    const s = make(5, ['bat'] as never);
    expect(s.update(10, 1, s.maxAliveAt(1))).toEqual([]);
    expect(s.update(0, 1, 0).length).toBeGreaterThan(0);
  });

  it('is reproducible from the seed', () => {
    const run = (seed: number) => {
      const s = make(seed, ['bat'] as never);
      const out = [];
      for (let i = 0; i < 600; i++) out.push(...s.update(0.1, i * 0.1, 0));
      return out;
    };
    expect(run(42)).toEqual(run(42));
  });
});
