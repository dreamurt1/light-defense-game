// 상점: 기획서대로 겉모습만 판다. 능력치·아이템은 팔지 않는다.
// 2026-11-18: 재화가 기획에 없어 '밤을 지나면 열림'으로 열었다 → 2026-11-23 밤 나들이 v3: 별가루로 산다(cosmetics.json price, '사기 ✦n' → '쓰는 중').
//  - 빛 색(cosmetics.json): 빛을 보낼 때의 별·휘두름 궤적·조준 원뿔 색. 호박빛(기본) · 새벽빛 · 민트빛 · 달빛 · 별빛
//  - 꾸미기(2026-11-24 15:58 기획 세션, 라이언 확정 — 옛 '스킨' 탭): 빛 모양 3(별·달·씨앗 — 달·씨앗은 그 친구를 되찾은 뒤) ·
//    걸음 빛 3(없음·반딧불 가루·별가루 흔적). 그림 없이 코드로, 겉모습만. 캐릭터 스킨은 그림이 온 뒤
// 배치는 UI Screen Sheet(위 가게 그림 + 탭 + 카드 그리드).
import { bus } from '../../core/events';
import { Progress } from '../../core/Progress';
import { loadSettings, saveSettings, type SettingsData } from '../../core/Settings';
import { GameData } from '../../data';
import { decorView, ownedId, type DecorKind } from '../../systems/cosmetics';
import { h, svg } from '../dom';
import { v3Icon } from '../v3Icons';
import { screenBar, screenShell } from './common';

type Tab = 'light' | 'decor';

const TABS: { id: Tab; label: string }[] = [
  { id: 'light', label: '빛 색' },
  { id: 'decor', label: '꾸미기' },
];

/** 빛 모양 칸 그림 (게임의 lightShapeArt와 같은 꼴 — 오른쪽이 날아가는 쪽) */
const SHAPE_SVG: Record<string, string> = {
  star: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 6l7.6 16.4L57 25l-13 12.2L47.4 56 32 46.8 16.6 56 20 37.2 7 25l17.4-2.6z" fill="url(#g)"/><defs><radialGradient id="g"><stop offset="0" stop-color="#FFF6D8"/><stop offset=".5" stop-color="#FFD77A"/><stop offset="1" stop-color="#F2A93F"/></radialGradient></defs></svg>',
  moon: '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><mask id="m"><rect width="64" height="64" fill="#fff"/><circle cx="21" cy="32" r="19" fill="#000"/></mask><radialGradient id="g2"><stop offset="0" stop-color="#FFF6D8"/><stop offset=".5" stop-color="#FFD77A"/><stop offset="1" stop-color="#F2A93F"/></radialGradient></defs><circle cx="32" cy="32" r="22" fill="url(#g2)" mask="url(#m)"/></svg>',
  seed: '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="g3"><stop offset="0" stop-color="#FFF6D8"/><stop offset=".5" stop-color="#FFD77A"/><stop offset="1" stop-color="#F2A93F"/></radialGradient></defs><path d="M56 32C48 19 34 17 26 26c-6 7-1 18 12 16 8-1 14-6 18-10z" fill="url(#g3)"/><ellipse cx="14" cy="21" rx="7" ry="3.2" transform="rotate(-40 14 21)" fill="#FFF1C9"/><path d="M19 26L8 16" stroke="#FFE19A" stroke-width="1.6"/></svg>',
};

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
    // 탭을 바꾸면 '별가루가 부족해요' 안내를 지운다 (빛 색 moon·빛 모양 moon처럼 id가 같은 칸이 있음)
    if (tab !== this.tab) this.short = null;
    this.tab = tab;
    this.tabs.forEach((b, i) => {
      const on = TABS[i].id === tab;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', String(on));
    });
    this.grid.classList.toggle('shop__grid--decor', tab === 'decor');
    if (tab === 'light') this.renderLight();
    else this.renderDecor();
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

  /** 꾸미기 (2026-11-24): 묶음 둘 × 3칸 — 빛 모양 · 걸음 빛. 각 묶음 첫 칸이 기본(처음부터 쓰는 중) */
  private renderDecor(): void {
    const s = loadSettings();
    const owns = (id: string, price: number) => Progress.owns(id, price);
    const friendOpen = (id: Parameters<typeof Progress.isFriendOpen>[0]) => Progress.isFriendOpen(id);
    const group = (kind: DecorKind, title: string, items: readonly { id: string; name: string; price: number; requires?: Parameters<typeof Progress.isFriendOpen>[0]; color?: string }[], field: 'lightShape' | 'trail', side: 'a' | 'b') => {
      const head = h('p', { class: `shop__group-title shop__group-title--${side}` }, title);
      const cards = items.map((it) => {
        const v = decorView(kind, it, items, { owns, friendOpen, selected: s[field], shortId: this.short });
        const art =
          kind === 'lightShape'
            ? h('span', { class: 'shop-card__shape', 'aria-hidden': 'true' }, svg(SHAPE_SVG[it.id] ?? SHAPE_SVG.star))
            : h('span', { class: `shop-card__trail${it.color ? '' : ' is-none'}`, 'aria-hidden': 'true' }, h('i'), h('i'), h('i'));
        if (it.color) art.style.setProperty('--trail', it.color);
        const tag =
          v.state === 'buy'
            ? h('span', { class: 'shop-card__tag' }, '사기 ', v3Icon('stardust'), String(it.price))
            : h('span', { class: `shop-card__tag${v.state === 'locked' ? ' shop-card__tag--lock' : ''}` }, v.tag);
        const on = v.state === 'equipped';
        const card = h(
          'button',
          {
            class: `shop-card shop-card--decor shop-card--decor-${side}${on ? ' is-equipped' : ''}${v.state === 'owned' || on ? '' : ' is-locked'}`,
            type: 'button',
            'aria-pressed': String(on),
            'aria-disabled': String(v.state === 'locked'),
          },
          art,
          h('strong', {}, it.name),
          tag,
        );
        card.addEventListener('click', () => {
          if (v.state === 'locked') return;
          // 사면 바로 쓴다. 모자라면 그 칸에 '별가루가 부족해요'
          if ((v.state === 'buy' || v.state === 'short') && !Progress.buyCosmetic(ownedId(kind, it.id), it.price)) {
            this.short = it.id;
            this.renderDecor();
            return;
          }
          this.short = null;
          saveSettings({ ...loadSettings(), [field]: it.id } as SettingsData);
          this.renderDecor();
        });
        return card;
      });
      return [head, ...cards];
    };
    const C = GameData.cosmetics;
    this.grid.replaceChildren(...group('lightShape', '빛 모양', C.lightShapes, 'lightShape', 'a'), ...group('trail', '걸음 빛', C.trails, 'trail', 'b'));
    this.note.replaceChildren('별가루 ', v3Icon('stardust'), `${Progress.data.dust} · 겉모습만 바뀌어요. 능력치는 팔지 않아요.`);
  }
}
