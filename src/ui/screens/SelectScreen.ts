// 캐릭터·장착물 선택: 기획서대로 한 화면에서 주인공과 장착물을 고른다(두 번째 탭).
// 배치는 UI Screen Sheet(아치 속 큰 초상 + 좌우 화살표 + 이름·한 줄 소개 + 아래 5칸 + 주 버튼).
// 해금·장착물 동작은 M3: 지금은 루미만 열려 있고 장착물은 보여 주기만 한다.
import { bus } from '../../core/events';
import { RunState } from '../../core/RunState';
import { GameData, type CharacterDef, type CharacterId } from '../../data';
import { h, svg } from '../dom';
import { chevronLeftIcon, chevronRightIcon, lockIcon, playIcon } from '../icons';
import { portraitUrl, screenBar, screenShell } from './common';

/** 기획서의 특성 이름과 짧은 설명 */
const TRAIT: Record<CharacterDef['trait'], string> = {
  nightEyes: '밤눈 · 숨은 호오가 보여요',
  quickPaw: '빠른 손 · 빛을 더 빨리 다시 보내요',
  cheekPouch: '볼주머니 · 아이템 효과 1.5배',
  warmth: '온기 · 등불이 조금씩 되살아나요',
  bark: '짖음 · 이웃을 두 배로 멀리 밀어요',
};

/** 기획서의 해금 조건 (M3에서 진행도로 판정) */
const UNLOCK: Record<CharacterId, string | null> = {
  lumi: null,
  tori: '3판 플레이',
  doto: '아이템 50개 모으기',
  baru: '누적 10분 버티기',
  mong: '콤보 30 달성',
};

const GEAR_UNLOCK: Record<string, string> = {
  slow_dust: '기본',
  wind_shoes: '3판 플레이',
  warm_scarf: '누적 10분',
  star_necklace: '콤보 20',
};

export class SelectScreen {
  readonly el: HTMLElement;
  private index = 0;
  private readonly portrait: HTMLImageElement;
  private readonly name: HTMLElement;
  private readonly nameEn: HTMLElement;
  private readonly blurb: HTMLElement;
  private readonly stats: HTMLElement;
  private readonly lock: HTMLElement;
  private readonly roster: HTMLButtonElement[];
  private readonly go: HTMLButtonElement;
  private readonly goLabel: HTMLElement;

  constructor() {
    const chars = GameData.characters;
    const prev = h('button', { class: 'icon-button select__arrow', type: 'button', 'aria-label': '이전 등불지기' }, svg(chevronLeftIcon));
    prev.addEventListener('click', () => this.view(this.index - 1));
    const next = h('button', { class: 'icon-button select__arrow', type: 'button', 'aria-label': '다음 등불지기' }, svg(chevronRightIcon));
    next.addEventListener('click', () => this.view(this.index + 1));

    this.portrait = h('img', { class: 'select__portrait', alt: '', width: 192, height: 192 });
    this.name = h('span');
    this.nameEn = h('small');
    this.blurb = h('p', { class: 'select__blurb' });
    this.stats = h('p', { class: 'select__stats' });
    this.lock = h('p', { class: 'select__lock' });

    this.roster = chars.map((c, i) => {
      const locked = UNLOCK[c.id] !== null;
      const b = h(
        'button',
        { class: 'roster-card', type: 'button', 'aria-label': `${c.name}${locked ? ' (잠김)' : ''}` },
        h('img', { src: portraitUrl(c.id), alt: '', width: 64, height: 64 }),
        locked ? h('span', { class: 'roster-card__lock' }, svg(lockIcon)) : '',
      );
      if (locked) b.classList.add('is-locked');
      b.addEventListener('click', () => this.view(i));
      return b;
    });

    const gear = GameData.equipment.map((e) =>
      h(
        'li',
        // 장착물 고르기는 M3: 지금은 기본 장착물(느림 가루)이 끼워져 있다고 보여 준다
        { class: `gear-card${e.id === (RunState.equipmentId ?? 'slow_dust') ? ' is-current' : ''}`, 'aria-disabled': 'true' },
        h('strong', {}, e.name),
        h('span', {}, `${e.giver} · ${GEAR_UNLOCK[e.id] ?? ''}`),
      ),
    );

    this.goLabel = h('span', {}, '등불을 켜요');
    this.go = h('button', { class: 'pill pill--primary select__go', type: 'button' }, svg(playIcon), this.goLabel);
    this.go.addEventListener('click', () => {
      const def = chars[this.index];
      if (UNLOCK[def.id] !== null) return;
      RunState.characterId = def.id;
      bus.emit('ui:start-run');
    });

    this.el = screenShell(
      'select',
      screenBar('등불지기'),
      h('div', { class: 'select__stage' }, prev, h('div', { class: 'select__arch' }, this.portrait), next),
      h('h3', { class: 'select__name' }, this.name, ' ', this.nameEn),
      this.blurb,
      this.stats,
      this.lock,
      h('div', { class: 'select__roster', role: 'group', 'aria-label': '등불지기' }, ...this.roster),
      h('h4', { class: 'select__subhead' }, '장착물'),
      h('ul', { class: 'select__gear' }, ...gear),
      h('p', { class: 'select__note' }, '장착물은 곧 고를 수 있어요'),
      this.go,
    );
  }

  show(): void {
    // 직전 선택을 기본값으로
    this.view(Math.max(0, GameData.characters.findIndex((c) => c.id === RunState.characterId)));
  }

  private view(i: number): void {
    const chars = GameData.characters;
    this.index = (i + chars.length) % chars.length;
    const c = chars[this.index];
    const unlock = UNLOCK[c.id];
    this.portrait.src = portraitUrl(c.id);
    this.portrait.classList.toggle('is-locked', unlock !== null);
    this.name.textContent = c.name;
    this.nameEn.textContent = c.nameEn;
    this.blurb.textContent = c.blurb;
    this.stats.textContent = `사거리 ${c.lightRange} · 위력 ${c.lightPower} · ${TRAIT[c.trait]}`;
    this.lock.textContent = unlock ? `${unlock}하면 열려요` : '';
    this.lock.hidden = unlock === null;
    this.roster.forEach((b, k) => b.classList.toggle('is-current', k === this.index));
    this.go.disabled = unlock !== null;
    this.goLabel.textContent = unlock ? '아직 잠겨 있어요' : '등불을 켜요';
  }
}
