import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { GameData } from '../src/data';
import { rulesForNight, type RunInfo } from '../src/systems/nightRules';
import { edgePoint, passedEdge, planParades, PARADE_GAP_SEC, PARADE_LINES, ParadeState } from '../src/systems/parade';

// 2026-11-23 밤 나들이 v3 — 어둠의 행렬 (NIGHT_RUN.md 5-1절)
const passives = GameData.enemies.filter((e) => e.kind === 'passive');
const cfg = { hitsToBanish: 3, cowerSec: 0.6, fleeSec: 2, fleeMultiplier: 1.5 };
const run: RunInfo = { seed: 9, keeperId: 'lumi', friendNights: {}, witchSeen: false, lastMapId: null, mercy: 0, banish: 0 };

describe('행렬 데이터', () => {
  it('패시브 셋은 행렬, 세 번이면 돌려보냄, 웅크림 0.6초·도망 2초 ×1.5', () => {
    expect(passives.map((p) => p.id).sort()).toEqual(['firefly', 'moth', 'owl']);
    for (const p of passives) {
      expect(p.behavior).toBe('parade');
      expect([p.hitsToBanish, p.cowerSec, p.fleeSec, p.fleeMultiplier]).toEqual([3, 0.6, 2, 1.5]);
    }
  });
  it('반격 없음: 패시브는 피해 0 (루미에게도 광원에도)', () => {
    for (const p of passives) expect([p.damage, p.sourceDamage]).toEqual([0, 0]);
  });
  it('돌려보냄 = 어둠 점수 150, 옛 분노 수치는 없다', () => {
    expect(GameData.game.score.banishPassive).toBe(150);
    expect(Object.keys(GameData.game.passive)).not.toContain('angryDamage');
  });
});

describe('ParadeState — 걷기 → 웅크림 → 도망 → 걷기, 세 번이면 돌려보냄', () => {
  it('맞으면 제자리 웅크림(속도 0) 0.6초 → 도망(×1.5) 2초 → 걷기', () => {
    const s = new ParadeState(cfg);
    expect([s.mode, s.speedMultiplier]).toEqual(['walk', 1]);
    expect(s.hit()).toBe('cower');
    expect([s.mode, s.speedMultiplier]).toEqual(['cower', 0]);
    expect(s.update(0.5)).toBe('cower');
    expect(s.update(0.11)).toBe('flee');
    expect(s.speedMultiplier).toBe(1.5);
    expect(s.update(1.9)).toBe('flee');
    expect(s.update(0.11)).toBe('walk');
  });
  it('말풍선은 1·2·3번째마다 다르고, 세 번째면 돌려보냄', () => {
    const s = new ParadeState(cfg);
    s.hit();
    expect(s.line).toBe('싸우기 싫어..');
    s.hit();
    expect(s.line).toBe('우린 지나가는 거야');
    expect(s.hit()).toBe('banished');
    expect(s.line).toBe('제발..');
    expect(PARADE_LINES).toHaveLength(3);
  });
  it('웅크리는 동안 또 맞아도 웅크림을 처음부터', () => {
    const s = new ParadeState(cfg);
    s.hit();
    s.update(0.5);
    s.hit();
    expect(s.update(0.5)).toBe('cower');
  });
});

describe('행렬 계획 (nights.json parade)', () => {
  const plan = (n: number, seed = 3) => planParades(rulesForNight(n, run).parade, 100, new Rng(seed));
  it('밤 1엔 없고, 밤 2는 한 묶음 두 마리, 밤 4는 두 묶음 세 마리, 밤 9는 세 묶음', () => {
    expect(plan(1)).toEqual([]);
    expect(plan(2).map((g) => [g.atSec, g.size])).toEqual([[28, 2]]);
    expect(plan(4).map((g) => [g.atSec, g.size])).toEqual([[28, 3], [56, 3]]);
    expect(plan(9).map((g) => g.atSec)).toEqual([28, 56, 84]);
  });
  it('한 묶음은 한 종류, 맞은편 변으로', () => {
    const opposite = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' } as const;
    for (let seed = 1; seed < 30; seed++) {
      for (const g of plan(9, seed)) {
        expect(['owl', 'moth', 'firefly']).toContain(g.kind);
        expect(g.to).toBe(opposite[g.from]);
      }
    }
  });
  it('밤이 끝나기 전에 다 나오는 묶음만 (100초 밤의 95% 안)', () => {
    const late = planParades({ groups: 5, size: 3, everySec: 30, kinds: ['owl'] }, 100, new Rng(1));
    expect(late.map((g) => g.atSec)).toEqual([30, 60, 90].filter((t) => t + 3 * PARADE_GAP_SEC < 95));
  });
});

describe('들어오고 나가는 변', () => {
  const area = { x: 100, y: 250, w: 3000, h: 1440 };
  it('변 밖의 점', () => {
    expect(edgePoint('left', 0.5, area)).toEqual({ x: 20, y: 970 });
    expect(edgePoint('bottom', 0.25, area)).toEqual({ x: 850, y: 1770 });
  });
  it('맞은편 변을 지나면 지나감', () => {
    expect(passedEdge({ x: 3200, y: 900 }, 'right', area)).toBe(true);
    expect(passedEdge({ x: 3000, y: 900 }, 'right', area)).toBe(false);
    expect(passedEdge({ x: 500, y: 150 }, 'top', area)).toBe(true);
  });
});
