// 밤의 기억 앨범 (2026-11-27 16:33 라이언 확정, docs/plan/order-memory-album-26-1127.md) — 순수 규칙.
//  - 이야기 카드 6장: 이야기를 한 번 보면(끝까지 또는 건너뛰기) 열림 — Progress.storySeen. 옛 저장(값 없음)은 밤 1을 넘겼거나 튜토리얼을 마쳤으면 본 것으로
//  - 하이라이트 컷 4장: Progress.seenCuts에 그 id가 있으면 열림
//  - 테스트 판·튜토리얼은 Progress에 남기지 않으므로 여기로 열리지 않는다

export interface AlbumEntry {
  id: string;
  title: string;
  /** 이야기 카드 종류 (ui/Story.ts) */
  story?: string;
  /** 하이라이트 컷 id (cuts.json) */
  cut?: string;
  hint: string;
}

export interface AlbumProgress {
  storySeen?: boolean;
  bestNight: number;
  tutorialDone?: boolean;
  seenCuts: readonly string[];
}

/** 이야기를 본 적이 있는가 (옛 저장 대비) */
export function storySeen(p: AlbumProgress): boolean {
  if (p.storySeen !== undefined) return p.storySeen;
  return p.bestNight >= 1 || !!p.tutorialDone;
}

export function unlocked(e: AlbumEntry, p: AlbumProgress): boolean {
  if (e.cut) return p.seenCuts.includes(e.cut);
  return storySeen(p);
}

/** 열린 칸 수 / 전체 */
export function albumCount(entries: readonly AlbumEntry[], p: AlbumProgress): { open: number; total: number } {
  return { open: entries.filter((e) => unlocked(e, p)).length, total: entries.length };
}
