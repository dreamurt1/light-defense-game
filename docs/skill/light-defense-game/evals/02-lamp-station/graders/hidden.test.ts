// 숨긴 채점 테스트 — 채점 때만 tests/__hidden__/에 복사한다. 모델에게 보여 주지 않는다.
// 규칙 출처: 스킬 references/gameplay-systems.md (점화 0.8초·감소 1.3/s·적 피해 ×0.6·결계 200×광도·광원 +8), characters.md(토리 점화 ×0.5)
import { describe, expect, it } from 'vitest';
import { LampStation, type StationStep } from '../../src/systems/LampStation';

/** 켜질 때까지 작은 dt로 돌리고 켜진 프레임의 결과를 돌려준다 */
const lightUp = (s: LampStation, maxSec = 2): { step: StationStep; sec: number } => {
  s.receiveLight();
  let sec = 0;
  while (sec < maxSec) {
    const step = s.update(0.01);
    sec += 0.01;
    if (step.lit) return { step, sec };
  }
  throw new Error('켜지지 않음');
};

describe('LampStation — 점화', () => {
  it('꺼진 등불로 시작한다: 게이지 0, 결계 없음', () => {
    const s = new LampStation();
    expect(s.isLit).toBe(false);
    expect(s.hp).toBe(0);
    expect(s.wardRadius).toBe(0);
  });

  it('빛이 닿으면 0.8초 뒤에 켜진다 (0.79초엔 아직)', () => {
    const s = new LampStation();
    s.receiveLight();
    expect(s.isIgniting).toBe(true);
    expect(s.update(0.79).lit).toBeUndefined();
    expect(s.isLit).toBe(false);
    const step = s.update(0.02);
    expect(step.lit).toBeDefined();
    expect(s.isLit).toBe(true);
  });

  it('켜지면 게이지 가득(100)이고 중앙 광원이 8 오른다', () => {
    const s = new LampStation();
    const { step } = lightUp(s);
    expect(s.hp).toBeCloseTo(100, 1);
    expect(step.lit?.centralHeal).toBe(8);
  });

  it('점화 시간 배율 0.5(토리)면 0.4초에 켜진다', () => {
    const s = new LampStation({ igniteMultiplier: 0.5 });
    const { sec } = lightUp(s);
    expect(sec).toBeGreaterThan(0.38);
    expect(sec).toBeLessThan(0.43);
  });
});

describe('LampStation — 켜진 동안', () => {
  it('저절로 초당 1.3씩 준다 (10초 뒤 87)', () => {
    const s = new LampStation();
    lightUp(s);
    s.update(10);
    expect(s.hp).toBeCloseTo(87, 1);
  });

  it('광도 = 게이지, 결계 반지름 = 200 × 광도/100', () => {
    const s = new LampStation();
    lightUp(s);
    s.update(10);
    expect(s.brightness).toBeCloseTo(s.hp, 5);
    expect(s.wardRadius).toBeCloseTo(200 * (s.hp / 100), 3);
  });

  it('적에게 맞으면 광원 피해 × 0.6만큼 준다', () => {
    const s = new LampStation();
    lightUp(s);
    const before = s.hp;
    s.hitByEnemy(10);
    expect(before - s.hp).toBeCloseTo(6, 3);
  });

  it('켜진 동안 빛을 맞혀도 회복하지 않고 광원도 오르지 않는다', () => {
    const s = new LampStation();
    lightUp(s);
    s.update(20);
    const before = s.hp;
    s.receiveLight();
    const step = s.update(1);
    expect(step.lit).toBeUndefined();
    expect(s.hp).toBeLessThan(before);
  });
});

describe('LampStation — 꺼짐', () => {
  it('게이지가 0이 되면 한 번 꺼짐을 알리고, 그 뒤 다시 켤 수 있다', () => {
    const s = new LampStation();
    lightUp(s);
    let outs = 0;
    for (let i = 0; i < 9000; i++) if (s.update(0.01).out) outs++;
    expect(outs).toBe(1);
    expect(s.isLit).toBe(false);
    expect(s.wardRadius).toBe(0);
    const { step } = lightUp(s);
    expect(step.lit?.centralHeal).toBe(8);
  });

  it('저절로 꺼지기까지 약 77초', () => {
    const s = new LampStation();
    lightUp(s);
    let sec = 0;
    while (s.isLit && sec < 200) {
      s.update(0.05);
      sec += 0.05;
    }
    expect(sec).toBeGreaterThan(75);
    expect(sec).toBeLessThan(79);
  });
});
