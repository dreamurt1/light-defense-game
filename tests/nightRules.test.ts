import { describe, expect, it } from 'vitest';
import { GameData, type NightsDef } from '../src/data';
import {
  bandFor,
  eventModsFor,
  firstNightOfBand,
  hostileRatioFor,
  mapPoolFor,
  nightSeed,
  pathOf,
  rescueFriendFor,
  rosterWeights,
  rulesForNight,
  stepValue,
  witchComesOn,
  witchFormOf,
  type RunInfo,
} from '../src/systems/nightRules';

// 2026-11-23 밤 나들이 v3 — 밤 n의 규칙 (NIGHT_RUN.md 4-1절)
const N = GameData.nights;
const run = (over: Partial<RunInfo> = {}): RunInfo => ({ seed: 12345, keeperId: 'lumi', friendNights: {}, witchSeen: false, lastMapId: null, mercy: 0, banish: 0, ...over });

describe('구간값 표·seed', () => {
  it('밤 n 이하에서 가장 큰 키의 값 (보간 아님)', () => {
    const t = { '1': 0.75, '2': 0.6, '4': 0.5, '9': 0.65 };
    expect([1, 2, 3, 4, 8, 9, 30].map((n) => stepValue(t, n))).toEqual([0.75, 0.6, 0.6, 0.5, 0.5, 0.65, 0.65]);
    expect(stepValue(t, 0)).toBe(0.75);
  });
  it('같은 런·같은 밤이면 같은 seed, 밤이 다르면 다른 seed', () => {
    expect(nightSeed(7, 3)).toBe(nightSeed(7, 3));
    expect(nightSeed(7, 3)).not.toBe(nightSeed(7, 4));
    expect(nightSeed(7, 3, 1)).not.toBe(nightSeed(7, 3, 2));
  });
});

