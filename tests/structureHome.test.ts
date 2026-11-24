import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';
import { homeBonus } from '../src/systems/stardust';
import { nextNightPreview, previewLine } from '../src/systems/morningPreview';
import type { RunInfo } from '../src/systems/nightRules';

// 2026-11-24 구조 보강 ① (라이언 확정): '집으로' 귀가 보너스 · 아침 다음 밤 미리 보기
const D = GameData.game.dust;
const run = (over: Partial<RunInfo> = {}): RunInfo => ({ seed: 12345, keeperId: 'lumi', friendNights: {}, witchSeen: false, lastMapId: null, mercy: 0, banish: 0, ...over });

describe('귀가 보너스', () => {
  it('이번 나들이 별가루 +20% 올림, 최소 +1', () => {
    expect([D.homeBonusRatio, D.homeBonusMin]).toEqual([0.2, 1]);
    expect(homeBonus(0, D)).toBe(1);
    expect(homeBonus(3, D)).toBe(1);
    expect(homeBonus(7, D)).toBe(2); // 1.4 → 2
    expect(homeBonus(50, D)).toBe(10);
    expect(homeBonus(51, D)).toBe(11); // 10.2 → 11
  });
});

describe('아침 다음 밤 미리 보기', () => {
  it('구간 이름·등불 수는 그 밤 규칙대로, 적이 늘면 "적이 조금 더 거세요"', () => {
    const p = nextNightPreview(run(), 2);
    expect(p.band).toBe('빛의 마을');
    expect(p.harder).toBe(true);
    expect(previewLine(p)).toBe(`다음 밤: 빛의 마을 · 등불 ${p.stations} · 적이 조금 더 거세요`);
    expect(nextNightPreview(run(), 3).band).toBe('경계의 숲');
  });
  it('동시 최대가 같으면(상한) "오늘과 비슷해요"', () => {
    const p = nextNightPreview(run({ friendNights: { tori: 1, doto: 1 }, witchSeen: true }), 40);
    expect(p.harder).toBe(false);
    expect(previewLine(p)).toMatch(/오늘과 비슷해요$/);
  });
  it('구출 밤 예정은 밝히지 않는다 — 구출이 있는 런과 없는 런의 적 비교가 같다', () => {
    const withRescue = nextNightPreview(run(), 3); // 밤 3은 토리 구출이 확정인 밤
    const calm = nextNightPreview(run({ friendNights: { tori: 1, doto: 1 }, witchSeen: true }), 3);
    expect(withRescue.harder).toBe(calm.harder);
  });
});
