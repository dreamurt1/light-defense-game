import { describe, expect, it } from 'vitest';
import { LITE_FPS, LOW_FPS, LOW_SECONDS, nextLow } from '../src/core/perfGuard';

// 2026-11-24 라이언(삼성 태블릿 렉): 판 중 3초 연속 초당 50 아래면 가벼운 모드(초당 30)
describe('가벼운 모드 판정', () => {
  it('값: 50 아래 3초 → 초당 30', () => {
    expect([LOW_FPS, LOW_SECONDS, LITE_FPS]).toEqual([50, 3, 30]);
  });
  it('3초 연속 낮아야 바꿈 — 한 번 회복하면 처음부터', () => {
    let s = 0;
    const seq = [42, 44, 58, 40, 41, 39];
    const go: boolean[] = [];
    for (const f of seq) {
      const r = nextLow(s, f, true);
      s = r.streak;
      go.push(r.goLite);
    }
    expect(go).toEqual([false, false, false, false, false, true]);
  });
  it('판이 아니거나 화면이 가려졌으면 재지 않음(연속 0)', () => {
    expect(nextLow(2, 10, false)).toEqual({ streak: 0, goLite: false });
  });
  it('잘 도는 기기(60)는 그대로', () => {
    let s = 0;
    for (let i = 0; i < 30; i++) {
      const r = nextLow(s, 60, true);
      s = r.streak;
      expect(r.goLite).toBe(false);
    }
  });
});
