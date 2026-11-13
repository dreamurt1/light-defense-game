// 걷는 생명체의 모습 방향 (2026-11-13): 이동 방향 → 옆(좌우는 뒤집기)·앞(화면 아래로)·뒤(화면 위로).
// 경계 근처에서 모습이 번갈아 깜빡이지 않게 지금 모습을 조금 더 유지한다(hysteresis).
import type { Vec } from './fan';

export type CritterView = 'side' | 'front' | 'back';

/** 위아래 성분이 옆 성분보다 이만큼 커야 앞·뒤로 바꾼다 (되돌아올 때는 1/이만큼) */
const SWITCH = 1.25;

export function critterView(dir: Vec, current: CritterView): CritterView {
  const ax = Math.abs(dir.x);
  const ay = Math.abs(dir.y);
  if (ax < 1e-6 && ay < 1e-6) return current;
  const k = current === 'side' ? SWITCH : 1 / SWITCH;
  if (ay > ax * k) return dir.y > 0 ? 'front' : 'back';
  return 'side';
}
