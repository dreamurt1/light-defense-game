// 위 띠 바로 아래에 1.5초 떠올랐다 사라지는 한 줄.
import { bus } from '../core/events';
import { h } from './dom';

export class Toast {
  readonly el = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });

  constructor() {
    bus.on('synergy:burst', () => this.show('마을이 환해져요!'));
  }

  show(text: string): void {
    const line = h('p', { class: 'toast__line' }, text);
    line.addEventListener('animationend', () => line.remove());
    this.el.append(line);
  }
}
