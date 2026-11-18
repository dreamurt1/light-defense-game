// 밤을 지나면 열리는 것 (2026-11-18): 판 시작 전에 챙겨 갈 아이템, 상점의 빛 색 — 순수 로직.
// 재화가 기획에 없어 '그 스테이지를 깨면 열림'으로 했다(제안). unlock = 'start'(처음부터) 또는 스테이지 id.
type Carryable = { id: string; carryUnlock?: unknown };

export function isUnlocked(unlock: string | undefined, cleared: readonly string[], demo = false): boolean {
  if (!unlock) return false;
  return unlock === 'start' || demo || cleared.includes(unlock);
}

/** 챙겨 갈 수 있는 아이템 id (items.json에 carryUnlock이 있는 것, 순서대로) */
export function carryItemIds(items: readonly Carryable[]): string[] {
  return items.filter((i) => typeof i.carryUnlock === 'string').map((i) => i.id);
}

/** 고른 것이 아직 잠겼거나 없는 아이템이면 열린 첫 아이템으로. '' = 안 챙김 */
export function carryOrDefault(chosen: string, items: readonly Carryable[], cleared: readonly string[], demo = false): string {
  if (chosen === '') return '';
  const open = items.filter((i) => typeof i.carryUnlock === 'string' && isUnlocked(i.carryUnlock, cleared, demo)).map((i) => i.id);
  return open.includes(chosen) ? chosen : (open[0] ?? '');
}
