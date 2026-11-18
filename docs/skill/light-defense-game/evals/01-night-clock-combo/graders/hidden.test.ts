// 숨긴 채점 테스트 — 채점 때만 tests/__hidden__/에 복사한다. 모델에게 보여 주지 않는다.
// 규칙 출처: 스킬 references/gameplay-systems.md (스테이지 100초·시간대 40/70%·콤보 3초 reset·배율 최대 4)
import { describe, expect, it } from 'vitest';
import { NightClock } from '../../src/systems/NightClock';
import { ComboSystem } from '../../src/systems/ComboSystem';

const at = (sec: number, duration?: number): NightClock => {
  const c = duration === undefined ? new NightClock() : new NightClock(duration);
  c.update(sec);
  return c;
};

describe('NightClock — 한 판 100초', () => {
  it('기본 한 판 길이는 100초다: 99.9초엔 아직, 100초엔 아침', () => {
    expect(at(99.9).isDawn).toBe(false);
    const c = at(100);
    expect(c.isDawn).toBe(true);
    expect(c.phase).toBe('dawn');
  });

  it('시간은 한 판 길이를 넘지 않고 진행률은 1에서 멈춘다', () => {
    const c = at(130);
    expect(c.t).toBeCloseTo(100, 5);
    expect(c.progress).toBeCloseTo(1, 5);
  });

  it('작은 dt를 여러 번 더해도 같은 결과', () => {
    const c = new NightClock();
    for (let i = 0; i < 600; i++) c.update(1 / 60);
    expect(c.t).toBeCloseTo(10, 3);
    expect(c.progress).toBeCloseTo(0.1, 3);
  });
});

describe('NightClock — 시간대 40% / 70%', () => {
  it('0~40% 초저녁', () => {
    expect(at(0).phase).toBe('dusk');
    expect(at(39.9).phase).toBe('dusk');
  });

  it('40~70% 한밤중, 아직 클라이맥스 아님', () => {
    expect(at(40).phase).toBe('midnight');
    const c = at(69.9);
    expect(c.phase).toBe('midnight');
    expect(c.isClimax).toBe(false);
  });

  it('70%부터 새벽 전 = 클라이맥스', () => {
    const c = at(70);
    expect(c.phase).toBe('predawn');
    expect(c.isClimax).toBe(true);
  });

  it('경계는 초가 아니라 진행률이다 (200초 판이면 80초·140초)', () => {
    expect(at(79, 200).phase).toBe('dusk');
    expect(at(80, 200).phase).toBe('midnight');
    expect(at(140, 200).phase).toBe('predawn');
  });
});

describe('ComboSystem — 3초 안에 없으면 0으로', () => {
  it('처리마다 +1', () => {
    const k = new ComboSystem();
    k.hit();
    k.hit();
    expect(k.combo).toBe(2);
  });

  it('2.9초는 이어지고, 3초를 넘기면 0으로 끝난다(절반이 아님)', () => {
    const k = new ComboSystem();
    for (let i = 0; i < 8; i++) k.hit();
    k.update(2.9);
    expect(k.combo).toBe(8);
    k.update(0.2);
    expect(k.combo).toBe(0);
  });

  it('다음 처리가 오면 3초가 새로 시작된다', () => {
    const k = new ComboSystem();
    k.hit();
    k.update(2.5);
    k.hit();
    k.update(2.5);
    expect(k.combo).toBe(2);
  });
});

describe('ComboSystem — 배율 1 + ⌊콤보÷5⌋×0.5, 최대 4', () => {
  const after = (n: number): number => {
    const k = new ComboSystem();
    for (let i = 0; i < n; i++) k.hit();
    return k.multiplier;
  };

  it('0~4는 1배', () => {
    expect(after(0)).toBe(1);
    expect(after(4)).toBe(1);
  });

  it('5 → 1.5, 10 → 2, 15 → 2.5', () => {
    expect(after(5)).toBeCloseTo(1.5);
    expect(after(10)).toBeCloseTo(2);
    expect(after(15)).toBeCloseTo(2.5);
  });

  it('30에서 4배, 그 위로는 4배에 멈춤', () => {
    expect(after(30)).toBeCloseTo(4);
    expect(after(45)).toBeCloseTo(4);
  });

  it('콤보가 끊기면 배율도 1로', () => {
    const k = new ComboSystem();
    for (let i = 0; i < 12; i++) k.hit();
    k.update(3.1);
    expect(k.multiplier).toBe(1);
  });
});
