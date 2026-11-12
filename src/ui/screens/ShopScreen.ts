// 상점: 기획서대로 겉모습만 판다(주인공 스킨·등불 외형·빛 색). 장착물·아이템·능력치는 팔지 않는다.
// 배치는 UI Screen Sheet(위 가게 그림 + 탭 + 카드 그리드). 재화·가격·스킨 이름은 기획서에 없어 M6에서 정한다 → 지금은 '준비 중'.
import { h } from '../dom';
import { portraitUrl, screenBar, screenShell } from './common';

type Tab = 'skin' | 'lantern' | 'light';

const TABS: { id: Tab; label: string }[] = [
  { id: 'skin', label: '스킨' },
  { id: 'lantern', label: '등불' },
  { id: 'light', label: '빛 색' },
];

const SLOTS = 6;

function baseVisual(tab: Tab): HTMLElement {
  if (tab === 'skin') return h('img', { class: 'shop-card__art', src: portraitUrl('lumi'), alt: '', width: 96, height: 96 });
  if (tab === 'lantern') return h('span', { class: 'shop-card__lantern', 'aria-hidden': 'true' });
  return h('span', { class: 'shop-card__swatch', 'aria-hidden': 'true' });
}

export class ShopScreen {
  readonly el: HTMLElement;
  private readonly grid: HTMLElement;
  private readonly tabs: HTMLButtonElement[];

  constructor() {
    this.grid = h('div', { class: 'shop__grid' });
    this.tabs = TABS.map((t) => {
      const b = h('button', { class: 'tab', type: 'button', role: 'tab' }, t.label);
      b.addEventListener('click', () => this.select(t.id));
      return b;
    });
    this.el = screenShell(
      'shop',
      h(
        'div',
        { class: 'shop__header', 'aria-hidden': 'true' },
        h('span', { class: 'shop__shelf' }),
        h('span', { class: 'shop__shelf shop__shelf--low' }),
        h('span', { class: 'shop__hanging' }),
        h('span', { class: 'shop__hanging shop__hanging--right' }),
      ),
      screenBar('상점'),
      h('div', { class: 'tabs', role: 'tablist' }, ...this.tabs),
      this.grid,
      h('p', { class: 'shop__note' }, '겉모습만 바뀌어요. 능력치는 팔지 않아요.'),
    );
    this.select('skin');
  }

  private select(tab: Tab): void {
    this.tabs.forEach((b, i) => {
      const on = TABS[i].id === tab;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', String(on));
    });
    const cards: HTMLElement[] = [
      h('article', { class: 'shop-card is-equipped' }, baseVisual(tab), h('strong', {}, '기본'), h('span', { class: 'shop-card__tag' }, '장착 중')),
    ];
    for (let i = 1; i < SLOTS; i++) {
      cards.push(h('article', { class: 'shop-card is-locked' }, h('span', { class: 'shop-card__ghost', 'aria-hidden': 'true' }), h('span', {}, '준비 중')));
    }
    this.grid.replaceChildren(...cards);
  }
}
