// 밤을 지나면 열리는 것 — 순수 로직. 판 시작 전에 챙겨 갈 아이템(items.json carryUnlock).
// 2026-11-23 밤 나들이 v3: 스테이지를 깨면 → 런에서 아침을 맞은 최고 밤 수(Progress.bestNight)가 n 이상이면.
// unlock = 'start'(처음부터) 또는 'night-n'(밤 n을 지나면). 빛 색은 별가루로 산다(cosmetics.json price, Progress.owns).
type Carryable = { id: string; carryUnlock?: unknown };

/** 'night-4' → 4, 'start' → 0, 모르는 값 → null */
export function unlockNight(unlock: string | undefined): number | null {
  if (unlock === 'start') return 0;
  const m = /^night-(\d+)$/.exec(unlock ?? '');
  return m ? Number(m[1]) : null;
}

export function isUnlocked(unlock: string | undefined, bestNight: number, demo = false): boolean {
  const n = unlockNight(unlock);
  if (n === null) return false;
  return demo || bestNight >= n;
}

/** 챙겨 갈 수 있는 아이템 id (items.json에 carryUnlock이 있는 것, 순서대로) */
export function carryItemIds(items: readonly Carryable[]): string[] {
  return items.filter((i) => typeof i.carryUnlock === 'string').map((i) => i.id);
}

/** 고른 것이 아직 잠겼거나 없는 아이템이면 열린 첫 아이템으로. '' = 안 챙김 */
export function carryOrDefault(chosen: string, items: readonly Carryable[], bestNight: number, demo = false): string {
  if (chosen === '') return '';
  const open = items.filter((i) => typeof i.carryUnlock === 'string' && isUnlocked(i.carryUnlock, bestNight, demo)).map((i) => i.id);
  return open.includes(chosen) ? chosen : (open[0] ?? '');
}
