import { describe, expect, it } from 'vitest';
import { EventBus, type GameEvents } from '../src/core/events';
import { GameData, nightConfig } from '../src/data';
import { NightClock, phaseAt } from '../src/systems/NightClock';

// 2026-11-12 새 기획: 스테이지 약 100초(끝 = 아침), 70%부터 클라이맥스(predawn)
const stage = GameData.stages[0];
const night = nightConfig(stage);
const d = stage.durationSec;

describe('phaseAt', () => {
  it('스테이지 길이를 시간대 비율로 나누고 끝은 아침', () => {
    expect(d).toBe(100);
    expect(phaseAt(0, night)).toBe('dusk');
    expect(phaseAt(d * 0.4 - 0.1, night)).toBe('dusk');
    expect(phaseAt(d * 0.4, night)).toBe('midnight');
    expect(phaseAt(d * GameData.game.stage.climaxAt - 0.1, night)).toBe('midnight');
    expect(phaseAt(d * GameData.game.stage.climaxAt, night)).toBe('predawn');
    expect(phaseAt(d, night)).toBe('dawn');
  });
});

describe('NightClock', () => {
  it('시간대를 순서대로 한 번씩 알리고 아침에 멈춘다', () => {
    const bus = new EventBus<GameEvents>();
    const phases: string[] = [];
    bus.on('night:phase', (e) => phases.push(e.phase));
    const clock = new NightClock(night, bus);
    clock.start();
    for (let i = 0; i < (d + 10) * 60; i++) clock.update(1 / 60);
    expect(phases).toEqual(['dusk', 'midnight', 'predawn', 'dawn']);
    expect(clock.t).toBe(d);
    expect(clock.isDawn).toBe(true);
    expect(clock.progress).toBe(1);
  });

  it('70%부터 클라이맥스', () => {
    const clock = new NightClock(night);
    clock.start();
    clock.update(d * 0.69);
    expect(clock.climax).toBe(false);
    clock.update(d * 0.02);
    expect(clock.climax).toBe(true);
  });

  it('HUD는 매 프레임이 아니라 초당 몇 번만', () => {
    const bus = new EventBus<GameEvents>();
    let ticks = 0;
    bus.on('night:tick', () => ticks++);
    const clock = new NightClock(night, bus);
    clock.start();
    for (let i = 0; i < 60; i++) clock.update(1 / 60);
    expect(ticks).toBeGreaterThanOrEqual(4);
    expect(ticks).toBeLessThanOrEqual(6);
  });
});
