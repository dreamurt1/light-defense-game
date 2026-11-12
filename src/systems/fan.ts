// 부채꼴 판정. Phaser 없이 쓰고 Vitest로 검증한다.

export interface Vec {
  x: number;
  y: number;
}

/** 각도를 (-π, π] 범위로 접는다 */
export function normalizeAngle(a: number): number {
  let r = a % (Math.PI * 2);
  if (r <= -Math.PI) r += Math.PI * 2;
  if (r > Math.PI) r -= Math.PI * 2;
  return r;
}

/**
 * origin에서 angle(라디안) 방향으로 fanDeg 폭, range 반지름인 부채꼴에 점(반지름 pointRadius)이 걸리는가.
 * 악당 반지름만큼 관대하게 본다: 거리는 range + 반지름까지, 각도는 반지름이 차지하는 각만큼 더 넓게.
 */
export function inFan(
  origin: Vec,
  angle: number,
  fanDeg: number,
  range: number,
  point: Vec,
  pointRadius = 0,
): boolean {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range + pointRadius) return false;
  if (dist <= pointRadius) return true;
  const half = (fanDeg * Math.PI) / 360;
  const diff = Math.abs(normalizeAngle(Math.atan2(dy, dx) - angle));
  const slack = Math.asin(Math.min(1, pointRadius / dist));
  return diff <= half + slack;
}

export function angleTo(from: Vec, to: Vec): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}
