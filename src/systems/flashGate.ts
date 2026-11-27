// 맞음 번쩍임 문턱 (2026-11-27 — 기기별 점검 중 발견): 밤 10에서 중앙 광원이 1초에 4~6번, 등불이 6번 번쩍였다(CLAUDE.md 5절 "깜빡임 초당 3회 이하" 넘음).
// 번쩍임(색 칠하기)은 이 간격보다 자주 하지 않는다 — 흔들림·게이지는 맞을 때마다 그대로.

/** 번쩍임 사이 최소 간격 (ms) — 초당 3번 이하 */
export const FLASH_MIN_GAP_MS = 340;

/** 지금 번쩍여도 되는가 (last = 마지막 번쩍임 시각, 없으면 -Infinity) */
export function canFlash(nowMs: number, lastMs: number, gapMs = FLASH_MIN_GAP_MS): boolean {
  return nowMs - lastMs >= gapMs;
}

/** 1초 창 안 번쩍임 수의 최댓값 (점검용) */
export function maxPerSecond(times: readonly number[]): number {
  let max = 0;
  for (const t of times) max = Math.max(max, times.filter((x) => x > t - 1000 && x <= t).length);
  return max;
}
