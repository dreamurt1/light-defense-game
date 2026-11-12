// 화면 공통 조각: 위쪽 막대(뒤로 + 제목), 에셋 경로.
import { bus, type ScreenId } from '../../core/events';
import type { CharacterId } from '../../data';
import { h, svg } from '../dom';
import { chevronLeftIcon } from '../icons';

export const portraitUrl = (id: CharacterId): string => `assets/characters/portrait-${id}.png`;

export function screenBar(title: string, back: ScreenId = 'home'): HTMLElement {
  const backButton = h('button', { class: 'icon-button', type: 'button', 'aria-label': '뒤로' }, svg(chevronLeftIcon));
  backButton.addEventListener('click', () => bus.emit('ui:navigate', { to: back }));
  return h('header', { class: 'screen-bar' }, backButton, h('h2', { class: 'screen-bar__title' }, title), h('span', { class: 'screen-bar__spacer' }));
}

export function screenShell(id: ScreenId, ...children: (Node | string)[]): HTMLElement {
  return h('section', { class: `screen screen--${id}`, 'data-screen-id': id, 'aria-label': id }, ...children);
}
