import { describe, expect, it } from 'vitest';
import { KeeperSlow, specialOf } from '../src/systems/specials';
import enemies from '../src/data/enemies.json';

describe('specialOf (적의 필살기: 몸박치기가 맞을 때)', () => {
  it('없으면 효과 없음', () => {
    expect(specialOf(undefined)).toEqual({ sourceMultiplier: 1 });
    expect(specialOf({ amplitude: 34 })).toEqual({ sourceMultiplier: 1 });
  });

  it('속도 스턴 · 밀어냄 · 빛 빼앗기', () => {
    expect(specialOf({ special: 'slow', slowMultiplier: 0.7, slowSec: 1.2 }).slow).toEqual({ multiplier: 0.7, sec: 1.2 });
    expect(specialOf({ special: 'push', pushPx: 80 }).push).toBe(80);
    const d = specialOf({ special: 'drain', drainLp: 12, drainSourceMultiplier: 1.4 });
    expect(d.drainLp).toBe(12);
    expect(d.sourceMultiplier).toBe(1.4);
  });

  it('데이터: 박쥐 slow · 웨어울프 push · 뱀파이어 drain · 고슴도치 guard, 잃어버린 주민 개구리·레서판다는 없음', () => {
    const p = (id: string) => (enemies as { id: string; behaviorParams?: Record<string, unknown> }[]).find((e) => e.id === id)?.behaviorParams?.special;
    expect([p('bat'), p('werewolf'), p('vampire'), p('hedgehog'), p('frog'), p('redpanda')]).toEqual(['slow', 'push', 'drain', 'guard', undefined, undefined]);
  });
});

describe('KeeperSlow (속도 스턴)', () => {
  it('맞으면 그 시간 동안 느려지고, 지나면 돌아온다', () => {
    const s = new KeeperSlow();
    s.apply(0.75, 1);
    expect(s.multiplier).toBe(0.75);
    s.update(0.9);
    expect(s.multiplier).toBe(0.75);
    s.update(0.2);
    expect(s.multiplier).toBe(1);
  });

  it('겹치면 더 느린 쪽, 더 긴 시간', () => {
    const s = new KeeperSlow();
    s.apply(0.8, 0.5);
    s.apply(0.6, 1.2);
    expect(s.multiplier).toBe(0.6);
    s.update(1);
    expect(s.multiplier).toBe(0.6);
    s.update(0.3);
    expect(s.multiplier).toBe(1);
  });
});
