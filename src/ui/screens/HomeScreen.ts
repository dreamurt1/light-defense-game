// 홈(엔트리): UI Screen Sheet의 배치(위 로고, 오른쪽 메뉴, 왼쪽 아래 프로필, 뒤에 등불 곁의 루미) + 기획서의 메뉴 이름.
// 메뉴 (2026-11-12 새 기획): `게임하기`(→ 캐릭터 선택) · `지난 밤들`(→ 랭킹) · 상점 · ⚙(설정). 테스트(적 없는 판)는 개발 모드에서만.
// 튜토리얼 스테이지·스토리 소개는 Phase 6. 시트의 재화·레벨은 기획에 없어 넣지 않는다.
import { bus } from '../../core/events';
import { RunState } from '../../core/RunState';
import { h, svg } from '../dom';
import { gearIcon, pawIcon, playIcon, podiumIcon, shopIcon } from '../icons';
import { portraitUrl, screenShell } from './common';

export class HomeScreen {
  readonly el: HTMLElement;
  private readonly name: HTMLElement;

  constructor() {
    const settings = h('button', { class: 'icon-button home__settings', type: 'button', 'aria-label': '설정' }, svg(gearIcon));
    settings.addEventListener('click', () => bus.emit('ui:open-settings'));

    const start = h('button', { class: 'pill pill--primary', type: 'button' }, svg(playIcon), '게임하기');
    start.addEventListener('click', () => bus.emit('ui:navigate', { to: 'select' }));
    const ranking = h('button', { class: 'pill pill--secondary', type: 'button' }, svg(podiumIcon), '지난 밤들');
    ranking.addEventListener('click', () => bus.emit('ui:navigate', { to: 'ranking' }));
    const shop = h('button', { class: 'pill pill--secondary', type: 'button' }, svg(shopIcon), '상점');
    shop.addEventListener('click', () => bus.emit('ui:navigate', { to: 'shop' }));
    // 2026-11-06 라이언 지시: 같은 마을을 적 없이 걸어 보는 판. 2026-11-12 새 기획: 정식 배포 판에서는 숨김(개발 모드만)
    const test = h('button', { class: 'pill pill--secondary home__test', type: 'button' }, svg(pawIcon), '테스트');
    test.addEventListener('click', () => bus.emit('ui:start-test'));

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
      h('nav', { class: 'home__menu', 'aria-label': '메뉴' }, start, ranking, shop, ...(import.meta.env.DEV ? [test] : [])),
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
