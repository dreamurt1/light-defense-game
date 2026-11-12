// 위 띠 바로 아래에 1.5초 떠올랐다 사라지는 한 줄.
import { bus } from '../core/events';
import { stageById } from '../data';
import { h } from './dom';

export class Toast {
  readonly el = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });

  constructor() {
    // 2026-11-12 새 기획 (새 문구)
    bus.on('station:lit', (e) => this.show(e.allLit ? '모든 등불이 켜졌어요!' : '등불이 켜졌어요'));
    bus.on('player:down', (e) => this.show(`하트 ${e.hearts}개 남았어요`));
    // 판 시작 안내 (2026-11-12, 제안): 등불 자리는 판마다 바뀌므로 화면 가장자리 호박빛 마름모를 따라가게 한다
    bus.on('run:start', (e) => {
      if (e.test || stageById(e.stageId).stations < 1) return;
      window.setTimeout(() => this.show('호박빛 표시를 따라 꺼진 등불을 켜요'), 1400);
    });
  }

  show(text: string): void {
    const line = h('p', { class: 'toast__line' }, text);
    line.addEventListener('animationend', () => line.remove());
    this.el.append(line);
  }
}
