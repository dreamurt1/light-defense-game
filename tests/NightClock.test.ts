import { describe, expect, it } from 'vitest';
import { EventBus, type GameEvents } from '../src/core/events';
import { GameData } from '../src/data';
import { NightClock, phaseAt } from '../src/systems/NightClock';

const night = GameData.game.night;

describe('phaseAt', () => {
  it('maps the 120 second night onto three phases and dawn', () => {
    expect(phaseAt(0, night)).toBe('dusk');
    expect(phaseAt(39.9, night)).toBe('dusk');
    expect(phaseAt(40, night)).toBe('midnight');
    expect(phaseAt(89.9, night)).toBe('midnight');
    expect(phaseAt(90, night)).toBe('predawn');
    expect(phaseAt(120, night)).toBe('dawn');
  });
});

describe('NightClock', () => {
  it('announces each phase once, in order, and stops at dawn', () => {
    const bus = new EventBus<GameEvents>();
    const phases: string[] = [];
    bus.on('night:phase', (e) => phases.push(e.phase));
    const clock = new NightClock(night, bus);
    clock.start();
    for (let i = 0; i < 130 * 60; i++) clock.update(1 / 60);
    expect(phases).toEqual(['dusk', 'midnight', 'predawn', 'dawn']);
    expect(clock.t).toBe(night.durationSec);
    expect(clock.isDawn).toBe(true);
  });

  it('ticks the HUD a few times per second, not every frame', () => {
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
