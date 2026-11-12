// 캐릭터 선택 (2026-11-12 새 기획): 루미(기본)·토리(토끼)·도토(다람쥐). 토리·도토는 잃어버린 친구라 구출 스테이지에서 구하면 열린다(Phase 5).
// 배치는 UI Screen Sheet(아치 속 큰 초상 + 좌우 화살표 + 이름·한 줄 소개 + 아래 칸 + 주 버튼). 장착물은 없어지고 아이템이 대신한다(Phase 4).
import { bus } from '../../core/events';
import { RunState } from '../../core/RunState';
import { GameData, type CharacterDef } from '../../data';
import { h, svg } from '../dom';
import { chevronLeftIcon, chevronRightIcon, lockIcon, playIcon } from '../icons';
import { portraitUrl, screenBar, screenShell } from './common';

/** 특성 이름과 짧은 설명 (제안: 새 기획에 특성이 없어 기존 이름을 이어 씀) */
const TRAIT: Record<CharacterDef['trait'], string> = {
  nightEyes: '밤눈 · 주변을 조금 더 넓게 밝혀요',
  quickPaw: '빠른 손 · 빛을 더 빨리 다시 보내요',
  cheekPouch: '볼주머니 · 아이템 효과 1.5배',
};

/** 잠긴 친구 안내 (진행도 판정은 Phase 5) */
const LOCKED_LINE = '잃어버린 친구예요. 구출하면 함께해요';
const isLocked = (c: CharacterDef) => c.unlock !== null;

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
      const locked = isLocked(c);
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

    this.goLabel = h('span', {}, '빛을 밝혀요');
    this.go = h('button', { class: 'pill pill--primary select__go', type: 'button' }, svg(playIcon), this.goLabel);
    this.go.addEventListener('click', () => {
      const def = chars[this.index];
      if (isLocked(def)) return;
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
      h('p', { class: 'select__note' }, '아이템은 곧 챙겨 갈 수 있어요'),
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
    const locked = isLocked(c);
    this.portrait.src = portraitUrl(c.id);
    this.portrait.classList.toggle('is-locked', locked);
    this.name.textContent = c.name;
    this.nameEn.textContent = c.nameEn;
    this.blurb.textContent = c.blurb;
    this.stats.textContent = `사거리 ${c.lightRange} · 위력 ${c.lightPower} · ${TRAIT[c.trait]}`;
    this.lock.textContent = locked ? LOCKED_LINE : '';
    this.lock.hidden = !locked;
    this.roster.forEach((b, k) => b.classList.toggle('is-current', k === this.index));
    this.go.disabled = locked;
    this.goLabel.textContent = locked ? '아직 잠겨 있어요' : '빛을 밝혀요';
  }
}
