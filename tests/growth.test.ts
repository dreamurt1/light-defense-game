import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';
import { addXp, growthEffects, growthLine, xpNeed } from '../src/systems/growth';
import { DustTally } from '../src/systems/stardust';
import { buyPrep, canBuy, prepEffects } from '../src/systems/shop';
import { morningAfter, newRunData } from '../src/systems/nightRun';
import { isUnlocked } from '../src/systems/unlocks';

// 2026-11-23 밤 나들이 v3 — 빛 레벨 ★ · 별가루 ✦ · 아침 상점 (NIGHT_RUN.md 6절)
const G = GameData.game.growth;
const prep = (id: string) => GameData.shop.prep.find((p) => p.id === id)!;

describe('빛 레벨 ★ (런 안에서만)', () => {
  it('★1 → ★2에 10, ★2 → ★3에 15 … 최대 ★10', () => {
    expect([1, 2, 9, 10].map((l) => xpNeed(l, G))).toEqual([10, 15, 50, Infinity]);
    expect(addXp({ level: 1, xp: 0 }, 9, G)).toEqual({ level: 1, xp: 9, ups: 0 });
    expect(addXp({ level: 1, xp: 9 }, 3, G)).toEqual({ level: 2, xp: 2, ups: 1 });
    expect(addXp({ level: 1, xp: 0 }, 25, G)).toEqual({ level: 3, xp: 0, ups: 2 });
    expect(addXp({ level: 9, xp: 49 }, 999, G)).toEqual({ level: 10, xp: 0, ups: 1 });
    expect(addXp({ level: 10, xp: 0 }, 5, G).level).toBe(10);
  });
  it('경험치: 구출 3 · 호스틸 2 · 등불 2 · 자비 2 · 패시브 돌려보냄 1', () => {
    expect(G.xp).toEqual({ rescue: 3, returnHostile: 2, station: 2, mercy: 2, banishPassive: 1 });
  });
  it('레벨마다 위력 +5% · 사거리 +2%(최대 ×1.2) · 최대 LP +5, 토리 이동·도토 아이템은 그 친구만', () => {
    const l1 = growthEffects(1, 'lumi', G);
    expect(l1).toEqual({ lightPower: 1, lightRange: 1, lpMax: 0, move: 1, itemEffect: 1 });
    const l5 = growthEffects(5, 'lumi', G);
    expect(l5.lightPower).toBeCloseTo(1.2);
    expect(l5.lightRange).toBeCloseTo(1.08);
    expect(l5.lpMax).toBe(20);
    expect(growthEffects(10, 'lumi', G).lightRange).toBeCloseTo(1.18);
    expect(growthEffects(99, 'lumi', G).lightRange).toBeLessThanOrEqual(1.2);
    expect(growthEffects(5, 'tori', G).move).toBeCloseTo(1.04);
    expect(growthEffects(5, 'lumi', G).move).toBe(1);
    expect(growthEffects(5, 'doto', G).itemEffect).toBeCloseTo(1.12);
  });
  it('아침에 보일 오른 효과 한 줄', () => {
    expect(growthLine(2, 4, 'lumi', G)).toBe('빛 위력 +10% · 사거리 +4% · 최대 LP +10');
    expect(growthLine(3, 3, 'lumi', G)).toBe('');
    expect(growthLine(1, 2, 'tori', G)).toContain('이동 +1%');
  });
  it('런이 끝나면 ★1 (새 런은 ★1부터, 영구 성장 없음)', () => {
    expect(G.resetOnRunEnd).toBe(true);
    let run = { ...newRunData(1, 'lumi', 3), level: 6, xp: 12 };
    run = morningAfter(run, { outcome: 'victory', score: 0, survivedSec: 100, heartsLeft: 3, rescued: 0, retreated: 0, stationsLit: 0, maxCombo: 0, mercy: 0, itemsUsed: 0, level: 7, xp: 3 }, GameData.game.run);
    expect([run.level, run.xp]).toEqual([7, 3]);
    expect(newRunData(2, 'lumi', 3).level).toBe(1);
  });
});

