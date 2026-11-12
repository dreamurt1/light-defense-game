// 일시정지: 패널이 위에서 내려온다. 계속 / 다시 한 번 / 홈으로 / 설정 (기획서 PauseOverlay).
import { bus } from '../core/events';
import { h, svg } from './dom';
import { gearIcon, homeIcon, playIcon } from './icons';

export class PauseSheet {
  readonly el: HTMLElement;
  private readonly panel: HTMLElement;

  constructor() {
    const resume = h('button', { class: 'pill pill--primary', type: 'button' }, svg(playIcon), '계속');
    resume.addEventListener('click', () => bus.emit('ui:pause-toggle'));
    const again = h('button', { class: 'pill pill--secondary', type: 'button' }, '다시 한 번');
    again.addEventListener('click', () => bus.emit('ui:restart'));
    const village = h('button', { class: 'pill pill--secondary', type: 'button' }, svg(homeIcon), '홈으로');
    village.addEventListener('click', () => bus.emit('ui:navigate', { to: 'home' }));
    const settings = h('button', { class: 'pill pill--ghost', type: 'button' }, svg(gearIcon), '설정');
    settings.addEventListener('click', () => bus.emit('ui:open-settings'));

    this.panel = h(
      'div',
      { class: 'sheet__panel', tabindex: -1 },
      h('h2', { class: 'sheet__title', id: 'pause-title' }, '잠시 쉬어요'),
      h('div', { class: 'sheet__actions' }, resume, again, village, settings),
    );
    this.el = h('section', { class: 'sheet sheet--pause', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pause-title' }, this.panel);
    this.el.hidden = true;

    bus.on('run:pause', (e) => this.toggle(e.paused));
    bus.on('run:start', () => this.toggle(false));
    bus.on('ui:navigate', () => this.toggle(false));
  }

  private toggle(open: boolean): void {
    this.el.hidden = !open;
    if (open) this.panel.focus({ preventScroll: true });
  }
}
