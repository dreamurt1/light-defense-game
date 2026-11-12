import { describe, expect, it } from 'vitest';
import { GameData, enemyById } from '../src/data';
import { ScoreCalculator, multiplierFor, returnPoints } from '../src/systems/ScoreCalculator';

const combo = GameData.game.combo;
const score = GameData.game.score;

describe('multiplierFor', () => {
  it('콤보 5마다 0.5씩, 최대 4.0', () => {
    expect(multiplierFor(0, combo)).toBe(1);
    expect(multiplierFor(4, combo)).toBe(1);
    expect(multiplierFor(5, combo)).toBe(1.5);
    expect(multiplierFor(10, combo)).toBe(2);
    expect(multiplierFor(29, combo)).toBe(3.5);
    expect(multiplierFor(30, combo)).toBe(4);
    expect(multiplierFor(99, combo)).toBe(4);
  });
});

describe('ScoreCalculator (2026-11-12 새 기획)', () => {
  it('처리 점수 = 몹 점수 × 배율', () => {
    expect(returnPoints(100, 1, combo)).toBe(100);
    expect(returnPoints(100, 5, combo)).toBe(150);
    expect(returnPoints(100, 30, combo)).toBe(400);
  });

  it('점수 순서: 등불 < 호스틸 < 잃어버린 주민 < 자비, 보스 최고', () => {
    const hostile = enemyById('bat').score;
    const lost = enemyById('frog').score;
    expect(score.station).toBeLessThan(hostile);
    expect(hostile).toBeLessThan(lost);
    expect(score.mercy).toBeGreaterThan(hostile);
    expect(enemyById('witch').score).toBeGreaterThan(score.mercy);
  });

  it('콤보 유지 중에는 등불·자비 점수에도 배율', () => {
    const s = new ScoreCalculator(combo, score);
    expect(s.addStation(0)).toBe(score.station);
    expect(s.addStation(10)).toBe(score.station * 2);
    expect(s.addMercy(5)).toBe(score.mercy * 1.5);
  });

  it('클리어 보너스, 완전 승리는 총점 × 배율', () => {
    const s = new ScoreCalculator(combo, score);
    s.addReturn(100, 1);
    s.addClear();
    const before = s.total;
    const gained = s.applyComplete();
    expect(before).toBe(100 + score.clearBase);
    expect(s.total).toBe(Math.round(before * score.completeMultiplier));
    expect(gained).toBe(s.total - before);
  });
});
