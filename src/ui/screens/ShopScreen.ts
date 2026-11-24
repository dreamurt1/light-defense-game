// 상점: 기획서대로 겉모습만 판다. 능력치·아이템은 팔지 않는다.
// 2026-11-18: 재화가 기획에 없어 '밤을 지나면 열림'으로 열었다 → 2026-11-23 밤 나들이 v3: 별가루로 산다(cosmetics.json price, '사기 ✦n' → '쓰는 중').
//  - 빛 색(cosmetics.json): 빛을 보낼 때의 별·휘두름 궤적·조준 원뿔 색. 호박빛(기본) · 새벽빛 · 민트빛 · 달빛 · 별빛
//  - 스킨: 등불지기 외형은 ChatGPT 그림이 와야 해서 아직 '준비 중'
// 배치는 UI Screen Sheet(위 가게 그림 + 탭 + 카드 그리드).
import { bus } from '../../core/events';
import { Progress } from '../../core/Progress';
import { loadSettings, saveSettings } from '../../core/Settings';
import { GameData } from '../../data';
import { h } from '../dom';
import { v3Icon } from '../v3Icons';
import { portraitUrl, screenBar, screenShell } from './common';

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
  /** 별가루가 모자라 못 산 색 (잠깐 안내) */
  private short: string | null = null;

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
    const colors = GameData.cosmetics.lightColors;
    const chosen = loadSettings().lightColor;
    const chosenOwned = colors.some((x) => x.id === chosen && Progress.owns(x.id, x.price));
    const cards = colors.map((c) => {
      const owned = Progress.owns(c.id, c.price);
      const on = owned && (c.id === chosen || (c.price <= 0 && !chosenOwned));
      const swatch = h('span', { class: 'shop-card__swatch', 'aria-hidden': 'true' });
      swatch.style.setProperty('--swatch', c.color);
      const tag = on ? '쓰는 중' : owned ? '고르기' : this.short === c.id ? '별가루가 부족해요' : `사기 ✦${c.price}`;
      const card = h(
        'button',
        { class: `shop-card shop-card--light${on ? ' is-equipped' : ''}${owned ? '' : ' is-locked'}`, type: 'button', 'aria-pressed': String(on) },
        swatch,
        h('strong', {}, c.name),
        tag.startsWith('사기 ✦') ? h('span', { class: 'shop-card__tag' }, '사기 ', v3Icon('stardust'), String(c.price)) : h('span', { class: 'shop-card__tag' }, tag),
      );
      card.addEventListener('click', () => {
        // 사면 바로 쓴다. 모자라면 그 칸에 '별가루가 부족해요'
        if (!owned && !Progress.buyColor(c.id, c.price)) {
          this.short = c.id;
          this.renderLight();
          return;
        }
        this.short = null;
        saveSettings({ ...loadSettings(), lightColor: c.id });
        this.renderLight();
      });
      return card;
    });
    this.grid.replaceChildren(...cards);
    this.note.replaceChildren('별가루 ', v3Icon('stardust'), `${Progress.data.dust} · 겉모습만 바뀌어요. 별가루는 밤을 지키면 모여요.`);
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
