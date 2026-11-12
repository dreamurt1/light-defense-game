import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';
import { MapLight, brightenAt } from '../src/systems/villageMood';

const cfg = GameData.game.village;

describe('맵 전체 광도 (2026-11-12 새 기획)', () => {
  it('스테이지가 흐를수록 밝아지고, 밝아지는 속도가 점점 빨라진다', () => {
    const a = brightenAt(0.25, cfg) - brightenAt(0, cfg);
    const b = brightenAt(0.5, cfg) - brightenAt(0.25, cfg);
    const c = brightenAt(1, cfg) - brightenAt(0.75, cfg);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
    expect(brightenAt(0, cfg)).toBe(0);
    expect(brightenAt(1, cfg)).toBeCloseTo(cfg.brightenMax);
  });

  it('모든 등불이 켜지면 더 밝아진다 (전체 활성 버프)', () => {
    expect(brightenAt(0.6, cfg, true)).toBeGreaterThan(brightenAt(0.6, cfg, false));
  });

  it('중앙 광원 피격은 크게, 주인공 피격은 조금 떨어뜨린다', () => {
    const central = new MapLight(cfg);
    const player = new MapLight(cfg);
    central.update(0, 0.8, false);
    player.update(0, 0.8, false);
    central.hit('central', false);
    player.hit('player', false);
    expect(central.lit).toBeLessThan(player.lit);
  });

  it('클라이맥스에는 떨어지는 폭이 커진다', () => {
    const calm = new MapLight(cfg);
    const climax = new MapLight(cfg);
    calm.hit('central', false);
    climax.hit('central', true);
    expect(climax.dip).toBeGreaterThan(calm.dip);
  });

  it('떨어진 광도는 시간이 지나면 회복된다', () => {
    const m = new MapLight(cfg);
    m.hit('central', false);
    const dip = m.dip;
    m.update(1, 0.5, false);
    expect(m.dip).toBeCloseTo(dip - cfg.dipRecoverPerSec);
  });

  it('밝아짐보다 크게 떨어지면 어둠이 덮인다', () => {
    const m = new MapLight(cfg);
    m.update(0, 0.1, false);
    expect(m.gloom).toBe(0);
    m.hit('central', false);
    expect(m.gloom).toBeGreaterThan(0);
  });
});
