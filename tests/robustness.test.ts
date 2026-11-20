import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/core/events';
import { clearErrors, loggedErrors } from '../src/core/errorLog';
import { inView } from '../src/entities/WorldCuller';

describe('판이 멈추지 않게 (2026-11-20 휴대폰 멈춤)', () => {
  afterEach(() => {
    clearErrors();
    vi.restoreAllMocks();
  });

  it('구독자 하나가 예외를 던져도 나머지 구독자는 불리고, 내보낸 쪽(게임 프레임)으로 예외가 새지 않는다', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const bus = new EventBus<{ ping: { n: number } }>();
    const got: number[] = [];
    bus.on('ping', () => {
      throw new Error('HUD 고장');
    });
    bus.on('ping', (e) => got.push(e.n));
    expect(() => bus.emit('ping', { n: 7 })).not.toThrow();
    expect(got).toEqual([7]);
    expect(loggedErrors().at(-1)?.where).toBe('bus:ping');
  });

  it('같은 오류가 매 프레임 이어져도 기록은 한 줄(횟수만 늘림)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const bus = new EventBus<{ tick: undefined }>();
    bus.on('tick', () => {
      throw new Error('같은 문제');
    });
    for (let i = 0; i < 100; i++) bus.emit('tick');
    expect(loggedErrors()).toHaveLength(1);
    expect(loggedErrors()[0].count).toBe(100);
  });
});

describe('화면 밖 장식 끄기 (2026-11-20 휴대폰 렉)', () => {
  const view = { x: 1000, y: 500, width: 1170, height: 540 };
  it('보이는 곳과 겹치거나 여유(220) 안이면 그린다', () => {
    expect(inView({ x0: 1100, y0: 600, x1: 1200, y1: 700 }, view)).toBe(true);
    expect(inView({ x0: 800, y0: 600, x1: 850, y1: 700 }, view)).toBe(true); // 왼쪽 여유 안
    expect(inView({ x0: 2400, y0: 600, x1: 2450, y1: 700 }, view)).toBe(false); // 오른쪽 멀리
    expect(inView({ x0: 1100, y0: 1300, x1: 1200, y1: 1400 }, view)).toBe(false); // 아래 멀리
  });
});
