import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';
import { carryItemIds, carryOrDefault, isUnlocked, unlockNight } from '../src/systems/unlocks';

// 2026-11-23 밤 나들이 v3: 챙겨 갈 아이템은 런에서 아침을 맞은 최고 밤 수(Progress.bestNight)로 열린다, 빛 색은 별가루로 산다
describe('unlocks (밤을 지나면 열리는 준비물)', () => {
  it("'start'는 처음부터, 'night-n'은 밤 n을 지난 뒤, 시연 모두 열기면 다", () => {
    expect(unlockNight('start')).toBe(0);
    expect(unlockNight('night-4')).toBe(4);
    expect(unlockNight('stage-2')).toBeNull();
    expect(isUnlocked('start', 0)).toBe(true);
    expect(isUnlocked('night-4', 3)).toBe(false);
    expect(isUnlocked('night-4', 4)).toBe(true);
    expect(isUnlocked('night-6', 0, true)).toBe(true);
    expect(isUnlocked(undefined, 99)).toBe(false);
  });

  it('챙겨 갈 아이템은 빛의 부적을 뺀 넷 — 반딧불 병 처음부터 · 바람 깃털 밤 2 · 별 목걸이 밤 4 · 황금 도토리 밤 6', () => {
    const items = GameData.items;
    expect(carryItemIds(items)).toEqual(['wind_feather', 'star_necklace', 'firefly_jar', 'golden_acorn']);
    expect(items.filter((i) => typeof i.carryUnlock === 'string').map((i) => i.carryUnlock)).toEqual(['night-2', 'night-4', 'start', 'night-6']);
    expect(carryOrDefault('golden_acorn', items, 5)).toBe('wind_feather'); // 잠겼으면 열린 첫 아이템
    expect(carryOrDefault('golden_acorn', items, 6)).toBe('golden_acorn');
    expect(carryOrDefault('', items, 6)).toBe('');
    expect(carryOrDefault('nope', items, 0)).toBe('firefly_jar');
  });

  it('빛 색은 호박빛이 기본(값 0), 나머지는 별가루 10·15·20·30', () => {
    const c = GameData.cosmetics.lightColors;
    expect(c[0].id).toBe('amber');
    expect(c.map((x) => x.price)).toEqual([0, 10, 15, 20, 30]);
  });
});
