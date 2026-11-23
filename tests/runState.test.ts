import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';
import { morningAfter, newRunData, nightsCleared, parseRun, recordNight, runInfo, summarize, type NightOutcome } from '../src/systems/nightRun';
import { clearRun, loadRun, RUN_SAVE_KEY, saveRun } from '../src/core/runSave';
import { migrateProgressV1 } from '../src/core/Progress';
import { nightSeed } from '../src/systems/nightRules';

// 2026-11-23 밤 나들이 v3 — 런 상태 (NIGHT_RUN.md 4-2·4-3·4-4절)
const CFG = GameData.game.run;

function night(over: Partial<NightOutcome> = {}): NightOutcome {
  return { outcome: 'victory', score: 1000, survivedSec: 100, heartsLeft: 3, rescued: 2, retreated: 5, stationsLit: 1, maxCombo: 7, mercy: 1, itemsUsed: 1, ...over };
}

function memoryStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}

describe('런 상태 — 아침 넘어가기', () => {
  it('새 런은 밤 1, 하트 3, ★1', () => {
    const r = newRunData(99, 'lumi', 3);
    expect([r.night, r.hearts, r.level, r.score, nightsCleared(r)]).toEqual([1, 3, 1, 0, 0]);
  });
  it('이긴 밤 → 다음 밤, 하트는 이어지고(아침 회복 0), 점수는 쌓인다', () => {
    const r = morningAfter(newRunData(1, 'lumi', 3), night({ heartsLeft: 2, score: 1200 }), CFG);
    expect(r.night).toBe(2);
    expect(r.hearts).toBe(2);
    expect(r.score).toBe(1200);
    expect(r.carriedLitStations).toBe(0);
    const r2 = morningAfter(r, night({ heartsLeft: 1, score: 800 }), CFG);
    expect([r2.night, r2.hearts, r2.score, nightsCleared(r2)]).toEqual([3, 1, 2000, 2]);
  });
  it('완전 승리 = 하트 +1(최대 4) + 다음 밤 등불 하나 켜진 채', () => {
    const r = morningAfter(newRunData(1, 'lumi', 3), night({ outcome: 'complete', heartsLeft: 3 }), CFG);
    expect(r.hearts).toBe(4);
    expect(r.carriedLitStations).toBe(1);
    const r2 = morningAfter(r, night({ outcome: 'complete', heartsLeft: 4 }), CFG);
    expect(r2.hearts).toBe(4);
    // 다음 밤에 이기기만 하면 켜진 채 시작은 사라진다
    expect(morningAfter(r2, night(), CFG).carriedLitStations).toBe(0);
  });
  it('아침 회복 1이면 밤마다 하트 +1 (game.json run.morningHeal)', () => {
    expect(morningAfter(newRunData(1, 'lumi', 3), night({ heartsLeft: 1 }), { ...CFG, morningHeal: 1 }).hearts).toBe(2);
  });
  it('진 밤에는 아침이 없다', () => {
    expect(() => morningAfter(newRunData(1, 'lumi', 3), night({ outcome: 'over' }), CFG)).toThrow();
  });
  it('되찾은 친구·노월·자비·돌려보낸 패시브·통계가 런에 쌓인다', () => {
    let r = newRunData(1, 'lumi', 3);
    r = morningAfter(r, night({ friends: ['tori'], mercy: 2, banish: 1, mapId: 'A2' }), CFG);
    expect(r.friendNights).toEqual({ tori: 1 });
    expect(r.lastMapId).toBe('A2');
    r = morningAfter(r, night({ friends: ['tori'], witch: true, maxCombo: 12, banish: 2 }), CFG);
    expect(r.friendNights).toEqual({ tori: 1 }); // 처음 되찾은 밤 그대로
    expect(r.witchSeen).toBe(true);
    expect([r.mercy, r.banish]).toEqual([3, 3]);
    expect(r.stats).toMatchObject({ rescued: 4, retreated: 10, maxCombo: 12, survivedSec: 200 });
    expect(runInfo(r)).toMatchObject({ keeperId: 'lumi', friendNights: { tori: 1 }, witchSeen: true, mercy: 3, banish: 3 });
  });
});

describe('런의 끝 — 요약', () => {
  it('패배: 그 밤에서 끝, 아침을 맞은 밤 수 = 그 앞까지', () => {
    let r = newRunData(1, 'tori', 3);
    r = morningAfter(r, night(), CFG);
    r = morningAfter(r, night(), CFG);
    r = recordNight(r, night({ outcome: 'over', score: 300, survivedSec: 42 }));
    const s = summarize(r, 'over', 'hearts', 42);
    expect([s.night, s.nights, s.score, s.lastSurvivedSec, s.characterId]).toEqual([3, 2, 2300, 42, 'tori']);
  });
  it('집으로: 마지막으로 아침을 맞은 밤', () => {
    let r = newRunData(1, 'lumi', 3);
    for (let i = 0; i < 4; i++) r = morningAfter(r, night({ mercy: 2, banish: 0 }), CFG);
    const s = summarize(r, 'home', 'home', 100);
    expect([s.night, s.nights, s.path]).toEqual([4, 4, 'keep']);
  });
});

