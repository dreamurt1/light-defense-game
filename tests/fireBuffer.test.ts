import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';
import { FireBuffer } from '../src/systems/fireBuffer';

// 2026-11-27 라이언: 노트북 터치패드로 톡톡 탭하면 공격이 잘 안 먹힘 — 빛 대기 중 탭을 예약했다가 대기가 끝나는 순간 쏜다
describe('빛 입력 예약 (FireBuffer)', () => {
  it('대기 중 탭 → 준비되는 순간 한 번 쏨', () => {
    const b = new FireBuffer<string>(0.4);
    expect(b.hold('탭', 0.25)).toBe(true);
    expect(b.take(0.1, false)).toBeNull();
    expect(b.take(0.1, true)).toBe('탭');
    expect(b.take(0.1, true)).toBeNull();
  });

  it('마지막 탭 하나만 기억 (밀린 빛이 줄줄이 나가지 않게)', () => {
    const b = new FireBuffer<string>(0.4);
    b.hold('첫째', 0.3);
    b.hold('둘째', 0.2);
    expect(b.take(0, true)).toBe('둘째');
    expect(b.take(0, true)).toBeNull();
  });

  it('남은 대기가 창보다 길면 기억하지 않고, 창이 지나면 버림', () => {
    const b = new FireBuffer<string>(0.4);
    expect(b.hold('너무 이름', 0.6)).toBe(false);
    b.hold('탭', 0.3);
    expect(b.take(0.25, false)).toBeNull();
    expect(b.take(0.2, false)).toBeNull();
    expect(b.has).toBe(false);
  });

  it('창 = 빛 대기(루미 0.4초)와 같게 — 대기 중 어느 때 탭해도 한 발', () => {
    expect(GameData.game.controls.fireBufferSec).toBeGreaterThanOrEqual(GameData.game.light.cooldownSec);
  });
});
