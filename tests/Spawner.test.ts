import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { GameData, type EnemyId } from '../src/data';
import { Spawner } from '../src/systems/Spawner';

const area = { width: 540, height: 960, margin: 16 };
const stage = GameData.stages[0];
const climaxAt = GameData.game.stage.climaxAt;
const climaxSec = stage.durationSec * climaxAt;

function make(seed = 1, allowed: readonly EnemyId[] = ['bat', 'frog']) {
  return new Spawner(stage, climaxAt, GameData.enemies, new Rng(seed), area, allowed);
}

describe('Spawner (2026-11-12 새 기획: 평소·클라이맥스)', () => {
  it('구간 안에서 간격을 고르게 보간한다', () => {
    const s = make();
    const n = stage.spawn.normal;
    expect(s.intervalAt(0)).toBeCloseTo(n.intervalStart);
    expect(s.intervalAt(climaxSec / 2)).toBeCloseTo((n.intervalStart + n.intervalEnd) / 2);
    expect(s.intervalAt(climaxSec)).toBeCloseTo(stage.spawn.climax.intervalStart);
  });

  it('70%부터 클라이맥스: 동시 최대가 늘고 간격이 짧아진다', () => {
    const s = make();
    expect(s.isClimax(climaxSec - 0.1)).toBe(false);
    expect(s.isClimax(climaxSec)).toBe(true);
    expect(s.maxAliveAt(climaxSec)).toBeGreaterThan(s.maxAliveAt(0));
    expect(s.intervalAt(climaxSec + 1)).toBeLessThan(s.intervalAt(1));
  });

  it('처음 몇 초는 호스틸만 (잃어버린 주민 개구리는 뒤에)', () => {
    const s = make(7);
    const until = stage.spawn.onlyHostileUntilSec ?? 0;
    for (let i = 0; i < 200; i++) expect(s.pickEnemy(until - 1)).toBe('bat');
    const later = new Set(Array.from({ length: 300 }, () => s.pickEnemy(until + 10)));
    expect(later.has('frog')).toBe(true);
  });

  it('지금 나오는 적만 고른다', () => {
    const s = make(3, ['bat']);
    for (let i = 0; i < 200; i++) expect(s.pickEnemy(60)).toBe('bat');
  });

  it('박쥐 무리는 한 변에서 시차를 두고 나온다', () => {
    const s = make(11, ['bat']);
    const bat = GameData.enemies.find((e) => e.id === 'bat')!;
    const groups = [];
    let t = 0;
    for (let i = 0; i < 60 * 60; i++) {
      t += 1 / 60;
      const req = s.update(1 / 60, t, 0);
      if (req.length) groups.push(req);
    }
    expect(groups.length).toBeGreaterThan(5);
    for (const g of groups) {
      expect(g.length).toBeGreaterThanOrEqual(bat.group!.min);
      expect(g.length).toBeLessThanOrEqual(bat.group!.max);
      expect(new Set(g.map((r) => r.edge)).size).toBe(1);
      g.forEach((r, i) => expect(r.delay).toBeCloseTo(i * bat.group!.intervalSec));
    }
  });

  it('동시 최대에 닿아 있으면 기다린다', () => {
    const s = make(5, ['bat']);
    expect(s.update(10, 1, s.maxAliveAt(1))).toEqual([]);
    expect(s.update(0, 1, 0).length).toBeGreaterThan(0);
  });

  it('seed로 재현된다', () => {
    const run = (seed: number) => {
      const s = make(seed, ['bat']);
      const out = [];
      for (let i = 0; i < 600; i++) out.push(...s.update(0.1, i * 0.1, 0));
      return out;
    };
    expect(run(42)).toEqual(run(42));
  });

  it('첫 스테이지는 쉽게: 평소 동시 최대 3 이하', () => {
    expect(stage.spawn.normal.maxAlive).toBeLessThanOrEqual(3);
  });
});
