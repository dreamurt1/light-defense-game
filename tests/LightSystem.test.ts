import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';
import { LightSystem } from '../src/systems/LightSystem';

const light = GameData.game.light;
const origin = { x: 270, y: 560 };

describe('LightSystem', () => {
  it('waits the cooldown between casts', () => {
    const s = new LightSystem(light, origin, 220, light.cooldownSec);
    expect(s.tryCast(0)).not.toBeNull();
    expect(s.tryCast(0)).toBeNull();
    s.update(light.cooldownSec + 0.001, []);
    expect(s.tryCast(0)).not.toBeNull();
  });

  it('reach를 주면 그만큼만 뻗고 사거리는 넘지 않는다', () => {
    const s = new LightSystem(light, origin, 220, 0);
    expect(s.tryCast(0, 120)?.range).toBe(120);
    expect(s.tryCast(0, 999)?.range).toBe(220);
    expect(s.tryCast(0)?.range).toBe(220);
  });

  it('hits each target once as the fan front reaches it', () => {
    const s = new LightSystem(light, origin, 220, light.cooldownSec);
    const near = { uid: 1, x: 330, y: 560, radius: 16 };
    const far = { uid: 2, x: 480, y: 560, radius: 16 };
    s.tryCast(0);
    // 0.05초면 반지름이 사거리의 36% → 가까운 쪽만 닿는다
    const first = s.update(0.05, [near, far]);
    expect(first.map((h) => h.uid)).toEqual([1]);
    const rest = [];
    for (let i = 0; i < 20; i++) rest.push(...s.update(0.02, [near, far]));
    expect(rest.map((h) => h.uid)).toEqual([2]);
    expect(s.casts.length).toBe(0);
  });

  it('can return a whole group of bats with one tap', () => {
    const s = new LightSystem(light, origin, 220, light.cooldownSec);
    const group = [0, 1, 2, 3].map((i) => ({ uid: i, x: 400 + i * 12, y: 540 + (i % 2) * 30, radius: 16 }));
    s.tryCast(-0.1);
    const hits = [];
    for (let i = 0; i < 20; i++) hits.push(...s.update(0.02, group));
    expect(new Set(hits.map((h) => h.uid)).size).toBe(4);
  });

  it('spreads from where it was cast even if the lantern moves away', () => {
    const lantern = { x: 270, y: 560 };
    const s = new LightSystem(light, lantern, 220, light.cooldownSec);
    const target = { uid: 7, x: 450, y: 560, radius: 16 };
    s.tryCast(0);
    // 쏘자마자 등불을 들고 반대쪽으로 멀리 걸어가도 빛은 처음 자리에서 퍼져 닿는다
    lantern.x = -400;
    const hits = [];
    for (let i = 0; i < 20; i++) hits.push(...s.update(0.02, [target]));
    expect(hits.map((h) => h.uid)).toEqual([7]);
  });
});
