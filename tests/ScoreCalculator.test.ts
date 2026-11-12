import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';
import { ScoreCalculator, multiplierFor, returnPoints } from '../src/systems/ScoreCalculator';

const combo = GameData.game.combo;

describe('multiplierFor', () => {
  it('steps by 0.5 every 5 combo and caps at 4.0', () => {
    expect(multiplierFor(0, combo)).toBe(1);
    expect(multiplierFor(4, combo)).toBe(1);
    expect(multiplierFor(5, combo)).toBe(1.5);
    expect(multiplierFor(10, combo)).toBe(2);
    expect(multiplierFor(29, combo)).toBe(3.5);
    expect(multiplierFor(30, combo)).toBe(4);
    expect(multiplierFor(99, combo)).toBe(4);
  });
});

describe('ScoreCalculator', () => {
  it('scores a return as enemy score × multiplier', () => {
    expect(returnPoints(50, 1, combo)).toBe(50);
    expect(returnPoints(50, 5, combo)).toBe(75);
    expect(returnPoints(50, 30, combo)).toBe(200);
  });

  it('adds items, the witch without multiplier, and the clear bonus', () => {
    const s = new ScoreCalculator(combo, GameData.game.score);
    s.addReturn(50, 1);
    s.addItem();
    s.addWitch();
    s.addClear(62);
    expect(s.total).toBe(50 + 10 + 2000 + 1000 + 620);
  });
});
