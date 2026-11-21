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
import { bus } from '../../core/events';
import { Progress } from '../../core/Progress';
import { RunState } from '../../core/RunState';
import { startTutorial } from '../Story';
import { openTestSheet } from '../TestSheet';
import { h, svg } from '../dom';
import { gearIcon, pawIcon, playIcon, podiumIcon, shopIcon, tutorialIcon } from '../icons';
import { portraitUrl, screenShell } from './common';

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

  constructor() {
    const settings = h('button', { class: 'icon-button home__settings', type: 'button', 'aria-label': '설정' }, svg(gearIcon));
    settings.addEventListener('click', () => bus.emit('ui:open-settings'));

    const start = h('button', { class: 'pill pill--primary home__start', type: 'button' }, svg(playIcon), '게임하기');
    start.addEventListener('click', () => {
      if (Progress.tutorialDone) bus.emit('ui:navigate', { to: 'select' });
      else startTutorial();
    });

    this.avatar = h('img', { class: 'profile__avatar', src: portraitUrl(RunState.characterId), alt: '', width: 40, height: 40 }) as HTMLImageElement;
    this.name = h('span', { class: 'profile__name' }, RunState.nickname);
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
        h('p', { class: 'home__slogan' }, '작은 빛으로, 마을을 되찾아요.'),
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
        start,
      ),
      h('div', { class: 'profile' }, this.avatar, this.name),
    );
  }

  /** 화면에 들어올 때마다 닉네임과 프로필 사진(고른 등불지기)을 새로 읽는다 */
  show(): void {
    this.name.textContent = RunState.nickname;
    const src = portraitUrl(RunState.characterId);
    if (!this.avatar.src.endsWith(src)) this.avatar.src = src;
  }
}
