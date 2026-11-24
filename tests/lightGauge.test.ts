import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';
import { dangerPulse, dangerRingOn, fadeToward, gaugeAlpha, gaugeFill, gaugeFor, gaugeShowsAfterHit, RING_ALPHA_MAX, RING_ALPHA_MIN } from '../src/systems/lightGauge';

// 2026-11-24 15:03 기획 세션(라이언 확정): 적 빛 게이지(발밑·차오름) · 마지막 하트 위험 링 · 주인공 머리 위 HP 없음
const G = GameData.game.enemyGauge;
const R = GameData.game.dangerRing;

describe('적 빛 게이지', () => {
  it('값은 game.json — 지시서 값 그대로', () => {
    expect(G).toEqual({ enabled: true, showMs: 1200, fadeMs: 300, width: 36, height: 4, offsetY: 6, kinds: ['hostile', 'lost'] });
  });
  it('호스틸·잃어버린 주민만 — 패시브·노월(boss)은 없음, 끄면 아무도 없음', () => {
    expect(gaugeFor('hostile', G)).toBe(true);
    expect(gaugeFor('lost', G)).toBe(true);
    expect(gaugeFor('passive', G)).toBe(false);
    expect(gaugeFor('boss', G)).toBe(false);
    expect(gaugeFor('hostile', { ...G, enabled: false })).toBe(false);
    // 실제 적 정의: 패시브 셋·노월은 게이지 없음, 빛을 잃은 친구는 있음
    const byKind = (id: string) => GameData.enemies.find((e) => e.id === id)?.kind ?? '';
    for (const id of ['owl', 'moth', 'firefly', 'witch']) expect(gaugeFor(byKind(id), G)).toBe(false);
    for (const id of ['bat', 'werewolf', 'vampire', 'frog', 'hedgehog', 'redpanda', 'tori-lost', 'doto-lost']) expect(gaugeFor(byKind(id), G)).toBe(true);
  });
  it('채움 = 1 − HP/maxHP (받은 빛만큼 차오름), 0~1로 자름', () => {
    expect(gaugeFill(30, 30)).toBe(0);
    expect(gaugeFill(20, 30)).toBeCloseTo(1 / 3);
    expect(gaugeFill(5, 20)).toBeCloseTo(0.75);
    expect(gaugeFill(-4, 20)).toBe(1);
    expect(gaugeFill(10, 0)).toBe(0);
  });
  it('맞으면 1.2초 보이고 0.3초에 걸쳐 사라짐 — 다시 맞으면 처음부터(지난 시간 0)', () => {
    expect(gaugeAlpha(0, G)).toBe(1);
    expect(gaugeAlpha(1200, G)).toBe(1);
    expect(gaugeAlpha(1350, G)).toBeCloseTo(0.5);
    expect(gaugeAlpha(1500, G)).toBe(0);
    expect(gaugeAlpha(5000, G)).toBe(0);
    expect(gaugeAlpha(-1, G)).toBe(0);
  });
  it('HP가 0이 되면(퇴장·구출) 그리지 않음 — HP가 남을 때만', () => {
    expect(gaugeShowsAfterHit('hostile', 12, G)).toBe(true);
    expect(gaugeShowsAfterHit('hostile', 0, G)).toBe(false);
    expect(gaugeShowsAfterHit('lost', -3, G)).toBe(false);
    expect(gaugeShowsAfterHit('passive', 12, G)).toBe(false);
  });
});

describe('마지막 하트 위험 링', () => {
  it('값은 game.json — 지시서 값 그대로', () => {
    expect(R).toEqual({ enabled: true, hpRatio: 0.5, radius: 34, pulseMs: 1200 });
  });
  it('하트 1 + HP ≤ 50%일 때만, 무적·쓰러짐 중엔 끔', () => {
    const v = { hearts: 1, hp: 50, maxHp: 100, invulnerable: false };
    expect(dangerRingOn(v, R)).toBe(true);
    expect(dangerRingOn({ ...v, hp: 51 }, R)).toBe(false);
    expect(dangerRingOn({ ...v, hearts: 2 }, R)).toBe(false);
    expect(dangerRingOn({ ...v, hearts: 0 }, R)).toBe(false);
    expect(dangerRingOn({ ...v, invulnerable: true }, R)).toBe(false);
    expect(dangerRingOn(v, { ...R, enabled: false })).toBe(false);
  });
  it('숨쉬기 0.35~0.7, 1.2초 주기(초당 1회 미만), 0.3초 페이드', () => {
    expect(dangerPulse(0, R.pulseMs)).toBeCloseTo(RING_ALPHA_MIN);
    expect(dangerPulse(600, R.pulseMs)).toBeCloseTo(RING_ALPHA_MAX);
    expect(dangerPulse(1200, R.pulseMs)).toBeCloseTo(RING_ALPHA_MIN);
    for (let t = 0; t < 2400; t += 37) {
      const a = dangerPulse(t, R.pulseMs);
      expect(a).toBeGreaterThanOrEqual(RING_ALPHA_MIN - 1e-9);
      expect(a).toBeLessThanOrEqual(RING_ALPHA_MAX + 1e-9);
    }
    expect(1000 / R.pulseMs).toBeLessThan(1);
    expect(fadeToward(0, true, 150)).toBeCloseTo(0.5);
    expect(fadeToward(0.5, true, 300)).toBe(1);
    expect(fadeToward(1, false, 150)).toBeCloseTo(0.5);
    expect(fadeToward(0.2, false, 300)).toBe(0);
  });
});
