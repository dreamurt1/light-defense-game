import { describe, expect, it } from 'vitest';
import { carryItemIds, carryOrDefault, isUnlocked } from '../src/systems/unlocks';
import items from '../src/data/items.json';
import cosmetics from '../src/data/cosmetics.json';

describe('unlocks (밤을 지나면 열리는 아이템·빛 색)', () => {
  it('start는 처음부터, 스테이지 id는 그 밤을 깬 뒤, 시연 모두 열기면 다', () => {
    expect(isUnlocked('start', [])).toBe(true);
    expect(isUnlocked('stage-2', ['stage-1'])).toBe(false);
    expect(isUnlocked('stage-2', ['stage-1', 'stage-2'])).toBe(true);
    expect(isUnlocked('stage-3', [], true)).toBe(true);
    expect(isUnlocked(undefined, ['stage-1'])).toBe(false);
  });

  it('챙겨 갈 아이템은 빛의 부적을 뺀 넷, 반딧불 병은 처음부터', () => {
    expect(carryItemIds(items)).toEqual(['wind_feather', 'star_necklace', 'firefly_jar', 'golden_acorn']);
    expect(carryOrDefault('golden_acorn', items, [])).toBe('firefly_jar');
    expect(carryOrDefault('golden_acorn', items, ['stage-1', 'stage-2', 'stage-3'])).toBe('golden_acorn');
    expect(carryOrDefault('', items, [])).toBe('');
    expect(carryOrDefault('nope', items, [])).toBe('firefly_jar');
  });

  it('빛 색은 호박빛이 기본(처음부터), 나머지는 밤마다 하나씩', () => {
    const c = cosmetics.lightColors;
    expect(c[0]).toMatchObject({ id: 'amber', unlock: 'start' });
    expect(c.map((x) => x.unlock)).toEqual(['start', 'stage-1', 'stage-2', 'stage-3', 'stage-4']);
  });
});