describe('저장·이어하기 (ld.run.v1)', () => {
  it('저장 → 불러오기 왕복, 지우면 없음', () => {
    const store = memoryStore();
    const r = morningAfter(newRunData(7, 'doto', 3), night({ friends: ['tori'] }), CFG);
    saveRun(r, store);
    expect(store.m.has(RUN_SAVE_KEY)).toBe(true);
    expect(loadRun(store)).toEqual(r);
    clearRun(store);
    expect(loadRun(store)).toBeNull();
  });
  it('깨지거나 모양이 틀린 저장은 없는 것으로', () => {
    expect(parseRun(null)).toBeNull();
    expect(parseRun('{')).toBeNull();
    expect(parseRun(JSON.stringify({ v: 2 }))).toBeNull();
    const ok = newRunData(1, 'lumi', 3);
    expect(parseRun(JSON.stringify({ ...ok, night: 0 }))).toBeNull();
    expect(parseRun(JSON.stringify({ ...ok, characterId: 'fox' }))).toBeNull();
    expect(parseRun(JSON.stringify({ ...ok, friendNights: { tori: 2, fox: 1 } }))?.friendNights).toEqual({ tori: 2 });
  });
  it('같은 밤을 다시 하면 같은 seed (RunState.newRun)', async () => {
    const { RunState, NIGHT_STAGE } = await import('../src/core/RunState');
    RunState.stageId = NIGHT_STAGE;
    RunState.run = { ...newRunData(555, 'lumi', 3), night: 4 };
    RunState.newRun();
    const a = RunState.seed;
    RunState.newRun();
    expect(RunState.seed).toBe(a);
    expect(a).toBe(nightSeed(555, 4));
    RunState.run = null;
    RunState.stageId = 'tutorial';
  });
});

describe('진행 v1 → v2 (열려 있던 준비물·빛 색은 잃지 않게)', () => {
  it('깬 스테이지 → 최고 밤 2·4·6, 열린 빛 색 → 가진 색', () => {
    const p = migrateProgressV1({ tutorialDone: true, cleared: ['stage-1', 'stage-2'], friends: ['tori'], demo: false });
    expect(p).toMatchObject({ tutorialDone: true, friends: ['tori'], bestNight: 4, bestScore: 0, dust: 0, cosmetics: ['dawn', 'mint'] });
    expect(migrateProgressV1({ cleared: ['stage-4', 'stage-3'] }).bestNight).toBe(6);
    expect(migrateProgressV1({}).bestNight).toBe(0);
  });
});

describe('런 흐름 — 밤의 끝 → 아침 / 런의 끝 (core/runFlow.ts)', () => {
  it('정식 런의 이긴 밤 → run:morning(다음 밤), 진 밤 → run:end(요약)', async () => {
    const { bus } = await import('../src/core/events');
    const { RunState, NIGHT_STAGE } = await import('../src/core/RunState');
    const { installRunFlow, outcomeOf } = await import('../src/core/runFlow');
    const { Progress } = await import('../src/core/Progress');
    installRunFlow();
    Progress.reset();
    const result = (over: object) => ({ ...night(), outcome: 'victory', reason: 'time', stageId: 'night-1', characterId: 'lumi', seed: 1, continued: false, stationsTotal: 1, bossCalmed: false, ...over }) as never;
    RunState.stageId = NIGHT_STAGE;
    RunState.test = false;
    RunState.run = newRunData(3, 'lumi', 3);
    const seen: string[] = [];
    const offs = [
      bus.on('run:morning', (e) => seen.push(`morning:${e.before.night}->${e.run.night}`)),
      bus.on('run:end', (e) => seen.push(`end:${e.summary.outcome}:${e.summary.night}:${e.summary.nights}:${e.best}`)),
    ];
    bus.emit('game:clear', { result: result({ heartsLeft: 2 }) });
    expect(RunState.run?.night).toBe(2);
    expect(RunState.run?.hearts).toBe(2);
    bus.emit('game:over', { result: result({ outcome: 'over', reason: 'hearts', heartsLeft: 0, score: 200 }) });
    expect(seen).toEqual(['morning:1->2', 'end:over:2:1:true']);
    expect(Progress.data.bestNight).toBe(1);
    expect(Progress.data.bestScore).toBe(1200);
    // 테스트 판(밤 n 체험)은 런 흐름을 타지 않는다
    RunState.test = true;
    RunState.run = newRunData(3, 'lumi', 3);
    bus.emit('game:clear', { result: result({}) });
    expect(RunState.run?.night).toBe(1);
    expect(outcomeOf(result({ banish: 2 })).banish).toBe(2);
    offs.forEach((off) => off());
    RunState.test = false;
    RunState.run = null;
    RunState.stageId = 'tutorial';
    Progress.reset();
  });
});
