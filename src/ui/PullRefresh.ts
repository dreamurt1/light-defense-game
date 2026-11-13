// 당겨서 새로고침 (2026-11-13 라이언: 폰·태블릿 웹에서 게임 중이 아니면 위에서 아래로 끌어 새로고침).
// 브라우저 자체 기능은 페이지 설정·기기·전체 화면·홈 화면 앱 여부에 따라 되거나 안 된다(갤럭시 크롬에서 안 됨 — 라이언 확인).
// 그래서 직접 만든다: 판 밖 화면(<html data-screen> ≠ play)에서 한 손가락으로 아래로 끌면 위에 빛 동그라미가 내려오고,
// 충분히(READY_PX) 끌었다 놓으면 새로고침. 덜 끌었거나 옆·위로 끌면 그냥 돌아간다. 판에서는 아무 일도 하지 않는다.
import { h, svg } from './dom';
import { refreshIcon } from './icons';

/** 놓으면 새로고침되는 끌기 거리 (화면 px, 제안 — 크롬 기본과 비슷하게) */
const READY_PX = 120;
/** 동그라미가 내려오는 최대 거리 (px) */
const MAX_DROP = 96;
/** 아래로 끄는 몸짓으로 볼 최소 거리와 기울기 (옆 끌기·누름과 구분) */
const START_PX = 14;

export function installPullRefresh(): void {
  const badge = h('div', { class: 'pull-refresh', 'aria-hidden': 'true' }, svg(refreshIcon));
  document.body.append(badge);

  let start: { x: number; y: number } | null = null;
  let pulling = false;
  let dist = 0;

  const inGame = (): boolean => document.documentElement.dataset.screen === 'play';
  const render = (): void => {
    const drop = Math.min(MAX_DROP, dist * 0.6);
    badge.style.setProperty('--drop', `${drop}px`);
    badge.style.setProperty('--turn', `${dist * 1.6}deg`);
    badge.style.setProperty('--show', String(Math.min(1, dist / 50)));
    badge.classList.toggle('is-ready', dist >= READY_PX);
  };
  const reset = (): void => {
    start = null;
    pulling = false;
    dist = 0;
    badge.classList.remove('is-pulling', 'is-ready');
    render();
  };

  addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length !== 1 || inGame() || scrolledInside(e.target)) return reset();
      const t = e.touches[0];
      start = { x: t.clientX, y: t.clientY };
      pulling = false;
      dist = 0;
    },
    { passive: true },
  );
  addEventListener(
    'touchmove',
    (e) => {
      if (!start) return;
      if (e.touches.length !== 1 || inGame()) return reset();
      const t = e.touches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (!pulling) {
        if (dy > START_PX && dy > Math.abs(dx) * 1.4) {
          pulling = true;
          badge.classList.add('is-pulling');
        } else if (Math.abs(dx) > START_PX || dy < -START_PX) {
          start = null; // 옆·위로 끄는 몸짓: 이번 손가락은 새로고침이 아님
          return;
        } else return;
      }
      dist = Math.max(0, dy);
      render();
    },
    { passive: true },
  );
  addEventListener(
    'touchend',
    () => {
      if (pulling && dist >= READY_PX && !inGame()) {
        badge.classList.add('is-loading');
        // 빙글 도는 모습이 한 번 보이고 새로고침
        window.setTimeout(() => location.reload(), 120);
        return;
      }
      reset();
    },
    { passive: true },
  );
  addEventListener('touchcancel', reset, { passive: true });
}

/** 손가락이 닿은 곳이 아래로 스크롤된 목록 안이면(목록을 위로 올리는 중) 새로고침하지 않는다 */
function scrolledInside(target: EventTarget | null): boolean {
  for (let el = target instanceof Element ? target : null; el; el = el.parentElement) {
    if (el.scrollTop > 0) return true;
  }
  return false;
}
