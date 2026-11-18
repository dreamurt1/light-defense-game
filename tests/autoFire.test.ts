import { describe, expect, it } from 'vitest';
import { AutoFire } from '../src/systems/autoFire';

describe('AutoFire (빛 반자동: 스틱을 누르고 있거나 PC 스페이스)', () => {
  it('누르기만 해서는 바로 쏘지 않고, 짧은 틈 뒤 빛이 준비되면 쏘라고 한다', () => {
    const a = new AutoFire(0.12);
    a.press();
    expect(a.update(0.05, true)).toBe(false);
    expect(a.holding()).toBe(false);
    expect(a.update(0.08, true)).toBe(true);
    expect(a.holding()).toBe(true);
  });

  it('빛이 준비되지 않았으면 쏘지 않는다', () => {
    const a = new AutoFire(0.12);
    a.press();
    expect(a.update(0.2, false)).toBe(false);
    expect(a.update(0.01, true)).toBe(true);
  });

  it('끌기 시작하거나 떼면 멈춘다', () => {
    const a = new AutoFire(0.12);
    a.press();
    a.update(0.2, true);
    a.stop();
    expect(a.update(0.1, true)).toBe(false);
    expect(a.holding()).toBe(false);
  });

  it('누르는 동안 한 발 쐈으면 놓을 때의 탭 자동 조준은 막는다, 다시 누르면 풀린다', () => {
    const a = new AutoFire(0.12);
    a.press();
    expect(a.tapAllowed).toBe(true);
    a.update(0.2, true);
    a.fired();
    expect(a.tapAllowed).toBe(false);
    a.stop();
    a.press();
    expect(a.tapAllowed).toBe(true);
  });

  it('PC 스페이스(key)는 기다리지 않는다', () => {
    const a = new AutoFire(0.12);
    expect(a.update(0.016, true, true)).toBe(true);
    expect(a.holding(true)).toBe(true);
    expect(a.update(0.016, true, false)).toBe(false);
  });
});
