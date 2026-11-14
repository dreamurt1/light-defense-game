// 테스트 판 고르기 (2026-11-14 라이언: 홈 '테스트' → 모든 스테이지 선택지 중 하나를 골라 바로 플레이).
//  - 연습장(적 조금·끝나지 않음, 2026-11-13) · 처음 밤(튜토리얼) · 1~4스테이지. 잠금과 상관없이 바로 시작한다
//    (튜토리얼도 이야기 카드 없이 바로 판 — 테스트이므로).
//  - 테스트 판은 진행(깬 스테이지·튜토리얼·구출한 친구)과 지난 밤들에 남지 않는다(core/Progress, ResultSheet, 제안).
//  - 모양은 선택 화면의 스테이지 카드(.stage-card)를 그대로 쓴다. 뒤로가기·ESC·바깥 누르기로 닫힌다(HistoryNav).
import { bus } from '../core/events';
import { STAGE_ORDER, enemyById, stageById } from '../data';
import { h, svg } from './dom';
import { lampIcon, moonIcon, pawIcon, tutorialIcon } from './icons';
import { rescueFriend } from './screens/SelectScreen';

/** 고르는 순서: 가장 자주 쓰는 연습장 먼저, 그다음 진행 순 */
const ORDER = ['practice', 'tutorial', ...STAGE_ORDER] as const;

let sheet: TestSheet | null = null;

/** 홈 '테스트' */
export function openTestSheet(): void {
  sheet?.toggle(true);
}

/** 열려 있으면 닫고 true (뒤로가기) */
export function closeTestSheet(): boolean {
  if (!sheet || sheet.el.hidden) return false;
  sheet.toggle(false);
  return true;
}

export class TestSheet {
  readonly el: HTMLElement;
  private readonly panel: HTMLElement;

  constructor() {
    const cards = ORDER.map((id, i) => {
      const def = stageById(id);
      const friend = rescueFriend(def);
      const num = def.practice ? '연습' : def.tutorial ? '처음' : String(i - 1);
      const meta = def.practice
        ? h('span', { class: 'stage-card__meta' }, '적 조금 · 끝없음')
        : def.tutorial
          ? h('span', { class: 'stage-card__meta' }, svg(tutorialIcon), '튜토리얼')
          : h('span', { class: 'stage-card__meta' }, svg(lampIcon), `등불 ${def.stations}`);
      const tag = def.boss
        ? h('span', { class: 'stage-card__tag stage-card__tag--boss' }, svg(moonIcon), enemyById(def.boss.enemyId).name)
        : friend
          ? h('span', { class: 'stage-card__tag stage-card__tag--friend' }, svg(pawIcon), friend.name)
          : null;
      const card = h(
        'button',
        { class: 'stage-card', type: 'button', 'data-theme': def.theme, 'aria-label': `${def.name} 테스트` },
        h('span', { class: 'stage-card__num' }, num),
        h('span', { class: 'stage-card__name' }, def.name),
        meta,
        ...(tag ? [tag] : []),
      );
      card.addEventListener('click', () => {
        this.toggle(false);
        bus.emit('ui:start-test', { stageId: id });
      });
      return card;
    });

    const close = h('button', { class: 'pill pill--secondary', type: 'button' }, '닫기');
    close.addEventListener('click', () => this.toggle(false));
    this.panel = h(
      'div',
      { class: 'sheet__panel', tabindex: -1 },
      h('h2', { class: 'sheet__title', id: 'test-title' }, '테스트할 밤을 골라요'),
      h('p', { class: 'test-sheet__note' }, '바로 시작해요 · 진행과 지난 밤들에는 남지 않아요'),
      h('div', { class: 'test-sheet__grid' }, ...cards),
      h('div', { class: 'sheet__actions sheet__actions--single' }, close),
    );
    this.el = h('section', { class: 'sheet sheet--test', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'test-title' }, this.panel);
    this.el.hidden = true;
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.toggle(false);
    });
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || this.el.hidden) return;
      e.preventDefault();
      this.toggle(false);
    });
    bus.on('ui:navigate', () => this.toggle(false));
    sheet = this;
  }

  toggle(open: boolean): void {
    this.el.hidden = !open;
    if (open) this.panel.focus({ preventScroll: true });
  }
}
