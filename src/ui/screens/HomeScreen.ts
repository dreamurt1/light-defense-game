// 홈(엔트리) — 2026-11-18 새 기획(docs/design/HOME_SCREEN.md, 라이언: 그림의 캐릭터·등불과 버튼이 엇갈리고 리본이 틀림 → 여기서 처음부터).
// 가로 배경 그림(ChatGPT)에는 캐릭터·제목·버튼이 없다. 별 등불이 놓인 빈터 풍경만 있다. 게임이 그 위에 얹는다:
//  - 제목 PNG(최신 제목 그대로) + 한글 이름·슬로건
// 2026-11-21 라이언: 세로(폰 세로·PC 세로)는 웹 썸네일 그림(제목·등불 둘레 실루엣이 그림에 있음) — 제목 PNG·한글 문구는 화면 읽기용으로만 숨겨 둔다(screens.css)
//  (2026-11-18 라이언: 홈은 캐릭터 없이 풍경만 — 잠깐 넣었던 '무대의 고른 등불지기'는 뺐다)
//  - 둥근 버튼 넷(지난 밤들·상점·튜토리얼·테스트, 둥근 배지 규칙) + '게임하기' 알약
//  - 프로필(아바타 = 고른 등불지기)·설정
// 배경은 그림 비율 그대로 화면을 덮는 장면 상자(.home__scene)에 깐다.
// 제목·버튼·프로필은 화면 기준으로 놓아 비율이 달라도 잘리지 않는다. 세로·가로 배치는 screens.css 홈 절.
// 메뉴 동작은 그대로: 처음 하는 유저의 '게임하기' = 이야기 → 튜토리얼(2026-11-13), 튜토리얼 버튼은 언제든 다시, 테스트 = 고르기 창.
// 2026-11-23 밤 나들이 v3: '게임하기' → '밤 나들이 시작', 저장된 런이 있으면 그 위에 '이어서 하기 (밤 n)'(그 밤을 처음부터),
// 프로필에 최고 기록 '밤 n · 점수', 아래 칩 '별가루 ✦n'·'발견한 지역 n/6'(값이 있을 때만).
import { bus } from '../../core/events';
import { Progress } from '../../core/Progress';
import { RunState } from '../../core/RunState';
import { continueRun, savedRun } from '../../core/runFlow';
import { GameData } from '../../data';
import { startTutorial } from '../Story';
import { openTestSheet } from '../TestSheet';
import { formatScore, h, svg } from '../dom';
import { gearIcon, pawIcon, playIcon, podiumIcon, shopIcon, tutorialIcon } from '../icons';
import { portraitUrl, screenShell } from './common';
import { v3Icon } from '../v3Icons';

/** 둥근 버튼: 남색 유리 원 + 굵은 선 아이콘 + 아래 글자 (5절 둥근 배지 규칙) */
function badge(label: string, icon: string, onClick: () => void, aria?: string): HTMLButtonElement {
  const b = h(
    'button',
    { class: 'home-badge', type: 'button', ...(aria ? { 'aria-label': aria } : {}) },
    h('span', { class: 'home-badge__icon' }, svg(icon)),
    h('span', { class: 'home-badge__label' }, label),
  ) as HTMLButtonElement;
  b.addEventListener('click', onClick);
  return b;
}

export class HomeScreen {
  readonly el: HTMLElement;
  private readonly name: HTMLElement;
  private readonly avatar: HTMLImageElement;
  private readonly best = h('span', { class: 'profile__best' });
  private readonly chips = h('div', { class: 'home__chips' });
  private readonly continueBtn: HTMLButtonElement;
  private readonly continueLabel = h('span', {});