describe('rulesForNight — 밤 1·2·3·6·9·20', () => {
  it('밤 1: 빛의 마을, 등불 1, 박쥐 3 : 개구리 1, 적 표 = spawn 곡선의 첫 값(2026-11-23 밸런스 뒤 보통 2 / 클라이맥스 3), 행렬 없음', () => {
    const d = rulesForNight(1, run());
    expect(d.id).toBe('night-1');
    expect(d.name).toBe('밤 1');
    expect(d.band).toBe('A');
    expect(d.theme).toBe('light-village');
    expect(d.stations).toBe(1);
    expect(d.durationSec).toBe(100);
    const sp = N.spawn;
    expect(d.spawn.normal).toMatchObject({ maxAlive: Math.round(sp.normal.maxAliveStart), intervalStart: sp.normal.intervalStart[0], intervalEnd: sp.normal.intervalStart[1] });
    expect(d.spawn.climax).toMatchObject({ maxAlive: Math.round(sp.climax.maxAliveStart), intervalStart: sp.climax.intervalStart[0], intervalEnd: sp.climax.intervalStart[1] });
    expect(d.spawn.normal.maxAlive).toBeLessThan(d.spawn.climax.maxAlive);
    expect(d.spawn.normal.weights.bat! / d.spawn.normal.weights.frog!).toBeCloseTo(3);
    expect(d.spawn.onlyHostileUntilSec).toBe(6);
    expect(d.parade).toBeNull();
    expect(d.items).toEqual({ firstSec: 12, intervalSec: 20 });
    expect(d.rescue).toBeUndefined();
    expect(d.boss).toBeUndefined();
  });
  it('밤 2: 등불 2, 뱀파이어·고슴도치 합류, 행렬 1묶음 × 2마리', () => {
    const d = rulesForNight(2, run());
    expect(d.stations).toBe(2);
    expect(Object.keys(d.spawn.normal.weights).sort()).toEqual(['bat', 'frog', 'hedgehog', 'vampire']);
    expect(d.hostileRatio).toBe(0.6);
    expect(d.parade).toEqual({ groups: 1, size: 2, everySec: 28, kinds: ['owl', 'moth', 'firefly'] });
    expect(d.spawn.normal.maxAlive).toBe(Math.round(N.spawn.normal.maxAliveStart + N.spawn.normal.maxAlivePerNight));
  });
  it('밤 3: 경계의 숲(B1·B2 중 하나), 웨어울프 합류, 행렬 3마리', () => {
    const d = rulesForNight(3, run());
    expect(d.band).toBe('B');
    expect(['B1', 'B2']).toContain(d.mapId);
    expect(d.theme).toBe('border');
    expect(d.spawn.normal.weights.werewolf).toBeGreaterThan(0);
    expect(d.parade?.size).toBe(3);
  });
  it('밤 6: 어둠이 삼킨 외곽의 첫 밤은 C1, 등불 4, 호스틸 0.6', () => {
    const d = rulesForNight(6, run());
    expect(d.band).toBe('C');
    expect(d.theme).toBe('dark-village');
    expect(d.mapId).toBe('C1');
    expect(d.stations).toBe(4);
    expect(d.hostileRatio).toBe(0.6);
  });
  it('밤 9: 행렬 3묶음, 호스틸 0.65', () => {
    const d = rulesForNight(9, run());
    expect(d.parade?.groups).toBe(3);
    expect(d.hostileRatio).toBe(0.65);
  });
  it('밤이 깊으면 동시 최대는 상한, 간격은 하한까지 줄고(nights.json spawn — 밸런스로 바뀌어도 규칙대로), 아이템 간격 하한 12', () => {
    const sp = N.spawn;
    const d20 = rulesForNight(20, run());
    expect(d20.spawn.normal.intervalStart).toBeCloseTo(Math.max(sp.normal.intervalFloor[0], sp.normal.intervalStart[0] * sp.normal.intervalPerNight ** 19), 3);
    expect(d20.items?.intervalSec).toBe(12);
    const d = rulesForNight(60, run());
    expect(d.spawn.normal.maxAlive).toBe(sp.normal.maxAliveCap);
    expect(d.spawn.climax.maxAlive).toBe(sp.climax.maxAliveCap);
    expect([d.spawn.normal.intervalStart, d.spawn.normal.intervalEnd]).toEqual(sp.normal.intervalFloor);
    expect([d.spawn.climax.intervalStart, d.spawn.climax.intervalEnd]).toEqual(sp.climax.intervalFloor);
    expect(d.items?.intervalSec).toBe(12);
    // 밤이 깊을수록 거세진다(줄지 않음)
    for (let n = 1; n < 20; n++) {
      const a = rulesForNight(n, run()).spawn.climax;
      const b = rulesForNight(n + 1, run()).spawn.climax;
      expect(b.maxAlive).toBeGreaterThanOrEqual(a.maxAlive);
      expect(b.intervalStart).toBeLessThanOrEqual(a.intervalStart);
    }
  });
  it('같은 맵이 두 밤 연속 나오지 않는다 (풀에 두 장 이상일 때)', () => {
    for (let seed = 1; seed < 60; seed++) {
      const first = rulesForNight(1, run({ seed }));
      const second = rulesForNight(2, run({ seed, lastMapId: first.mapId }));
      expect(second.mapId).not.toBe(first.mapId);
    }
    // 풀에 한 장이면 그 구간의 첫 밤은 그 장
    const onlyB1: NightsDef = { ...N, bands: N.bands.map((b) => (b.id === 'B' ? { ...b, maps: ['B1'] } : b.id === 'C' ? { ...b, maps: [] } : b)) };
    expect(rulesForNight(3, run({ lastMapId: 'B1' }), {}, onlyB1).mapId).toBe('B1');
  });
  it('맵이 한 장인 구간(C = C1)은 첫 밤이 지나면 바로 아래 구간(B) 맵도 섞고, 같은 맵은 연속으로 안 나옴', () => {
    const C = N.bands.find((b) => b.id === 'C')!;
    expect(mapPoolFor(6, C)).toEqual(['C1']);
    expect(mapPoolFor(7, C)).toEqual(['C1', 'B1', 'B2']);
    const A = N.bands.find((b) => b.id === 'A')!;
    expect(mapPoolFor(2, A)).toEqual(['A1', 'A2', 'A3']);
    const seen = new Set<string>();
    for (let seed = 1; seed < 40; seed++) {
      let last: string | null = 'C1';
      for (let n = 7; n <= 12; n++) {
        const d = rulesForNight(n, run({ seed, lastMapId: last }));
        expect(d.band).toBe('C');
        expect(d.mapId).not.toBe(last);
        seen.add(d.mapId!);
        last = d.mapId;
      }
    }
    expect([...seen].sort()).toEqual(['B1', 'B2', 'C1']);
  });
  it('테스트 메뉴에서 고른 맵을 쓴다', () => {
    expect(rulesForNight(1, run(), { mapId: 'B1' }).mapId).toBe('B1');
  });
});

