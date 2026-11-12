import { describe, expect, it } from 'vitest';
import { LocalRanking, MAX_ROWS, periodStart } from '../src/services/LocalRanking';
import type { ScoreSubmission } from '../src/services/Ranking';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

function entry(score: number, survivedSec = 60, playerId = 'p1'): ScoreSubmission {
  return {
    playerId,
    nickname: '이름 없는 등불지기',
    score,
    survivedSec,
    characterId: 'lumi',
    stageId: 'stage-1',
    maxCombo: 10,
    seed: 1,
    clientVersion: 'test',
    outcome: 'over',
  };
}

describe('LocalRanking', () => {
  it('ranks by score, then survived time, then earlier entry', async () => {
    let clock = 1_000;
    const r = new LocalRanking(memoryStorage(), () => new Date(clock++));
    await r.submit(entry(500, 60, 'a'));
    await r.submit(entry(900, 30, 'b'));
    await r.submit(entry(500, 90, 'c'));
    await r.submit(entry(500, 90, 'd'));
    const rows = await r.top('all');
    expect(rows.map((x) => x.score)).toEqual([900, 500, 500, 500]);
    expect(rows.map((x) => x.survivedSec)).toEqual([30, 90, 90, 60]);
    expect((await r.me('d', 'all'))?.rank).toBe(3);
  });

  it('returns the rank of the new entry', async () => {
    let clock = 1_000;
    const r = new LocalRanking(memoryStorage(), () => new Date(clock++));
    await r.submit(entry(100));
    expect((await r.submit(entry(300))).rank).toBe(1);
    expect((await r.submit(entry(200))).rank).toBe(2);
  });

  it('keeps at most 100 rows', async () => {
    let clock = 1_000;
    const r = new LocalRanking(memoryStorage(), () => new Date(clock++));
    for (let i = 0; i < MAX_ROWS + 5; i++) await r.submit(entry(i));
    expect((await r.top('all')).length).toBe(MAX_ROWS);
  });

  it('starts the week on Monday 00:00', () => {
    const wed = new Date(2026, 9, 28, 15, 0);
    const monday = new Date(2026, 9, 26, 0, 0).getTime();
    expect(periodStart('week', wed)).toBe(monday);
    expect(periodStart('day', wed)).toBe(new Date(2026, 9, 28).getTime());
  });

  it('survives a broken storage value', async () => {
    const storage = memoryStorage();
    storage.setItem('ld.ranking.v1', '{not json');
    const r = new LocalRanking(storage);
    expect(await r.top('all')).toEqual([]);
  });
});
