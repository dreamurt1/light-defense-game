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

describe('중앙 광원', () => {
  it("'중간'에서 시작해 서서히 커지고, 맞으면 줄고, 바닥에 닿으면 꺼진다", () => {
    const c = new CentralSourceState(G.central);
    expect(bandOf(c.value, bands)).toBe(1);
    c.update(10);
    expect(c.value).toBeCloseTo(G.central.start + G.central.growPerSec * 10);
    c.damage(999);
    expect(c.out).toBe(true);
    c.update(10);
    expect(c.out).toBe(true);
  });

  it('첫 스테이지: 아무것도 안 해도 끝날 때 밝음 이상까지 자란다(쉽게)', () => {
    const c = new CentralSourceState(G.central);
    c.update(GameData.stages[0].durationSec);
    expect(bandOf(c.value, bands)).toBeGreaterThanOrEqual(2);
  });
});

describe('등불 스테이션', () => {
  it('빛을 맞으면 점화 뒤 크게 밝음, 맞으면 천천히 약해지다 꺼진다', () => {
    const s = new StationState(G.station);
    expect(s.mode).toBe('off');
    expect(s.ignite()).toBe(true);
    expect(s.ignite()).toBe(false);
    expect(s.update(G.station.igniteSec / 2)).toBe(false);
    expect(s.update(G.station.igniteSec)).toBe(true);
    expect(s.lit).toBe(true);
    expect(bandOf(s.value, bands)).toBe(3);
    s.damage(10);
    expect(s.value).toBeCloseTo(G.station.on - 10 * G.station.damageMultiplier);
    let went = false;
    for (let i = 0; i < 500 && !went; i++) went = s.damage(10);
    expect(went).toBe(true);
    expect(s.mode).toBe('off');
    expect(s.ignite()).toBe(true);
  });

  it('맵 전체 광도가 더 크면 그것을 따른다', () => {
    const s = new StationState(G.station);
    expect(s.level(60)).toBe(60);
    expect(s.level(0)).toBe(G.station.off);
  });
});

describe('승패', () => {
  const base = { timeUp: false, hearts: 3, centralOut: false, centralLevel: 60, stationLevels: [100], bands };
  it('하트 0 또는 중앙 광원 꺼짐 = 오늘은 여기까지', () => {
    expect(judgeStage({ ...base, hearts: 0 })).toEqual({ outcome: 'over', reason: 'hearts' });
    expect(judgeStage({ ...base, centralOut: true })).toEqual({ outcome: 'over', reason: 'central' });
  });
  it('시간이 남았으면 계속', () => {
    expect(judgeStage(base)).toBeNull();
  });
  it('아침: 하트 1개 이상이면 기본 승리, 광원·등불 모두 밝음 이상이면 완전 승리', () => {
    expect(judgeStage({ ...base, timeUp: true, hearts: 1 })?.outcome).toBe('complete');
    expect(judgeStage({ ...base, timeUp: true, stationLevels: [100, 30] })?.outcome).toBe('victory');
    expect(judgeStage({ ...base, timeUp: true, centralLevel: 40 })?.outcome).toBe('victory');
  });
});