describe('구간·새 지역', () => {
  it('맵이 있는 가장 깊은 구간', () => {
    expect([1, 2, 3, 5, 6, 40].map((n) => bandFor(n).id)).toEqual(['A', 'A', 'B', 'B', 'C', 'C']);
    const noC: NightsDef = { ...N, bands: N.bands.map((b) => (b.id === 'C' ? { ...b, maps: [] } : b)) };
    expect(bandFor(6, noC).id).toBe('B');
  });
  it('구간에 처음 닿는 밤', () => {
    expect(firstNightOfBand(3)?.id).toBe('B');
    expect(firstNightOfBand(4)).toBeNull();
    expect(firstNightOfBand(6)?.id).toBe('C');
    expect(firstNightOfBand(7)).toBeNull();
  });
});

describe('적 섞기·두 길', () => {
  it('호스틸끼리·잃어버린 주민끼리 같은 몫', () => {
    const w = rosterWeights(['bat', 'vampire', 'frog', 'hedgehog'], 0.6);
    expect(w).toEqual({ bat: 0.3, vampire: 0.3, frog: 0.2, hedgehog: 0.2 });
    expect(rosterWeights(['bat'], 0.6)).toEqual({ bat: 1 });
  });
  it('넓히는 길: 돌려보낸 패시브가 자비보다 많은 만큼 0.1씩 (상한 0.4)', () => {
    expect(hostileRatioFor(4, { mercy: 0, banish: 0 })).toBe(0.5);
    expect(hostileRatioFor(4, { mercy: 1, banish: 3 })).toBe(0.7);
    expect(hostileRatioFor(4, { mercy: 0, banish: 9 })).toBe(0.9);
    expect(hostileRatioFor(9, { mercy: 0, banish: 9 })).toBe(1);
    expect(hostileRatioFor(4, { mercy: 5, banish: 3 })).toBe(0.5);
  });
  it('pathOf: 자비 > 돌려보냄 = 지키는 길, 반대 = 넓히는 길, 같으면 중립', () => {
    expect(pathOf({ mercy: 3, banish: 1 })).toBe('keep');
    expect(pathOf({ mercy: 1, banish: 3 })).toBe('expand');
    expect(pathOf({ mercy: 2, banish: 2 })).toBe('mixed');
  });
  it('랜덤 이벤트 조정: 어둠 바람은 밤 2부터·밤 6부터 ×2, 지키는 길 = 어둠 바람 없음·화해 ×2, 넓히는 길 = 반딧불 무리 없음', () => {
    expect(eventModsFor(1, 'mixed').exclude).toContain('darkWind');
    expect(eventModsFor(2, 'mixed').exclude).not.toContain('darkWind');
    expect(eventModsFor(6, 'mixed').weightMul?.darkWind).toBe(2);
    const keep = eventModsFor(4, 'keep');
    expect(keep.exclude).toContain('darkWind');
    expect(keep.weightMul?.gift).toBe(2);
    expect(eventModsFor(4, 'expand').exclude).toContain('fireflies');
  });
});

