// 홈 상점 꾸미기 판정 (2026-11-24 15:58 기획 세션, 라이언 확정) — 순수 로직
//  - 빛 색·빛 모양·걸음 빛 세 종류. 가진 것은 Progress의 같은 목록(cosmetics)에, 빛 색은 id 그대로(예전과 같음),
//    빛 모양·걸음 빛은 종류를 앞에 붙여 둔다(shape:moon · trail:firefly) — 빛 색 id(star·moon)와 겹치지 않게.
//  - 빛 모양 달·씨앗은 그 친구를 되찾은 뒤에 열린다(requires). 열리기 전 칸 문구 = "토리와 함께한 뒤"·"도토와 함께한 뒤".
import type { CharacterId, TrailDef } from '../data';

export type DecorKind = 'lightShape' | 'trail';

/** Progress 목록에 넣는 id */
export function ownedId(kind: DecorKind, id: string): string {
  return `${kind === 'lightShape' ? 'shape' : 'trail'}:${id}`;
}

const FRIEND_NAME: Record<CharacterId, string> = { lumi: '루미', tori: '토리', doto: '도토' };

/** 잠긴 칸 문구 */
export function lockLine(friend: CharacterId): string {
  return `${FRIEND_NAME[friend]}와 함께한 뒤`;
}

export interface DecorView {
  /** equipped = 쓰는 중 · owned = 고르기 · buy = 사기 ✦n · short = 별가루가 부족해요 · locked = 친구를 되찾기 전 */
  state: 'equipped' | 'owned' | 'buy' | 'short' | 'locked';
  /** 칸 아래 글자 (buy는 화면이 '사기 ✦n'을 아이콘과 함께 그림) */
  tag: string;
}

export interface DecorCtx {
  owns: (ownedId: string, price: number) => boolean;
  friendOpen: (id: CharacterId) => boolean;
  /** 고른 id (Settings) — 갖고 있지 않으면 첫 칸(기본)이 쓰는 중 */
  selected: string;
  /** 방금 별가루가 모자랐던 칸 */
  shortId: string | null;
}

/** 한 칸의 상태 */
export function decorView(kind: DecorKind, item: { id: string; price: number; requires?: CharacterId }, all: readonly { id: string; price: number }[], ctx: DecorCtx): DecorView {
  const owned = ctx.owns(ownedId(kind, item.id), item.price);
  const chosen = effectiveSelection(kind, all, ctx);
  if (owned && chosen === item.id) return { state: 'equipped', tag: '쓰는 중' };
  if (owned) return { state: 'owned', tag: '고르기' };
  if (item.requires && !ctx.friendOpen(item.requires)) return { state: 'locked', tag: lockLine(item.requires) };
  if (ctx.shortId === item.id) return { state: 'short', tag: '별가루가 부족해요' };
  return { state: 'buy', tag: `사기 ✦${item.price}` };
}

/** 실제로 쓰는 id: 고른 것을 갖고 있으면 그것, 아니면 기본(값 0인 첫 칸) */
export function effectiveSelection(kind: DecorKind, all: readonly { id: string; price: number }[], ctx: Pick<DecorCtx, 'owns' | 'selected'>): string {
  const pick = all.find((x) => x.id === ctx.selected);
  if (pick && ctx.owns(ownedId(kind, pick.id), pick.price)) return pick.id;
  return all.find((x) => x.price <= 0)?.id ?? all[0]?.id ?? '';
}

/** 걸음 빛 색 (0xRRGGBB), 없음이면 null */
export function trailColor(trail: TrailDef | undefined): number | null {
  return trail?.color ? parseInt(trail.color.slice(1), 16) : null;
}
