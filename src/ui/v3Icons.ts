// UI 아이콘 v3 (2026-11-24 ChatGPT `reference/UI_Icons_v3/` → `public/ui-icons/`, 기획 지시서 order-passive-nowol-icons-26-1124 2-3절)
//  - 128×128 투명, 선 벌(#F6F1E7) / 채움 벌(-on: 호박 채움 + 남색 선). 둥근 배지(남색 유리 원)는 게임이 그린다
//  - 쓰는 벌: HUD ✦·★ = 선 · 아침 요약·상점 = 산 것/켜진 것만 -on · 두 길 점 = 선만(keep = 자비 길, expand = 돌려보냄 길 — -on 길 아이콘은 쓰지 않음)
//  - public/assets는 npm run assets가 지우고 다시 쓰므로 따로 public/ui-icons/에 둔다
import { h } from './dom';

export type V3IconName =
  | 'stardust'
  | 'level'
  | 'prep-lamp-oil'
  | 'prep-spare-heart'
  | 'prep-big-pouch'
  | 'prep-extra-charm'
  | 'path-keep'
  | 'path-expand';

export const v3IconUrl = (name: V3IconName, on = false): string => `ui-icons/icon-${name}${on ? '-on' : ''}.png`;

export function v3Icon(name: V3IconName, on = false, cls = ''): HTMLImageElement {
  return h('img', { class: `v3-icon${cls ? ` ${cls}` : ''}`, src: v3IconUrl(name, on), alt: '', 'aria-hidden': 'true', width: 128, height: 128, draggable: 'false' });
}

/** 준비물 id(lamp_oil) → 아이콘 이름(prep-lamp-oil) */
export const prepIconName = (id: string): V3IconName => `prep-${id.replace(/_/g, '-')}` as V3IconName;

/** 두 길 점: 지키는 길 = path-keep, 넓히는 길 = path-expand, 중립 = 없음 */
export const pathIconName = (path: string): V3IconName | null => (path === 'keep' ? 'path-keep' : path === 'expand' ? 'path-expand' : null);

/** 아이콘 + 글 (예: ✦ 자리에 별가루 아이콘) */
export function withIcon(el: HTMLElement, name: V3IconName | null, text: string, on = false): void {
  el.replaceChildren(...(name ? [v3Icon(name, on)] : []), text);
}
