// 숨긴 채점 테스트 — 채점 때만 tests/__hidden__/에 복사한다. 모델에게 보여 주지 않는다.
// 규칙 출처: 스킬 references/gameplay-systems.md '조작'·'반자동 연사' (겨눔 문턱 0.35, 반자동 0.12초, 몸 가장자리 기준 자동 조준)
import { describe, expect, it } from 'vitest';
import { AimStick, autoAimAngle } from '../../src/systems/aimStick';
import { AutoFire } from '../../src/systems/autoFire';
import { LightStickAdapter, type InputEvent } from '../../src/input/lightStick';

describe('AimStick — 겨눔 문턱(기본 35%)', () => {
  it('반지름 30%만 밀린 채 떼면 겨눔이 아니라 짧게 탭', () => {
    const s = new AimStick();
    s.down();
    expect(s.move(0.3, 0)).toBe(false);
    expect(s.up()).toEqual({ kind: 'auto' });
  });

  it('40% 넘게 끈 채 떼면 그 방향·그 정도로 발사', () => {
    const s = new AimStick();
    s.down();
    expect(s.move(0, 0.4)).toBe(true);
    const r = s.up();
    expect(r?.kind).toBe('fire');
    if (r?.kind === 'fire') {
      expect(r.angle).toBeCloseTo(Math.PI / 2, 3);
      expect(r.power).toBeCloseTo(0.4, 3);
    }
  });

  it('끌었다가 가운데로 되돌려 떼면 취소', () => {
    const s = new AimStick();
    s.down();
    s.move(0.8, 0);
    s.move(0.05, 0);
    expect(s.up()).toEqual({ kind: 'cancel' });
  });

  it('누르지 않았으면 up()은 null', () => {
    expect(new AimStick().up()).toBeNull();
  });
});

describe('autoAimAngle — 사거리 안 가장 가까운 적, 없으면 null', () => {
  const o = { x: 0, y: 0 };

  it('가장 가까운 적 쪽으로', () => {
    expect(autoAimAngle(o, [{ x: 0, y: 150 }, { x: 100, y: 0 }], 220)).toBeCloseTo(0, 5);
  });

  it('사거리 안에 아무도 없으면 쏘지 않는다(null)', () => {
    expect(autoAimAngle(o, [{ x: 0, y: -500 }], 220)).toBeNull();
    expect(autoAimAngle(o, [], 220)).toBeNull();
  });

  it('적 몸 가장자리(radius)까지 사거리 안이면 잡는다 — 그보다 멀면 안 잡는다', () => {
    expect(autoAimAngle(o, [{ x: 240, y: 0, radius: 30 }], 220)).toBeCloseTo(0, 5);
    expect(autoAimAngle(o, [{ x: 260, y: 0, radius: 30 }], 220)).toBeNull();
  });

  it('가장 가까운 것도 몸 가장자리 거리로 고른다', () => {
    expect(autoAimAngle(o, [{ x: 0, y: 150, radius: 0 }, { x: 170, y: 0, radius: 40 }], 220)).toBeCloseTo(0, 5);
  });
});

describe('AutoFire — 누른 채 기본 0.12초 뒤 반자동', () => {
  it('0.1초엔 아직, 0.13초엔 쏠 차례', () => {
    const a = new AutoFire();
    a.press();
    expect(a.update(0.1, true)).toBe(false);
    expect(a.update(0.03, true)).toBe(true);
  });

  it('빛이 준비되지 않았으면 쏘지 않는다', () => {
    const a = new AutoFire();
    a.press();
    expect(a.update(0.5, false)).toBe(false);
  });

  it('끌기 시작하면(stop) 멈춘다', () => {
    const a = new AutoFire();
    a.press();
    a.update(0.2, true);
    a.stop();
    expect(a.update(0.2, true)).toBe(false);
  });

  it('누르는 동안 한 발 쐈으면 뗄 때 탭 발사는 막고, 다시 누르면 풀린다', () => {
    const a = new AutoFire();
    a.press();
    a.update(0.2, true);
    a.fired();
    expect(a.tapAllowed).toBe(false);
    a.stop();
    a.press();
    expect(a.tapAllowed).toBe(true);
  });

  it('PC 스페이스(key)는 기다리지 않는다', () => {
    const a = new AutoFire();
    expect(a.update(0.016, true, true)).toBe(true);
  });
});

describe('LightStickAdapter — 게임 이벤트', () => {
  const run = (act: (s: LightStickAdapter) => void): InputEvent[] => {
    const out: InputEvent[] = [];
    act(new LightStickAdapter((e) => out.push(e)));
    return out;
  };

  it('누르면 반자동 시작(input:auto true)', () => {
    const ev = run((s) => s.press());
    expect(ev).toContainEqual({ type: 'input:auto', active: true });
  });

  it('짧게 탭하고 떼면 자동 조준 발사(angle null), 반자동은 꺼짐', () => {
    const ev = run((s) => {
      s.press();
      s.release();
    });
    const fire = ev.find((e) => e.type === 'input:fire');
    expect(fire && fire.type === 'input:fire' ? fire.angle : 'none').toBeNull();
    const autos = ev.filter((e) => e.type === 'input:auto');
    expect(autos[autos.length - 1]).toEqual({ type: 'input:auto', active: false });
  });

  it('끌면 반자동이 꺼지고 겨눔 표시가 켜지며, 떼면 그 방향으로 발사', () => {
    const ev = run((s) => {
      s.press();
      s.drag(0.6, 0);
      s.release();
    });
    const afterPress = ev.slice(1);
    expect(afterPress).toContainEqual({ type: 'input:auto', active: false });
    expect(ev.some((e) => e.type === 'input:aim' && e.active)).toBe(true);
    const fire = ev.find((e) => e.type === 'input:fire');
    expect(fire?.type === 'input:fire' && fire.angle !== null ? fire.angle : NaN).toBeCloseTo(0, 3);
  });

  it('끌었다 가운데로 되돌려 떼면 발사하지 않는다', () => {
    const ev = run((s) => {
      s.press();
      s.drag(0.7, 0);
      s.drag(0.05, 0);
      s.release();
    });
    expect(ev.some((e) => e.type === 'input:fire')).toBe(false);
  });

  it('엄지가 30%쯤 밀려도 겨눔으로 바뀌지 않는다(반자동 유지)', () => {
    const ev = run((s) => {
      s.press();
      s.drag(0.25, 0.15);
    });
    expect(ev.some((e) => e.type === 'input:aim' && e.active)).toBe(false);
    expect(ev).not.toContainEqual({ type: 'input:auto', active: false });
  });
});
