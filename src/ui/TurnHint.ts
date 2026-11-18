// 휴대폰 방향 고정 안내 (2026-11-19, Phase 6): 설정 '화면 방향'을 세로·가로로 골랐는데 기기가 다른 방향이면
// 화면을 덮고 돌려 달라고 한다(<html data-turn>은 ui/layout.ts가 정함, 보이기는 CSS). 판 중이면 회전으로 이미 일시정지된다.
// '자동으로 바꾸기'를 누르면 기기 방향을 다시 따른다(설정에 갇히지 않게).
import { loadSettings, saveSettings } from '../core/Settings';
import { h } from './dom';
import { lockOrientation, refreshLayout } from './layout';

/** 돌리는 휴대폰 그림: 굵고 끝이 둥근 선 (둥근 배지 결) */
const turnArt = `
<svg viewBox="0 0 96 96" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="30" y="16" width="36" height="60" rx="8"/>
  <path d="M44 66h8"/>
  <path d="M18 40a32 32 0 0 1 14-22"/>
  <path d="M26 16l7 2-2 7"/>
  <path d="M78 56a32 32 0 0 1-14 22"/>
  <path d="M70 80l-7-2 2-7"/>
</svg>`;

export function createTurnHint(): HTMLElement {
  const art = document.createElement('span');
  art.className = 'turn-hint__art';
  art.innerHTML = turnArt;
  const auto = h('button', { class: 'pill pill--secondary', type: 'button' }, '자동으로 바꾸기');
  auto.addEventListener('click', () => {
    saveSettings({ ...loadSettings(), phoneOrientation: 'auto' });
    lockOrientation();
    refreshLayout();
  });
  return h(
    'div',
    { class: 'turn-hint', role: 'alert' },
    art,
    h('p', { class: 'turn-hint__text' }, h('span', { class: 'turn-hint__to-portrait' }, '휴대폰을 세로로 돌려 주세요'), h('span', { class: 'turn-hint__to-landscape' }, '휴대폰을 가로로 돌려 주세요')),
    h('small', { class: 'turn-hint__sub' }, '설정의 화면 방향에서 고를 수 있어요'),
    auto,
  );
}
