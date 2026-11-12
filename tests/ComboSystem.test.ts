import { describe, expect, it } from 'vitest';
import { EventBus, type GameEvents } from '../src/core/events';
import { GameData } from '../src/data';
import { ComboSystem } from '../src/systems/ComboSystem';

const cfg = { combo: GameData.game.combo, synergy: GameData.game.synergy };

function setup() {
  const bus = new EventBus<GameEvents>();
  const combos: GameEvents['combo:change'][] = [];
  let bursts = 0;
  bus.on('combo:change', (e) => combos.push(e));
  bus.on('synergy:burst', () => bursts++);
  return { combo: new ComboSystem(cfg, bus), combos, bursts: () => bursts };
}

describe('ComboSystem', () => {
  it('counts returns and tracks the best combo', () => {
    const { combo } = setup();
    for (let i = 0; i < 7; i++) combo.registerReturn();
    expect(combo.combo).toBe(7);
    expect(combo.maxCombo).toBe(7);
    expect(combo.multiplier).toBe(1.5);
  });

  it('halves (floored) when a neighbour first touches the lantern', () => {
    const { combo, combos } = setup();
    for (let i = 0; i < 21; i++) combo.registerReturn();
    combo.registerLanternHit();
    expect(combo.combo).toBe(10);
    expect(combos.at(-1)?.reason).toBe('hit');
    expect(combo.maxCombo).toBe(21);
  });

  it('halves again every window while nothing is returned: 20 → 10 → 5 → 2 → 1 → 0', () => {
    const { combo } = setup();
    for (let i = 0; i < 20; i++) combo.registerReturn();
    const seen: number[] = [];
    for (let step = 0; step < 5; step++) {
      combo.update(cfg.combo.windowSec + 0.001);
      seen.push(combo.combo);
    }
    expect(seen).toEqual([10, 5, 2, 1, 0]);
  });

  it('keeps the combo while returns arrive inside the window', () => {
    const { combo } = setup();
    combo.registerReturn();
    combo.update(cfg.combo.windowSec - 0.1);
    combo.registerReturn();
    combo.update(cfg.combo.windowSec - 0.1);
    expect(combo.combo).toBe(2);
  });

  it('fills synergy faster at high combo and bursts at 100', () => {
    const { combo, bursts } = setup();
    const s = cfg.synergy;
    // 콤보 10 전까지는 gainPerReturn, 10부터 gainPerReturnHighCombo (수치는 game.json)
    let expected = 0;
    let n = 0;
    while (bursts() === 0 && n < 50) {
      n++;
      combo.registerReturn();
      expected += n >= s.highComboThreshold ? s.gainPerReturnHighCombo : s.gainPerReturn;
    }
    expect(expected).toBeGreaterThanOrEqual(s.max);
    expect(expected - (n >= s.highComboThreshold ? s.gainPerReturnHighCombo : s.gainPerReturn)).toBeLessThan(s.max);
    expect(combo.synergy).toBe(0);
  });

  it('drains synergy by decayPerSec', () => {
    const { combo } = setup();
    combo.registerReturn();
    combo.update(1);
    expect(combo.synergy).toBeCloseTo(cfg.synergy.gainPerReturn - cfg.synergy.decayPerSec);
  });
});
