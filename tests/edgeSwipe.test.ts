import { describe, expect, it } from 'vitest';
import { EDGE, TRIGGER, edgeOf, edgeSwipeStep } from '../src/ui/EdgeSwipe';

// 2026-11-24 라이언: 손을 좌우로 당겼을 때 뒤로가기(플레이 중이면 일시정지)
describe('가장자리에서 당겨 뒤로가기', () => {
  it('가장자리 24px 안에서 시작할 때만', () => {
    expect(EDGE).toBe(24);
    expect(edgeOf(10, 1280)).toBe('left');
    expect(edgeOf(1270, 1280)).toBe('right');
    expect(edgeOf(200, 1280)).toBeNull();
  });
  it('안쪽으로 72px 넘게 가로로 당기면 넘음', () => {
    expect(TRIGGER).toBe(72);
    expect(edgeSwipeStep('left', 80, 10)).toEqual({ pull: 80, cancel: false, armed: true });
    expect(edgeSwipeStep('right', -90, -5).armed).toBe(true);
    expect(edgeSwipeStep('left', 50, 0).armed).toBe(false);
  });
  it('바깥으로·세로로 더 많이 움직이면 아님', () => {
    expect(edgeSwipeStep('left', -30, 0)).toEqual({ pull: 0, cancel: false, armed: false });
    expect(edgeSwipeStep('left', 30, 80).cancel).toBe(true);
    expect(edgeSwipeStep('right', -40, 120).cancel).toBe(true);
  });
});
