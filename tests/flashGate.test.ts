import { describe, expect, it } from 'vitest';
import { canFlash, FLASH_MIN_GAP_MS, maxPerSecond } from '../src/systems/flashGate';

// 2026-11-27 맞음 번쩍임 문턱 — CLAUDE.md 5절 "깜빡임 초당 3회 이하"
describe('맞음 번쩍임은 초당 3번까지', () => {
  it('간격이 문턱보다 짧으면 번쩍이지 않음', () => {
    expect(canFlash(0, -Infinity)).toBe(true);
    expect(canFlash(100, 0)).toBe(false);
    expect(canFlash(FLASH_MIN_GAP_MS, 0)).toBe(true);
  });

  it('1초에 10번 맞아도 번쩍임은 3번 이하', () => {
    let last = -Infinity;
    const flashes: number[] = [];
    for (let t = 0; t < 5000; t += 100) {
      if (canFlash(t, last)) {
        last = t;
        flashes.push(t);
      }
    }
    expect(maxPerSecond(flashes)).toBeLessThanOrEqual(3);
    expect(flashes.length).toBeGreaterThan(10);
  });
});
