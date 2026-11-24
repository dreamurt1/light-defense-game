import { describe, expect, it } from 'vitest';
import { BANISH_TOAST, PATH_NOW } from '../src/ui/runText';

// 2026-11-24 구조 보강 ② (라이언 확정): 두 길이 보이게 — 아침 '지금 길' 한 줄 · 돌려보냄 토스트
describe('두 길 표시', () => {
  it('아침 하트·★ 줄 아래 지금 길 — 길마다 한 줄', () => {
    expect(PATH_NOW).toEqual({
      keep: '지금 길: 지키는 길 — 조용한 밤',
      expand: '지금 길: 넓히는 길 — 어둠이 거세져요',
      mixed: '지금 길: 사이 — 아직 정하지 않았어요',
    });
  });
  it('행렬 패시브 돌려보냄 토스트 — 자비 쪽 "길을 터 줬어요"의 짝, 금지어 없음', () => {
    expect(BANISH_TOAST).toBe('돌려보냈어요 · 빛이 멀리 뻗어요');
    for (const t of [BANISH_TOAST, ...Object.values(PATH_NOW)]) expect(t).not.toMatch(/죽|처치|킬|실패/);
  });
});
