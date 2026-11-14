// 홈(엔트리): UI Screen Sheet의 배치(위 로고, 오른쪽 메뉴, 왼쪽 아래 프로필, 뒤에 등불 곁의 루미) + 기획서의 메뉴 이름.
// 메뉴 (2026-11-12 새 기획): `게임하기` · `지난 밤들`(→ 랭킹) · 상점 · ⚙(설정) · 테스트(연습장).
// 시트의 재화·레벨은 기획에 없어 넣지 않는다.
// 2026-11-13 컨셉 시연판(라이언): 처음 하는 유저는 튜토리얼을 꼭 거친다 — '게임하기' → 이야기(건너뛰기 가능) → 튜토리얼 판.
// 튜토리얼을 마치면(Progress.tutorialDone) '게임하기'는 선택 화면으로. '테스트' = 연습장(스타파크식)은 항상 보인다.
// 2026-11-13 라이언: '튜토리얼' 버튼을 따로 — 이미 해 본 유저도 언제든 다시. 튜토리얼은 언제나 간추린 이야기부터(건너뛰기 가능).
import { bus } from '../../core/events';
import { Progress } from '../../core/Progress';
import { RunState } from '../../core/RunState';
import { startTutorial } from '../Story';
import { openTestSheet } from '../TestSheet';
import { h, svg } from '../dom';
import { gearIcon, pawIcon, playIcon, podiumIcon, shopIcon, tutorialIcon } from '../icons';
import { portraitUrl, screenShell } from './common';

export class HomeScreen {
  readonly el: HTMLElement;
  private readonly name: HTMLElement;

  constructor() {
    const settings = h('button', { class: 'icon-button home__settings', type: 'button', 'aria-label': '설정' }, svg(gearIcon));
    settings.addEventListener('click', () => bus.emit('ui:open-settings'));

    const start = h('button', { class: 'pill pill--primary', type: 'button' }, svg(playIcon), '게임하기');
    start.addEventListener('click', () => {
      if (Progress.tutorialDone) bus.emit('ui:navigate', { to: 'select' });
      else startTutorial();
    });
    const tutorial = h('button', { class: 'pill pill--secondary home__tutorial', type: 'button', 'aria-label': '튜토리얼: 처음 밤을 다시 해 봐요' }, svg(tutorialIcon), '튜토리얼');
    tutorial.addEventListener('click', () => startTutorial());
    const ranking = h('button', { class: 'pill pill--secondary', type: 'button' }, svg(podiumIcon), '지난 밤들');
    ranking.addEventListener('click', () => bus.emit('ui:navigate', { to: 'ranking' }));
    const shop = h('button', { class: 'pill pill--secondary', type: 'button' }, svg(shopIcon), '상점');
    shop.addEventListener('click', () => bus.emit('ui:navigate', { to: 'shop' }));
    // 2026-11-13 라이언: 테스트 = 스타파크식 연습장. 2026-11-14 라이언: 연습장·튜토리얼·모든 스테이지 중 골라 바로 플레이(TestSheet). 항상 보인다
    const test = h('button', { class: 'pill pill--secondary home__test', type: 'button', 'aria-label': '테스트: 연습장이나 스테이지를 골라 바로 해 봐요' }, svg(pawIcon), '테스트');
    test.addEventListener('click', () => openTestSheet());

    this.name = h('span', { class: 'profile__name' }, RunState.nickname);
    this.el = screenShell(
      'home',
      settings,
      h(
        'header',
        { class: 'home__title' },
        h('h1', { class: 'logo' }, h('span', { class: 'logo__en' }, 'LIGHT', h('br'), 'DEFENSE'), h('span', { class: 'logo__ko' }, '라이트 디펜스')),
        h('p', { class: 'home__slogan' }, '작은 빛으로, 마을을 되찾아요.'),
      ),
      h('nav', { class: 'home__menu', 'aria-label': '메뉴' }, start, ranking, shop, tutorial, test),
      h(
        'div',
        { class: 'profile' },
        h('img', { class: 'profile__avatar', src: portraitUrl('lumi'), alt: '', width: 40, height: 40 }),
        this.name,
      ),
    );
  }

  /** 화면에 들어올 때마다 닉네임을 새로 읽는다 */
  show(): void {
    this.name.textContent = RunState.nickname;
  }
}
