// 화면 공통 조각: 위쪽 막대(뒤로 + 제목), 에셋 경로.
import { bus, type ScreenId } from '../../core/events';
import type { CharacterId } from '../../data';
import { h, svg } from '../dom';
import { chevronLeftIcon } from '../icons';

export const portraitUrl = (id: CharacterId): string => `assets/characters/portrait-${id}.webp`;

/**
 * 잠긴 친구 칸 (2026-11-20 라이언): reference 컨셉 그림의 실루엣(짙은 면색, `portrait-<id>-shade` — src/art/lockedShade.ts) + 물음표.
 * 크기는 넣는 자리의 클래스가 정한다. 자물쇠는 칸이 따로 얹는다
 */
export function lockedShade(cls = ''): HTMLElement {
  return h(
    'span',
    { class: `locked-shade ${cls}`.trim(), 'aria-hidden': 'true' },
    h('img', { class: 'locked-shade__fill', alt: '', width: 192, height: 192 }),
    h('span', { class: 'locked-shade__mark' }, '?'),
  );
}

/** 잠긴 친구를 보여 줄 때만 부른다 (루미는 실루엣 그림이 없다) */
export function setLockedShade(el: HTMLElement, id: CharacterId): void {
  const img = el.querySelector<HTMLImageElement>('.locked-shade__fill');
  const src = `assets/characters/portrait-${id}-shade.png`;
  if (img && img.getAttribute('src') !== src) img.src = src;
}

export function screenBar(title: string, back: ScreenId = 'home'): HTMLElement {
  const backButton = h('button', { class: 'icon-button', type: 'button', 'aria-label': '뒤로' }, svg(chevronLeftIcon));
  backButton.addEventListener('click', () => bus.emit('ui:navigate', { to: back }));
  return h('header', { class: 'screen-bar' }, backButton, h('h2', { class: 'screen-bar__title' }, title), h('span', { class: 'screen-bar__spacer' }));
}

export function screenShell(id: ScreenId, ...children: (Node | string)[]): HTMLElement {
  return h('section', { class: `screen screen--${id}`, 'data-screen-id': id, 'aria-label': id }, ...children);
}