describe('별가루 ✦', () => {
  it('등불 2 · 구출 1 · 자비 1 · 노월 20, 밤 끝에 승리 5 / 완전 승리 10 / 여기까지 0', () => {
    const t = new DustTally(GameData.game.dust);
    t.add('station');
    t.add('station');
    t.add('rescue', 3);
    t.add('mercy');
    expect(t.total).toBe(8);
    expect(t.finish('complete')).toBe(10);
    expect(t.total).toBe(18);
    const w = new DustTally(GameData.game.dust);
    w.add('witch');
    expect(w.finish('over')).toBe(0);
    expect(w.total).toBe(20);
    expect(new DustTally(GameData.game.dust).finish('victory')).toBe(5);
  });
});

describe('아침 상점', () => {
  it('준비물 넷: 등불 기름 12 · 여분 하트 20 · 큰 주머니 15 · 부적 하나 더 8', () => {
    expect(GameData.shop.prep.map((p) => [p.id, p.price, p.perRun])).toEqual([
      ['lamp_oil', 12, 1],
      ['spare_heart', 20, 1],
      ['big_pouch', 15, 1],
      ['extra_charm', 8, 0],
    ]);
  });
  it('별가루가 모자라면 short, 한 번짜리를 이미 샀으면 owned', () => {
    const run = newRunData(1, 'lumi', 3);
    expect(canBuy(prep('lamp_oil'), run, 11)).toBe('short');
    expect(canBuy(prep('lamp_oil'), run, 12)).toBe('ok');
    const bought = buyPrep(prep('lamp_oil'), run, 4);
    expect(canBuy(prep('lamp_oil'), bought, 99)).toBe('owned');
    // 부적 하나 더는 아침마다 다시 살 수 있다
    const charm = buyPrep(prep('extra_charm'), bought, 4);
    expect(canBuy(prep('extra_charm'), charm, 99)).toBe('ok');
  });
  it('여분 하트는 사는 순간 +1 (최대 4)', () => {
    expect(buyPrep(prep('spare_heart'), newRunData(1, 'lumi', 3), 4).hearts).toBe(4);
    expect(buyPrep(prep('spare_heart'), { ...newRunData(1, 'lumi', 3), hearts: 4 }, 4).hearts).toBe(4);
  });
  it('효과: 등불 기름 = 초당 0.9, 큰 주머니 = 칸 3, 부적 하나 더 = 다음 밤만 2개', () => {
    const base = { itemSlots: 2, charms: 1 };
    let run = newRunData(1, 'lumi', 3);
    expect(prepEffects(run, GameData.shop.prep, base)).toEqual({ stationDecayPerSec: null, itemSlots: 2, charms: 1 });
    run = buyPrep(prep('lamp_oil'), run, 4);
    run = buyPrep(prep('big_pouch'), run, 4);
    run = buyPrep(prep('extra_charm'), run, 4);
    expect(prepEffects(run, GameData.shop.prep, base)).toEqual({ stationDecayPerSec: 0.9, itemSlots: 3, charms: 2 });
    // 밤을 지나면 부적 하나 더는 사라지고 한 번짜리는 남는다
    const next = morningAfter(run, { outcome: 'victory', score: 0, survivedSec: 100, heartsLeft: 3, rescued: 0, retreated: 0, stationsLit: 0, maxCombo: 0, mercy: 0, itemsUsed: 0 }, GameData.game.run);
    expect(prepEffects(next, GameData.shop.prep, base)).toEqual({ stationDecayPerSec: 0.9, itemSlots: 3, charms: 1 });
  });
  it('챙겨 갈 아이템은 최고 밤 수로 열린다 (밤 2·4·6)', () => {
    expect(isUnlocked('night-2', 1)).toBe(false);
    expect(isUnlocked('night-2', 2)).toBe(true);
  });
});
