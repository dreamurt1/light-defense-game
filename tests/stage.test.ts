// 2026-11-12 새 기획(XMind 1112)의 판 규칙: HP·하트, LP, 광도 4단계, 중앙 광원, 등불 스테이션, 승패
import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';
import { Vitals } from '../src/systems/vitals';
import { LightPoints } from '../src/systems/lightPoints';
import { bandOf } from '../src/systems/lightLevel';
import { CentralSourceState } from '../src/systems/centralSource';
import { StationState } from '../src/systems/lightStation';
import { judgeStage } from '../src/systems/stageOutcome';

const G = GameData.game;
const bands = G.lightLevels.bands;

describe('Vitals: HP와 하트', () => {
  it('HP가 0이 되면 하트 1개를 잃고, 잠시 뒤 HP 100%로 다시 일어나 무적', () => {
    const v = new Vitals(G.player, 3);
    expect(v.hurt(G.player.maxHp)).toBe('down');
    expect(v.hearts).toBe(2);
    expect(v.down).toBe(true);
    expect(v.hurt(10)).toBe('none');
    expect(v.update(G.player.respawnDelaySec - 0.01, false)).toBe(false);
    expect(v.update(0.02, false)).toBe(true);
    expect(v.hp).toBe(G.player.maxHp);
    expect(v.invulnerable).toBe(true);
    expect(v.hurt(10)).toBe('none');
    v.update(G.player.invulnSec, false);
    expect(v.hurt(10)).toBe('hurt');
  });

  it('하트가 0이 되면 게임 오버(다시 일어나지 않음)', () => {
    const v = new Vitals(G.player, 1);
    expect(v.hurt(999)).toBe('out');
    expect(v.out).toBe(true);
    expect(v.update(10, false)).toBe(false);
  });

  it('맞지 않으면 자연 회복, 중앙 광원 곁에서는 더 빨리', () => {
    const far = new Vitals(G.player, 3);
    const near = new Vitals(G.player, 3);
    far.hurt(50);
    near.hurt(50);
    far.update(1, false);
    near.update(1, true);
    expect(near.hp).toBeGreaterThan(far.hp);
    far.update(G.player.regenDelaySec, false);
    expect(far.hp).toBeGreaterThan(50);
  });
});

describe('LightPoints: 빛 자원', () => {
  it('최소(낮음)보다 내려가지 않고, 최소면 사거리·위력이 weakest배', () => {
    const lp = new LightPoints(G.lp);
    for (let i = 0; i < 100; i++) lp.spend(G.lp.castCost);
    expect(lp.value).toBe(G.lp.min);
    expect(lp.effectiveness).toBeCloseTo(G.lp.weakest);
    lp.restore(999);
    expect(lp.effectiveness).toBe(1);
  });

  it('회복: 중앙 광원 > 켜진 등불 > 들판', () => {
    const rate = (zone: 'central' | 'station' | 'field') => {
      const lp = new LightPoints(G.lp);
      lp.spend(80);
      const before = lp.value;
      lp.update(1, zone);
      return lp.value - before;
    };
    expect(rate('central')).toBeGreaterThan(rate('station'));
    expect(rate('station')).toBeGreaterThan(rate('field'));
    expect(rate('field')).toBeGreaterThan(0);
  });
});

describe('광도 4단계', () => {
  it('0~100을 낮음·중간·밝음·크게 밝음으로', () => {
    expect(bandOf(0, bands)).toBe(0);
    expect(bandOf(bands[0], bands)).toBe(1);
    expect(bandOf(bands[1], bands)).toBe(2);
    expect(bandOf(100, bands)).toBe(3);
  });
});

describe('중앙 광원 (2026-11-14 라이언: HP와 광도 분리)', () => {
  it('HP 가득으로 시작하고 광도는 크게 밝음', () => {
    const c = new CentralSourceState(G.central);
    expect(c.hp).toBe(G.central.maxHp);
    expect(c.ratio).toBe(1);
    expect(bandOf(c.light, bands)).toBe(3);
  });

  it('맞으면 HP가 줄고 광도도 HP에 비례해 준다, 저절로 회복되지 않는다', () => {
    const c = new CentralSourceState(G.central);
    c.damage(G.central.maxHp * 0.6);
    expect(c.hp).toBeCloseTo(G.central.maxHp * 0.4);
    expect(c.light).toBeCloseTo(40);
    expect(bandOf(c.light, bands)).toBe(1);
    expect('update' in c).toBe(false); // 시간이 지나도 HP가 오르는 길이 없다
  });

  it('꺼진 등불을 켜면 조금 오르되 최대를 넘지 않고, 꺼진 뒤에는 오르지 않는다 (2026-11-14)', () => {
    const c = new CentralSourceState(G.central);
    expect(c.heal(G.station.centralHeal)).toBe(0); // 가득일 때
    c.damage(50);
    expect(c.heal(G.station.centralHeal)).toBeCloseTo(G.station.centralHeal);
    expect(c.hp).toBeCloseTo(G.central.maxHp - 50 + G.station.centralHeal);
    c.damage(999);
    expect(c.heal(G.station.centralHeal)).toBe(0);
    expect(c.out).toBe(true);
  });

  it('HP 0 = 꺼짐 (그 뒤로는 더 줄지 않음)', () => {
    const c = new CentralSourceState(G.central);
    c.damage(999);
    expect(c.out).toBe(true);
    expect(c.hp).toBe(0);
    expect(c.light).toBe(0);
    c.damage(5);
    expect(c.hp).toBe(0);
  });
});

