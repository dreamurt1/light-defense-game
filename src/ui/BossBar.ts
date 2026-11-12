// 보스전 체력바: 위 HUD 아래, 노월의 얼굴·이름·체력. UI Screen Sheet의 보스전 배치.
// 시트는 빨간 막대지만 팔레트에 빨강이 없어 노월의 색(라벤더)으로. 노월의 등장·체력은 M2에서 이벤트로 들어온다.
import { bus } from '../core/events';
import { h } from './dom';

export class BossBar {
  readonly el: HTMLElement;
  private readonly fill: HTMLElement;

  constructor() {
    this.fill = h('span', { class: 'boss-bar__fill' });
    this.el = h(
      'div',
      { class: 'boss-bar', role: 'progressbar', 'aria-label': '노월', 'aria-valuemin': 0, 'aria-valuemax': 100 },
      h('span', { class: 'boss-bar__face', 'aria-hidden': 'true' }),
      h('span', { class: 'boss-bar__name' }, '노월'),
      h('span', { class: 'boss-bar__track' }, this.fill),
    );
    this.el.hidden = true;

    bus.on('witch:spawn', () => (this.el.hidden = false));
    bus.on('witch:returned', () => (this.el.hidden = true));
    bus.on('run:start', () => (this.el.hidden = true));
    bus.on('boss:hp', (e) => {
      const p = Math.max(0, Math.min(1, e.hp / e.maxHp));
      this.fill.style.setProperty('--p', String(p));
      this.el.setAttribute('aria-valuenow', String(Math.round(p * 100)));
    });
  }
}