  constructor() {
    const settings = h('button', { class: 'icon-button home__settings', type: 'button', 'aria-label': '설정' }, svg(gearIcon));
    settings.addEventListener('click', () => bus.emit('ui:open-settings'));

    const start = h('button', { class: 'pill pill--primary home__start', type: 'button' }, svg(playIcon), '밤 나들이 시작');
    this.continueBtn = h('button', { class: 'pill pill--secondary home__continue', type: 'button' }, svg(playIcon), this.continueLabel) as HTMLButtonElement;
    this.continueBtn.addEventListener('click', () => continueRun());
    start.addEventListener('click', () => {
      if (Progress.tutorialDone) bus.emit('ui:navigate', { to: 'select' });
      else startTutorial();
    });

    this.avatar = h('img', { class: 'profile__avatar', src: portraitUrl(RunState.characterId), alt: '', width: 40, height: 40 }) as HTMLImageElement;
    this.name = h('span', { class: 'profile__name' }, RunState.nickname);
    bus.on('progress:change', () => this.renderRecord());
    this.el = screenShell(
      'home',
      h('div', { class: 'home__scene', 'aria-hidden': 'true' }),
      settings,
      h(
        'header',
        { class: 'home__title' },
        h(
          'h1',
          { class: 'logo' },
          h('img', { class: 'home__logo', src: 'assets/backgrounds/home-title.webp', alt: 'LIGHT DEFENSE', width: 600, height: 464 }),
          h('span', { class: 'logo__ko' }, '라이트 디펜스'),
        ),
        h('p', { class: 'home__slogan' }, '작은 빛으로, 밤을 지켜요.'),
      ),
      h(
        'nav',
        { class: 'home__menu', 'aria-label': '메뉴' },
        h(
          'div',
          { class: 'home__badges' },
          badge('지난 밤들', podiumIcon, () => bus.emit('ui:navigate', { to: 'ranking' })),
          badge('상점', shopIcon, () => bus.emit('ui:navigate', { to: 'shop' })),
          badge('튜토리얼', tutorialIcon, () => startTutorial(), '튜토리얼: 처음 밤을 다시 해 봐요'),
          // 2026-11-14 라이언: 연습장(트라이얼)·튜토리얼·모든 스테이지 중 골라 바로 플레이(TestSheet). 항상 보인다
          badge('테스트', pawIcon, () => openTestSheet(), '테스트: 트라이얼이나 스테이지를 골라 바로 해 봐요'),
        ),
        this.continueBtn,
        start,
      ),
      h('div', { class: 'profile' }, this.avatar, h('span', { class: 'profile__text' }, this.name, this.best)),
      this.chips,
    );
    this.renderRecord();
  }

  /** 화면에 들어올 때마다 닉네임·프로필 사진(고른 등불지기)·저장된 런·기록을 새로 읽는다 */
  show(): void {
    this.name.textContent = RunState.nickname;
    const src = portraitUrl(RunState.characterId);
    if (!this.avatar.src.endsWith(src)) this.avatar.src = src;
    const saved = Progress.tutorialDone ? savedRun() : null;
    this.continueBtn.hidden = !saved;
    this.el.classList.toggle('has-continue', !!saved);
    this.continueLabel.textContent = saved ? `이어서 하기 (밤 ${saved.night})` : '';
    this.renderRecord();
  }

  /** 최고 기록 '밤 n · 점수'와 칩(별가루 · 발견한 지역) */
  private renderRecord(): void {
    const d = Progress.data;
    this.best.hidden = d.bestNight <= 0 && d.bestScore <= 0;
    this.best.textContent = `최고 기록 밤 ${d.bestNight} · ${formatScore(d.bestScore)}점`;
    const maps = GameData.nights.bands.reduce((n, b) => n + b.maps.length, 0);
    const chips: HTMLElement[] = [];
    if (d.dust > 0) chips.push(h('span', { class: 'home-chip home-chip--dust' }, '별가루 ', v3Icon('stardust'), String(d.dust)));
    if (d.discovered.length > 0) chips.push(h('span', { class: 'home-chip' }, `발견한 지역 ${d.discovered.length}/${Math.max(6, maps)}`));
    this.chips.replaceChildren(...chips);
    this.chips.hidden = chips.length === 0;
  }
}
