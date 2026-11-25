// 가장자리에서 당겨 뒤로가기 (2026-11-24 라이언: "손을 좌우로 당겼을 때 뒤로가기, 플레이 중이면 일시정지").
//  - 화면 왼쪽·오른쪽 가장자리(EDGE) 안에서 시작해 안쪽으로 TRIGGER 넘게 가로로 당겼다 놓으면 뒤로가기.
//    당기는 동안 가장자리에 둥근 뒤로 배지가 손가락 높이에서 따라 나오고(당겨서 새로고침 배지와 같은 결 — 남색 유리 원 + 굵은 둥근 ‹),
//    충분히 당기면 호박빛으로 채워진다. 놓으면 부드럽게 제자리로 들어간다.
//  - 무엇을 할지는 받는 쪽(onBack)이 정한다 — HistoryNav: 메뉴는 기존 뒤로가기, 판 중엔 일시정지.
//  - 스틱 원·입력칸·슬라이더에서 시작한 손가락, 세로로 더 많이 움직인 손가락은 제외. 마우스 제외(터치·펜만).
//    휴대폰 시스템 제스처가 가로채면 pointercancel로 끝나 두 번 뒤로가지 않는다. PC 조작(DesktopControls)은 터치를 무시하므로 판 중 빛이 나가지 않는다.
//  - 판정은 순수 함수(edgeOf·edgeSwipeStep) — tests/edgeSwipe.test.ts. 움직임은 transform·opacity만(레이아웃 없음).
import { h, svg } from './dom';

/** 가장자리 폭(px) · 뒤로가기로 인정하는 당김(px) · 배지가 따라 나오는 최대(px) — 제안 */
export const EDGE = 24;
export const TRIGGER = 72;
const MAX_PULL = 96;

export type EdgeSide = 'left' | 'right';

/** 시작 자리로 가장자리 판정 */
export function edgeOf(x: number, width: number, edge = EDGE): EdgeSide | null {
  if (x <= edge) return 'left';
  if (x >= width - edge) return 'right';
  return null;
}

/** 움직임 한 번: 안쪽으로 당긴 거리 · 취소(세로가 더 큼) · 넘었는지 */
export function edgeSwipeStep(side: EdgeSide, dx: number, dy: number): { pull: number; cancel: boolean; armed: boolean } {
  const pull = side === 'left' ? dx : -dx;
  const cancel = Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(pull);
  return { pull: Math.max(0, pull), cancel, armed: !cancel && pull >= TRIGGER };
}

const BACK_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function installEdgeSwipe(root: HTMLElement, onBack: () => void): void {
  const badge = h('div', { class: 'edge-back', 'aria-hidden': 'true' }, svg(BACK_ICON));
  root.append(badge);
  let id: number | null = null;
  let side: EdgeSide = 'left';
  let x0 = 0;
  let y0 = 0;
  let armed = false;

  const hide = (): void => {
    id = null;
    armed = false;
    badge.classList.remove('is-on', 'is-armed', 'is-pulling');
    badge.style.transform = '';
  };

  addEventListener(
    'pointerdown',
    (e) => {
      if (e.pointerType === 'mouse' || id !== null) return;
      const s = edgeOf(e.clientX, innerWidth);
      if (!s) return;
      const t = e.target as Element | null;
      if (t?.closest('.stick, input, textarea, select, [contenteditable="true"]')) return;
      id = e.pointerId;
      side = s;
      x0 = e.clientX;
      y0 = e.clientY;
      armed = false;
      badge.dataset.side = s;
      badge.style.top = `${y0}px`;
    },
    true,
  );
  addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerId !== id) return;
      const r = edgeSwipeStep(side, e.clientX - x0, e.clientY - y0);
      if (r.cancel) {
        hide();
        return;
      }
      armed = r.armed;
      const shift = Math.min(MAX_PULL, r.pull) * (side === 'left' ? 1 : -1);
      badge.classList.add('is-pulling');
      badge.classList.toggle('is-on', r.pull > 8);
      badge.classList.toggle('is-armed', armed);
      badge.style.transform = `translate3d(${shift}px, -50%, 0)`;
    },
    true,
  );
  const end = (e: PointerEvent): void => {
    if (e.pointerId !== id) return;
    const go = armed && e.type === 'pointerup';
    hide();
    if (go) onBack();
  };
  addEventListener('pointerup', end, true);
  addEventListener('pointercancel', end, true);
}
