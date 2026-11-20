import { describe, expect, it } from 'vitest';
import { limitReached } from '../src/core/frameLimit';

/** 화면 주기(ms)로 rAF가 오는 동안 '초당 60번 제한'이 실제로 몇 번 돌리는지와 간격 */
function run(vsyncMs: number, seconds = 2, jitter = 0.15): { perSec: number; gaps: Set<number> } {
  const limitRate = 1000 / 60;
  let acc = 0;
  let steps = 0;
  let since = 0;
  const gaps = new Set<number>();
  const n = Math.round((seconds * 1000) / vsyncMs);
  for (let i = 0; i < n; i++) {
    // rAF 시각은 화면 주기에 맞춰 오되 아주 조금 흔들린다
    const d = vsyncMs + (i % 2 ? jitter : -jitter);
    acc += d;
    since++;
    if (limitReached(acc, limitRate)) {
      steps++;
      gaps.add(since);
      acc = 0;
      since = 0;
    }
  }
  return { perSec: steps / seconds, gaps };
}

describe('초당 60번 제한 (2026-11-20 휴대폰 120Hz 버벅임)', () => {
  it('120Hz 화면: 두 번마다 한 번 = 초당 60, 간격이 고르다', () => {
    const r = run(1000 / 120);
    expect(r.perSec).toBeGreaterThan(59);
    expect([...r.gaps]).toEqual([2]);
  });

  it('60Hz 화면: 매번', () => {
    const r = run(1000 / 60);
    expect(r.perSec).toBeGreaterThan(59);
    expect([...r.gaps]).toEqual([1]);
  });

  it('144Hz는 두 번마다(72), 90Hz는 매번(90) — 세 번을 기다리는 일이 없다', () => {
    expect([...run(1000 / 144).gaps]).toEqual([2]);
    expect([...run(1000 / 90).gaps]).toEqual([1]);
  });
});