describe('친구 구출·노월', () => {
  it('토리: 밤 1엔 없음, 밤 3이면 반드시, 토리로 뛰면 없음', () => {
    expect(rescueFriendFor(1, run())).toBeNull();
    for (let seed = 1; seed < 40; seed++) expect(rescueFriendFor(3, run({ seed }))).toBe('tori');
    expect(rescueFriendFor(3, run({ keeperId: 'tori' }))).toBeNull();
    // 밤 2는 반반 (seed에 따라)
    const n2 = Array.from({ length: 200 }, (_, seed) => rescueFriendFor(2, run({ seed })));
    const share = n2.filter((x) => x === 'tori').length / n2.length;
    expect(share).toBeGreaterThan(0.3);
    expect(share).toBeLessThan(0.7);
  });
  it('도토: 토리를 되찾고 2밤 뒤부터, 그다음 밤이면 반드시', () => {
    const r = run({ friendNights: { tori: 3 } });
    expect(rescueFriendFor(4, r)).toBeNull();
    for (let seed = 1; seed < 40; seed++) expect(rescueFriendFor(6, { ...r, seed })).toBe('doto');
    expect(rescueFriendFor(9, run({ friendNights: { tori: 3, doto: 6 } }))).toBeNull();
    // 토리로 뛰는 런은 토리가 처음 나올 밤(2)에 함께한 것으로: 밤 5면 반드시 도토
    expect(rescueFriendFor(5, run({ keeperId: 'tori' }))).toBe('doto');
  });
  it('구출 밤의 판에는 빛을 잃은 친구가 진행 30%에', () => {
    expect(rulesForNight(3, run()).rescue).toEqual({ enemyId: 'tori-lost', atProgress: 0.3 });
  });
  it('노월: 밤 5부터, 친구 둘이 함께일 때만, 밤 10이면 반드시, 한 런에 한 번, 구출 밤엔 없음', () => {
    const both = run({ friendNights: { tori: 2, doto: 4 } });
    expect(witchComesOn(4, both, false)).toBe(false);
    expect(witchComesOn(10, run(), false)).toBe(false); // 친구 없음
    expect(witchComesOn(10, both, false)).toBe(true);
    expect(witchComesOn(10, both, true)).toBe(false);
    expect(witchComesOn(10, { ...both, witchSeen: true }, false)).toBe(false);
    const d = rulesForNight(10, both);
    expect(d.witch).toBe(true);
    expect(d.boss).toEqual({ enemyId: 'witch', atSec: 8 });
    // 밤 5~9는 낮은 확률(12%)
    const hits = Array.from({ length: 400 }, (_, seed) => witchComesOn(5, { ...both, seed }, false)).filter(Boolean).length / 400;
    expect(hits).toBeGreaterThan(0.05);
    expect(hits).toBeLessThan(0.2);
  });
  it('노월 두 모습: 넓히는 길이면 분노한 노월(HP·소환·구슬·점수가 거셈, 눈빛 잔불 주황), 아니면 찾아온 노월', () => {
    expect(witchFormOf('expand')).toBe('angry');
    expect(witchFormOf('keep')).toBe('calm');
    expect(witchFormOf('mixed')).toBe('calm');
    expect(witchFormOf(undefined)).toBe('calm');
    expect(rulesForNight(10, run({ friendNights: { tori: 2, doto: 4 }, banish: 3 })).path).toBe('expand');
    const { calm, angry } = GameData.game.boss;
    expect([calm.hp, calm.summonCount, calm.summonCap, calm.orbEverySec, calm.orbDamage, calm.score]).toEqual([150, 2, 6, 4.5, 6, 1000]);
    expect([angry.hp, angry.summonCount, angry.summonCap, angry.orbEverySec, angry.orbDamage, angry.score]).toEqual([250, 3, 8, 3.5, 8, 2000]);
    expect(angry.eye.toUpperCase()).toBe('#FF8C5A');
    expect(calm.enterLine).toBe('…이 빛, 생각보다 따뜻하네');
    expect(angry.enterLine).toBe('빛이 너무 멀리까지 왔구나');
  });
});
