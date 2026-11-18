// 상점: 기획서대로 겉모습만 판다. 능력치·아이템은 팔지 않는다.
// 2026-11-18: 재화가 기획에 없어 '밤을 지나면 열림'으로 연다(제안).
//  - 빛 색(cosmetics.json): 빛을 보낼 때의 별·휘두름 궤적·조준 원뿔 색. 호박빛(기본) · 새벽빛 · 민트빛 · 달빛 · 별빛
//  - 스킨: 등불지기 외형은 ChatGPT 그림이 와야 해서 아직 '준비 중'
// 배치는 UI Screen Sheet(위 가게 그림 + 탭 + 카드 그리드).
import { bus } from '../../core/events';
import { Progress } from '../../core/Progress';
import { loadSettings, saveSettings } from '../../core/Settings';
import { GameData } from '../../data';
import { isUnlocked } from '../../systems/unlocks';
import { h, svg } from '../dom';
import { lockIcon } from '../icons';
import { portraitUrl, screenBar, screenShell } from './common';
import { unlockLine } from './SelectScreen';

type Tab = 'light' | 'skin';

const TABS: { id: Tab; label: string }[] = [
  { id: 'light', label: '빛 색' },
  { id: 'skin', label: '스킨' },
];

const SKIN_SLOTS = 6;

export class ShopScreen {
  readonly el: HTMLElement;
  private readonly grid: HTMLElement;
  private readonly note: HTMLElement;
  private readonly tabs: HTMLButtonElement[];
  private tab: Tab = 'light';

  constructor() {
    this.grid = h('div', { class: 'shop__grid' });
    this.note = h('p', { class: 'shop__note' });
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
      this.note,
    );
    bus.on('progress:change', () => this.select(this.tab));
    this.select('light');
  }

  show(): void {
    this.select(this.tab);
  }

  private select(tab: Tab): void {
    this.tab = tab;
    this.tabs.forEach((b, i) => {
      const on = TABS[i].id === tab;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', String(on));
    });
    if (tab === 'light') this.renderLight();
    else this.renderSkin();
  }

  private renderLight(): void {
    const { cleared, demo } = Progress.data;
    const chosen = loadSettings().lightColor;
    const cards = GameData.cosmetics.lightColors.map((c) => {
      const open = isUnlocked(c.unlock, cleared, demo);
      const on = open && (c.id === chosen || (c.unlock === 'start' && !GameData.cosmetics.lightColors.some((x) => x.id === chosen && isUnlocked(x.unlock, cleared, demo))));
      const swatch = h('span', { class: 'shop-card__swatch', 'aria-hidden': 'true' });
      swatch.style.setProperty('--swatch', c.color);
      const tag = on ? '쓰는 중' : open ? '고르기' : unlockLine(c.unlock, c.name);
      const card = h(
        'button',
        { class: `shop-card shop-card--light${on ? ' is-equipped' : ''}${open ? '' : ' is-locked'}`, type: 'button', 'aria-pressed': String(on) },
        swatch,
        h('strong', {}, c.name),
        h('span', { class: 'shop-card__tag' }, ...(open ? [] : [svg(lockIcon)]), tag),
      );
      card.addEventListener('click', () => {
        if (!open) return;
        saveSettings({ ...loadSettings(), lightColor: c.id });
        this.renderLight();
      });
      return card;
    });
    this.grid.replaceChildren(...cards);
    this.note.textContent = '겉모습만 바뀌어요. 밤을 지날 때마다 새 빛 색이 열려요.';
  }

  private renderSkin(): void {
    const cards: HTMLElement[] = [
      h('article', { class: 'shop-card is-equipped' }, h('img', { class: 'shop-card__art', src: portraitUrl('lumi'), alt: '', width: 96, height: 96 }), h('strong', {}, '기본'), h('span', { class: 'shop-card__tag' }, '쓰는 중')),
    ];
    for (let i = 1; i < SKIN_SLOTS; i++) {
      cards.push(h('article', { class: 'shop-card is-locked' }, h('span', { class: 'shop-card__ghost', 'aria-hidden': 'true' }), h('span', {}, '준비 중')));
    }
    this.grid.replaceChildren(...cards);
    this.note.textContent = '겉모습만 바뀌어요. 능력치는 팔지 않아요.';
  }
}
