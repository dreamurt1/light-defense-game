// 8방향 바라보기 (순수 로직, 2026-11-04 루미 재구성). 화면 좌표(y가 아래로 커짐)의 각도를 8방향으로 나누고,
// 방향이 툭툭 바뀌지 않게 각도를 부드럽게 따라가게 한다(영문 지시서 'smooth directional transitions').

/** 시계 방향: 오른쪽(0°)부터 45°씩. 화면 아래쪽이 S */
export const DIRS = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'] as const;
export type Dir = (typeof DIRS)[number];

const TAU = Math.PI * 2;

/** 각도(라디안) → 가장 가까운 8방향 */
export function dirOf(angle: number): Dir {
  const i = Math.round(angle / (Math.PI / 4));
  return DIRS[((i % 8) + 8) % 8];
}

/** 방향의 가운데 각도 */
export function angleOfDir(d: Dir): number {
  return DIRS.indexOf(d) * (Math.PI / 4);
}

/** 가장 짧은 쪽으로 돌아 from에서 to로 k(0~1)만큼 다가간 각도 */
export function turnToward(from: number, to: number, k: number): number {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return from + d * Math.min(1, Math.max(0, k));
}

/** dt초 동안 반응 시간 tau로 따라가는 보간 비율 (프레임 속도와 무관) */
export function follow(dt: number, tau: number): number {
  return tau <= 0 ? 1 : 1 - Math.exp(-dt / tau);
}