describe('등불 스테이션 (2026-11-14 라이언: 켜면 HP 가득, 켜진 동안 빛으로 회복 없음)', () => {
  it('꺼짐(HP 0) → 빛을 맞으면 점화 → 켜지는 순간 HP 가득', () => {
    const s = new StationState(G.station);
    expect(s.mode).toBe('off');
    expect(s.hp).toBe(0);
    expect(s.light).toBe(0);
    expect(s.ignite()).toBe(true);
    expect(s.ignite()).toBe(false);
    expect(s.update(G.station.igniteSec / 2)).toBeNull();
    expect(s.light).toBeCloseTo(50);
    expect(s.update(G.station.igniteSec)).toBe('lit');
    expect(s.lit).toBe(true);
    expect(s.hp).toBe(G.station.maxHp);
    expect(bandOf(s.light, bands)).toBe(3);
  });

  it('켜진 동안 빛을 맞아도 HP가 늘지 않고, 적에게 맞거나 시간이 지나면 준다 (2026-11-14 자연 감소)', () => {
    const s = new StationState(G.station);
    s.ignite();
    s.update(G.station.igniteSec);
    s.damage(20);
    let hp = G.station.maxHp - 20 * G.station.damageMultiplier;
    expect(s.hp).toBeCloseTo(hp);
    expect(s.ignite()).toBe(false);
    s.update(5);
    hp -= 5 * G.station.decayPerSec;
    expect(s.hp).toBeCloseTo(hp);
    expect(s.light).toBeCloseTo((hp / G.station.maxHp) * 100);
  });

  it('아무도 건드리지 않아도 다 타면 저절로 꺼진다 — 1스테이지 한 판(100초) 안에 한 번은 다시 켜야 할 만큼', () => {
    const s = new StationState(G.station);
    s.ignite();
    s.update(G.station.igniteSec);
    let t = 0;
    let r: string | null = null;
    while (r !== 'out' && t < 300) {
      r = s.update(0.1);
      t += 0.1;
    }
    expect(r).toBe('out');
    expect(s.mode).toBe('off');
    expect(t).toBeLessThan(GameData.stages.find((x) => x.id === 'stage-1')!.durationSec);
    expect(t).toBeGreaterThan(20); // 켜자마자 꺼지지는 않게
  });

  it('적에게 맞아 HP 0이 되면 꺼지고, 그때 다시 켜면 또 가득', () => {
    const s = new StationState(G.station);
    s.ignite();
    s.update(G.station.igniteSec);
    let went = false;
    for (let i = 0; i < 500 && !went; i++) went = s.damage(10);
    expect(went).toBe(true);
    expect(s.mode).toBe('off');
    expect(s.hp).toBe(0);
    expect(s.light).toBe(0);
    expect(s.damage(10)).toBe(false);
    expect(s.ignite()).toBe(true);
    s.update(G.station.igniteSec);
    expect(s.hp).toBe(G.station.maxHp);
  });
});

describe('승패', () => {
  const base = { timeUp: false, hearts: 3, centralOut: false, centralLevel: 60, stationsOn: [true], bands };
  it('하트 0 또는 중앙 광원 꺼짐 = 오늘은 여기까지', () => {
    expect(judgeStage({ ...base, hearts: 0 })).toEqual({ outcome: 'over', reason: 'hearts' });
    expect(judgeStage({ ...base, centralOut: true })).toEqual({ outcome: 'over', reason: 'central' });
  });
  it('시간이 남았으면 계속', () => {
    expect(judgeStage(base)).toBeNull();
  });
  it('아침: 하트 1개 이상이면 기본 승리, 광원이 밝음 이상이고 등불이 모두 켜져 있으면 완전 승리', () => {
    expect(judgeStage({ ...base, timeUp: true, hearts: 1 })?.outcome).toBe('complete');
    expect(judgeStage({ ...base, timeUp: true, stationsOn: [true, false] })?.outcome).toBe('victory');
    expect(judgeStage({ ...base, timeUp: true, centralLevel: 40 })?.outcome).toBe('victory');
  });
});
