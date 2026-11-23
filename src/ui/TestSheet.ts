// 테스트 판 고르기 (2026-11-14 라이언: 홈 '테스트' → 모든 스테이지 선택지 중 하나를 골라 바로 플레이).
//  최종 구성(2026-11-14 라이언 정정):
//  - 트라이얼('trial'): 시작 자리 둘레에 적들이 제자리에 고정된 연습장(브롤스타즈 훈련 동굴 참고 — 시작 지점 네 모서리의 표적,
//    위쪽의 큰 표적, 맨 위의 작은 무리, 공격하는 표적). 빛에 밀리지 않고,
//    공격할 수 있는 몹은 루미가 아주 가까우면 제자리에서 들이받는다(맞는 상황도 확인). 쓰러지면 잠시 뒤 같은 자리에 다시. 끝나지 않는다.
//  - 각 스테이지(처음 밤·1~4스테이지): 실제 체험판 — 정식 판과 똑같이 끝이 있다(아침·하트·광원). 잠금과 상관없이 바로 시작
//    (튜토리얼도 이야기 카드 없이 바로 판 — 테스트이므로).
//  - 테스트 판은 진행(깬 스테이지·튜토리얼·구출한 친구)과 지난 밤들에 남지 않는다(core/Progress, ResultSheet, 제안).
//  - 트라이얼 줄에 루미·토리·도토 칸 (2026-11-18 라이언): 누른 등불지기로 바로 시작. 잠긴 친구도 고를 수 있다(테스트라서).
//    고른 등불지기는 그 테스트 판에서만 쓰이고 선택 화면의 등불지기는 그대로(RunState.trialCharacterId).
//  - 2026-11-23 밤 나들이 v3: 각 스테이지 체험 → '밤 n 체험'(nights.json testNights 1·3·6·9 — 그 밤의 규칙 그대로, 끝이 있음). 맵 고르기는 격자 맵(Phase 10)부터.
//  - 모양은 선택 화면의 스테이지 카드(.stage-card)를 그대로 쓴다. 뒤로가기·ESC·바깥 누르기로 닫힌다(HistoryNav).
import { bus } from '../core/events';
import { NIGHT_STAGE } from '../core/RunState';
import { GameData, stageById, type CharacterId } from '../data';
import { rulesForNight } from '../systems/nightRules';
import { h, svg } from './dom';
import { lampIcon, moonIcon, pawIcon, tutorialIcon } from './icons';
import { portraitUrl } from './screens/common';

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
    // 튜토리얼 + 밤 n 체험 (그 밤의 구간·등불 수 — 친구·노월은 확률이라 표시하지 않음)
    const tutorial = stageById('tutorial');
    const tutorialCard = h(
      'button',
      { class: 'stage-card', type: 'button', 'data-theme': tutorial.theme, 'aria-label': `${tutorial.name} 테스트` },
      h('span', { class: 'stage-card__num' }, '처음'),
      h('span', { class: 'stage-card__name' }, tutorial.name),
      h('span', { class: 'stage-card__meta' }, svg(tutorialIcon), '튜토리얼'),
    );
    tutorialCard.addEventListener('click', () => this.start('tutorial'));
    const probe = { seed: 1, keeperId: 'lumi' as CharacterId, friendNights: {}, witchSeen: false, lastMapId: null, mercy: 0, banish: 0 };
    const nightCards = GameData.nights.testNights.map((n) => {
      const def = rulesForNight(n, probe);
      const card = h(
        'button',
        { class: 'stage-card', type: 'button', 'data-theme': def.theme, 'aria-label': `밤 ${n} 체험 — ${def.bandName}, 등불 ${def.stations}` },
        h('span', { class: 'stage-card__num' }, String(n)),
        h('span', { class: 'stage-card__name' }, `밤 ${n} 체험`),
        h('span', { class: 'stage-card__meta' }, svg(lampIcon), `등불 ${def.stations}`),
        h('span', { class: 'stage-card__tag stage-card__tag--none' }, svg(moonIcon), def.bandName),
      );
      card.addEventListener('click', () => this.start(NIGHT_STAGE, undefined, n));
      return card;
    });
    const cards = [tutorialCard, ...nightCards];

    // 트라이얼: 맨 위 한 줄 — 왼쪽 소개, 오른쪽 등불지기 셋(누르면 그 등불지기로 바로 시작, 2026-11-18 라이언)
    const trialDef = stageById('trial');
    const who = GameData.characters.map((c) => {
      const b = h(
        'button',
        { class: 'test-who', type: 'button', 'aria-label': `${c.name}로 트라이얼 시작` },
        h('span', { class: 'test-who__face' }, h('img', { src: portraitUrl(c.id), alt: '', width: 64, height: 64 })),
        h('span', { class: 'test-who__name' }, c.name),
      );
      b.addEventListener('click', () => this.start('trial', c.id));
      return b;
    });
    const trial = h(
      'div',
      { class: 'stage-card test-trial', 'data-theme': trialDef.theme, role: 'group', 'aria-label': `${trialDef.name}: 시작 자리 둘레에 고정된 적으로 연습, 끝없음. 등불지기를 골라 시작` },
      h(
        'div',
        { class: 'test-trial__info' },
        h('span', { class: 'stage-card__num' }, '연습'),
        h('span', { class: 'stage-card__name' }, trialDef.name),
        h('span', { class: 'stage-card__meta' }, svg(pawIcon), '시작 자리 둘레에 고정된 적 · 끝없음'),
        h('span', { class: 'test-trial__hint' }, '누구로 해 볼까요? 잠긴 친구도 돼요'),
      ),
      h('div', { class: 'test-trial__who' }, ...who),
    );

    const close = h('button', { class: 'pill pill--secondary', type: 'button' }, '닫기');
    close.addEventListener('click', () => this.toggle(false));
    this.panel = h(
      'div',
      { class: 'sheet__panel', tabindex: -1 },
      h('h2', { class: 'sheet__title', id: 'test-title' }, '테스트할 밤을 골라요'),
      h('p', { class: 'test-sheet__note' }, '바로 시작해요 · 진행과 지난 밤들에는 남지 않아요'),
      h('div', { class: 'test-sheet__trial' }, trial),
      h('p', { class: 'test-sheet__group' }, '밤 n 체험 — 그 밤의 규칙 그대로, 끝이 있어요'),
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

  private start(stageId: string, characterId?: CharacterId, night?: number): void {
    this.toggle(false);
    bus.emit('ui:start-test', { stageId, characterId, night });
  }

  toggle(open: boolean): void {
    this.el.hidden = !open;
    if (open) this.panel.focus({ preventScroll: true });
  }
}
