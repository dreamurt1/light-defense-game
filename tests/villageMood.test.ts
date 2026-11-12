import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';
import { brightenAt, gloomAt } from '../src/systems/villageMood';

const cfg = GameData.game.village;

describe('마을 분위기', () => {
  it('밤이 흐를수록 밝아지고, 밝아지는 속도가 점점 빨라진다', () => {
    const a = brightenAt(0.25, cfg) - brightenAt(0, cfg);
    const b = brightenAt(0.5, cfg) - brightenAt(0.25, cfg);
    const c = brightenAt(1, cfg) - brightenAt(0.75, cfg);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
    expect(brightenAt(1, cfg)).toBeCloseTo(cfg.brightenMax);
  });

  it('맞을수록 어두워지고, 같은 피해라도 밤이 깊을수록 더 깊다', () => {
    expect(gloomAt(1, 0.5, cfg)).toBe(0);
    expect(gloomAt(0.5, 0.2, cfg)).toBeGreaterThan(0);
    expect(gloomAt(0.5, 0.9, cfg)).toBeGreaterThan(gloomAt(0.5, 0.2, cfg));
  });

  it('회복하면 그만큼 다시 밝아진다 (HP에 묶임)', () => {
    const hurt = gloomAt(0.4, 0.6, cfg);
    const healed = gloomAt(0.6, 0.6, cfg);
    expect(hurt - healed).toBeCloseTo(0.2 * (cfg.gloomBase + cfg.gloomGrowth * 0.6));
  });
});
