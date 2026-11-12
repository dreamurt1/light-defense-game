import { describe, expect, it } from 'vitest';
import { EventBus, type GameEvents } from '../src/core/events';
import { GameData } from '../src/data';
import { ComboSystem } from '../src/systems/ComboSystem';

const cfg = GameData.game.combo;

function setup(over: Partial<typeof cfg> = {}) {
  const bus = new EventBus<GameEvents>();
  const combos: GameEvents['combo:change'][] = [];
  bus.on('combo:change', (e) => combos.push(e));
  return { combo: new ComboSystem({ ...cfg, ...over }, bus), combos };
}

describe('ComboSystem (2026-11-12 새 기획: 시너지 없음)', () => {
  it('처리할 때마다 쌓이고 최대 콤보를 기억한다', () => {
    const { combo } = setup();
    for (let i = 0; i < 7; i++) combo.registerReturn();
    expect(combo.combo).toBe(7);
    expect(combo.maxCombo).toBe(7);
    expect(combo.multiplier).toBe(1.5);
  });

  it('유지 시간 안에 이어지면 그대로', () => {
    const { combo } = setup();
    combo.registerReturn();
    combo.update(cfg.windowSec - 0.1);
    combo.registerReturn();
    combo.update(cfg.windowSec - 0.1);
    expect(combo.combo).toBe(2);
  });

  it('유지 시간이 지나면 끝난다 (lossMode reset)', () => {
    const { combo, combos } = setup({ lossMode: 'reset' });
    for (let i = 0; i < 12; i++) combo.registerReturn();
    combo.update(cfg.windowSec + 0.001);
    expect(combo.combo).toBe(0);
    expect(combos.at(-1)?.reason).toBe('timeout');
    expect(combo.maxCombo).toBe(12);
  });

  it('lossMode half면 유지 시간마다 절반: 20 → 10 → 5 → 2 → 1 → 0', () => {
    const { combo } = setup({ lossMode: 'half' });
    for (let i = 0; i < 20; i++) combo.registerReturn();
    const seen: number[] = [];
    for (let step = 0; step < 5; step++) {
      combo.update(cfg.windowSec + 0.001);
      seen.push(combo.combo);
    }
    expect(seen).toEqual([10, 5, 2, 1, 0]);
  });
});
