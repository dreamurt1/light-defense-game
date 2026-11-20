import { describe, expect, it } from 'vitest';
import { shadeAlpha, shadeColor } from '../src/art/lockedShade';

describe('잠긴 친구 실루엣 (2026-11-20)', () => {
  it('컨셉 그림 가장자리의 옅은 번짐은 버리고 몸은 꽉 채운다', () => {
    expect(shadeAlpha(0)).toBe(0);
    expect(shadeAlpha(24)).toBe(0);
    expect(shadeAlpha(180)).toBe(255);
    expect(shadeAlpha(255)).toBe(255);
    const mid = shadeAlpha(102);
    expect(mid).toBeGreaterThan(100);
    expect(mid).toBeLessThan(155);
  });

  it('면색은 짙은 남색, 위가 아래보다 조금 밝고 70%부터 같다', () => {
    const top = shadeColor(0);
    const low = shadeColor(0.7);
    expect(top).toEqual([0x1c, 0x1a, 0x3a]);
    expect(low).toEqual([0x0e, 0x0d, 0x20]);
    expect(shadeColor(1)).toEqual(low);
    // 짙은 면: 어느 채널도 64를 넘지 않는다
    for (const t of [0, 0.3, 0.7, 1]) expect(Math.max(...shadeColor(t))).toBeLessThan(64);
  });
});
