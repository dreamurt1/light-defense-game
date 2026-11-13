import { describe, expect, it } from 'vitest';
import { MercyTracker } from '../src/systems/mercy';
import { Stealth } from '../src/systems/stealth';
import { Effects, Inventory } from '../src/systems/inventory';
import { TutorialScript } from '../src/systems/tutorial';
import { GameData, STAGE_ORDER, stageById } from '../src/data';

describe('자비 (패시브 주민)', () => {
  it('곁에 dwellSec 머물면 한 번만', () => {
    const m = new MercyTracker({ radius: 200, dwellSec: 1.5 });
    const s = [{ uid: 1, x: 100, y: 0, upset: false }];
    expect(m.update(1, s, { x: 0, y: 0 })).toEqual([]);
    expect(m.update(0.6, s, { x: 0, y: 0 })).toEqual([1]);
    expect(m.update(5, s, { x: 0, y: 0 })).toEqual([]);
  });
  it('곁을 벗어나면 머문 시간이 처음부터', () => {
    const m = new MercyTracker({ radius: 200, dwellSec: 1.5 });
    const near = [{ uid: 1, x: 100, y: 0, upset: false }];
    const far = [{ uid: 1, x: 900, y: 0, upset: false }];
    m.update(1, near, { x: 0, y: 0 });
    m.update(1, far, { x: 0, y: 0 });
    expect(m.update(1, near, { x: 0, y: 0 })).toEqual([]);
    expect(m.update(0.6, near, { x: 0, y: 0 })).toEqual([1]);
  });
  it('멀거나 화났으면 없음', () => {
    const m = new MercyTracker({ radius: 200, dwellSec: 1 });
    expect(m.update(3, [{ uid: 1, x: 500, y: 0, upset: false }], { x: 0, y: 0 })).toEqual([]);
    expect(m.update(3, [{ uid: 2, x: 10, y: 0, upset: true }], { x: 0, y: 0 })).toEqual([]);
  });
});

describe('풀숲 은신 시간', () => {
  it('오래 있으면 들키고, 나가면 초기화', () => {
    const s = new Stealth(4);
    expect(s.update(3, true)).toBe(false);
    expect(s.update(1.1, true)).toBe(true);
    expect(s.exposed).toBe(true);
    expect(s.update(1, true)).toBe(false);
    s.update(0.1, false);
    expect(s.exposed).toBe(false);
    expect(s.hiddenFor).toBe(0);
  });
});

describe('아이템 칸·효과', () => {
  it('두 칸, 다 차면 못 줍고, 쓰면 빈다', () => {
    const inv = new Inventory(2);
    expect(inv.add('a')).toBe(true);
    expect(inv.add('b')).toBe(true);
    expect(inv.add('c')).toBe(false);
    expect(inv.take(0)).toBe('a');
    expect(inv.take(0)).toBe(null);
    expect(inv.add('c')).toBe(true);
    expect(inv.slots).toEqual(['c', 'b']);
  });
  it('효과 시간', () => {
    const e = new Effects();
    e.start('moveSpeed', 2);
    expect(e.active('moveSpeed')).toBe(true);
    expect(e.update(2.1)).toEqual(['moveSpeed']);
    expect(e.active('moveSpeed')).toBe(false);
  });
});

describe('튜토리얼', () => {
  it('조건 신호로만 넘어가고 끝난다', () => {
    const t = new TutorialScript();
    expect(t.signal('retreated')).toBe(false);
    for (const s of ['walked', 'retreated', 'lit', 'rescued', 'upset', 'itemUsed'] as const) expect(t.signal(s)).toBe(true);
    expect(t.done).toBe(true);
  });
});

describe('스테이지 진행 (컨셉 시연판)', () => {
  it('등불 1 → 4, 1스테이지는 등불 1개', () => {
    expect(STAGE_ORDER.map((id) => stageById(id).stations)).toEqual([1, 2, 3, 4]);
  });
  it('스폰 표의 적은 모두 데이터에 있고 구현됨', () => {
    for (const s of GameData.stages) {
      const ids = [...Object.keys(s.spawn.normal.weights), ...Object.keys(s.spawn.climax.weights), ...Object.keys(s.passive?.weights ?? {})];
      for (const id of ids) expect(GameData.enemies.find((e) => e.id === id)?.implemented, `${s.id}:${id}`).toBe(true);
    }
  });
  it('패시브 주민은 피해가 없다', () => {
    for (const e of GameData.enemies.filter((d) => d.kind === 'passive')) expect(e.damage).toBe(0);
  });
});

describe('생명체 모습 방향 (2026-11-13)', () => {
  it('옆·앞·뒤를 고르고 경계에서는 지금 모습을 유지한다', async () => {
    const { critterView } = await import('../src/systems/critterView');
    expect(critterView({ x: 1, y: 0.1 }, 'side')).toBe('side');
    expect(critterView({ x: 0.2, y: 1 }, 'side')).toBe('front');
    expect(critterView({ x: 0.2, y: -1 }, 'side')).toBe('back');
    // 대각선 근처: 옆이던 것은 옆으로, 앞이던 것은 앞으로
    expect(critterView({ x: 0.7, y: 0.75 }, 'side')).toBe('side');
    expect(critterView({ x: 0.7, y: 0.75 }, 'front')).toBe('front');
    expect(critterView({ x: 0, y: 0 }, 'back')).toBe('back');
  });
});
