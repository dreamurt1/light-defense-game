import { describe, expect, it } from 'vitest';
import { REST, motionPose } from '../src/systems/keeperMotion';

describe('루미 동작 효과 (공격·피격·부활)', () => {
  it('공격·피격은 처음과 끝이 기본 모습이라 튀지 않는다', () => {
    for (const kind of ['attack', 'hit'] as const) {
      for (const p of [0, 1]) {
        const pose = motionPose(kind, p, 0.7);
        expect(pose.dx).toBeCloseTo(REST.dx);
        expect(pose.dy).toBeCloseTo(REST.dy);
        expect(pose.sx).toBeCloseTo(1);
        expect(pose.sy).toBeCloseTo(1);
        expect(pose.rot).toBeCloseTo(0);
      }
    }
  });

  it('공격은 먼저 조준 반대쪽으로 웅크렸다가 조준 쪽으로 내민다', () => {
    const back = motionPose('attack', 0.25, 0);
    expect(back.dx).toBeLessThan(0);
    expect(back.sy).toBeLessThan(1);
    const lunge = motionPose('attack', 0.6, 0);
    expect(lunge.dx).toBeGreaterThan(8);
    expect(lunge.sy).toBeGreaterThan(1);
    // 아래를 겨누면 아래로 (2.5D라 세로는 줄여서)
    expect(motionPose('attack', 0.6, Math.PI / 2).dy).toBeGreaterThan(0);
  });

  it('피격은 움찔하며 흔들린다', () => {
    const p = motionPose('hit', 0.15);
    expect(p.sx).toBeGreaterThan(1);
    expect(p.sy).toBeLessThan(1);
  });

  it('피격은 밀려나는 쪽으로 확 젖혀진다 (2026-11-14: 잘 보이게)', () => {
    const right = motionPose('hit', 0.16, 0);
    expect(right.dx).toBeGreaterThan(8);
    expect(right.sy).toBeLessThan(0.85);
    expect(Math.abs(right.rot)).toBeGreaterThan(0.1);
    expect(motionPose('hit', 0.16, Math.PI).dx).toBeLessThan(-8);
  });

  it('부활은 투명하게 가늘고 길게 시작해 제 모습으로 끝난다', () => {
    const first = motionPose('respawn', 0);
    expect(first.alpha).toBe(0);
    expect(first.sy).toBeGreaterThan(first.sx);
    expect(motionPose('respawn', 1)).toEqual(REST);
  });
});
