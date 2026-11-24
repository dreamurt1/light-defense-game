import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';
import { decorView, effectiveSelection, lockLine, ownedId, trailColor, type DecorCtx } from '../src/systems/cosmetics';
import { TrailState } from '../src/systems/trail';

// 2026-11-24 15:58 기획 세션(라이언 확정): 홈 상점 '스킨' → '꾸미기'(빛 모양 3 · 걸음 빛 3), 겉모습만
const C = GameData.cosmetics;

describe('꾸미기 값', () => {
  it('빛 모양 셋(별 0 · 달 20 토리 · 씨앗 20 도토), 걸음 빛 셋(없음 0 · 반딧불 가루 15 민트 · 별가루 흔적 15 호박)', () => {
    expect(C.lightShapes.map((s) => [s.id, s.price, s.requires ?? null])).toEqual([['star', 0, null], ['moon', 20, 'tori'], ['seed', 20, 'doto']]);
    expect(C.trails.map((t) => [t.id, t.price, t.color ?? null])).toEqual([['none', 0, null], ['firefly', 15, '#9ED9B5'], ['stardust', 15, '#FFC857']]);
    expect(GameData.game.trail).toMatchObject({ everyMs: 120, size: 3, lifeMs: 600, max: 8 });
  });
  it('빛 색은 그대로(5가지 · 값 · 순서)', () => {
    expect(C.lightColors.map((c) => [c.id, c.price])).toEqual([['amber', 0], ['dawn', 10], ['mint', 15], ['moon', 20], ['star', 30]]);
  });
});

describe('꾸미기 칸 상태', () => {
  const owned = new Set<string>();
  const ctx = (o: Partial<DecorCtx> = {}): DecorCtx => ({ owns: (id, price) => price <= 0 || owned.has(id), friendOpen: () => false, selected: 'star', shortId: null, ...o });
  it('가진 목록 id는 종류를 붙여 빛 색 id와 겹치지 않음', () => {
    expect(ownedId('lightShape', 'moon')).toBe('shape:moon');
    expect(ownedId('trail', 'firefly')).toBe('trail:firefly');
    expect(C.lightColors.some((c) => c.id === ownedId('lightShape', 'moon'))).toBe(false);
  });
  it('기본 칸은 처음부터 쓰는 중, 달·씨앗은 친구를 되찾기 전 잠김("토리와 함께한 뒤")', () => {
    const [star, moon, seed] = C.lightShapes;
    expect(decorView('lightShape', star, C.lightShapes, ctx())).toEqual({ state: 'equipped', tag: '쓰는 중' });
    expect(decorView('lightShape', moon, C.lightShapes, ctx())).toEqual({ state: 'locked', tag: '토리와 함께한 뒤' });
    expect(decorView('lightShape', seed, C.lightShapes, ctx())).toEqual({ state: 'locked', tag: '도토와 함께한 뒤' });
    expect(lockLine('doto')).toBe('도토와 함께한 뒤');
  });
  it('친구를 되찾으면 "사기 ✦20", 모자라면 "별가루가 부족해요", 사면 고르기 → 고르면 쓰는 중', () => {
    const moon = C.lightShapes[1];
    const open = ctx({ friendOpen: (id) => id === 'tori' });
    expect(decorView('lightShape', moon, C.lightShapes, open).tag).toBe('사기 ✦20');
    expect(decorView('lightShape', moon, C.lightShapes, { ...open, shortId: 'moon' }).tag).toBe('별가루가 부족해요');
    owned.add('shape:moon');
    expect(decorView('lightShape', moon, C.lightShapes, open).state).toBe('owned');
    expect(decorView('lightShape', moon, C.lightShapes, { ...open, selected: 'moon' }).state).toBe('equipped');
    owned.clear();
  });
  it('고른 것을 갖고 있지 않으면(진행을 지움 등) 기본으로', () => {
    expect(effectiveSelection('trail', C.trails, { owns: (_, p) => p <= 0, selected: 'firefly' })).toBe('none');
    expect(effectiveSelection('trail', C.trails, { owns: () => true, selected: 'firefly' })).toBe('firefly');
  });
  it('걸음 빛 색: 없음 = null, 반딧불 가루 = 민트', () => {
    expect(trailColor(C.trails[0])).toBeNull();
    expect(trailColor(C.trails[1])).toBe(0x9ed9b5);
  });
});

describe('걸음 빛', () => {
  const cfg = GameData.game.trail;
  const make = () => new TrailState(cfg, () => 0.5);
  const feet = { x: 100, y: 200 };
  it('걷는 동안 120ms마다 하나 — 제자리면 안 남김', () => {
    const t = make();
    t.step(119, feet, false);
    expect(t.dots.length).toBe(0);
    t.step(1, feet, false);
    expect(t.dots.length).toBe(1);
    t.step(240, feet, false);
    expect(t.dots.length).toBe(3);
    const still = make();
    for (let i = 0; i < 20; i++) still.step(60, null, false);
    expect(still.dots.length).toBe(0);
  });
  it('동시에 많아야 8개(오래된 것부터 지움), 600ms 뒤 사라짐·8px 떠오름', () => {
    const t = make();
    for (let i = 0; i < 100; i++) t.step(16, feet, false);
    expect(t.dots.length).toBeLessThanOrEqual(8);
    const one = make();
    one.step(120, feet, false);
    const d = one.dots[0];
    expect(one.look(d)).toEqual({ dy: -0, alpha: 1 });
    one.step(300, null, false);
    expect(one.look(one.dots[0]).dy).toBeCloseTo(-4);
    one.step(300, null, false);
    expect(one.dots.length).toBe(0);
  });
  it('풀숲 은신·쓰러짐·무적 중엔 0개', () => {
    const t = make();
    for (let i = 0; i < 10; i++) t.step(60, feet, false);
    expect(t.dots.length).toBeGreaterThan(0);
    t.step(16, feet, true);
    expect(t.dots.length).toBe(0);
    for (let i = 0; i < 10; i++) t.step(60, feet, true);
    expect(t.dots.length).toBe(0);
  });
});
