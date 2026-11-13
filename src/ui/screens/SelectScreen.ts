// 선택 화면 (2026-11-12 새 기획 → 2026-11-13 컨셉 시연판): 등불지기(루미·토리·도토) + 스테이지(밤 4개).
// 배치는 UI Screen Sheet(아치 속 큰 초상 + 좌우 화살표 + 이름·한 줄 소개 + 아래 칸 + 주 버튼) 아래에 '밤을 골라요' 줄을 더했다.
//  - 친구 잠금은 진행 저장(Progress.isFriendOpen): 구출 스테이지에서 되찾으면 열린다. 잠긴 동안은 빛을 잃은 모습 초상
//  - 스테이지는 앞 밤을 지나면 열린다(Progress.isStageOpen). 처음 들어오면 Progress.nextStage가 골라져 있다
//  - 구석의 '시연: 모두 열기'(팀 시연용)는 Progress.unlockAll
import { bus } from '../../core/events';
import { Progress } from '../../core/Progress';
import { RunState } from '../../core/RunState';
import { GameData, STAGE_ORDER, characterById, enemyById, stageById, type CharacterDef, type StageDef } from '../../data';
import { h, svg } from '../dom';
import { badgeStarIcon, chevronLeftIcon, chevronRightIcon, lampIcon, lockIcon, moonIcon, pawIcon, playIcon } from '../icons';
import { lostPortraitUrl, portraitUrl, screenBar, screenShell } from './common';
import { startTutorial } from '../Story';

/** 특성 이름과 짧은 설명 (제안: 새 기획에 특성이 없어 기존 이름을 이어 씀) */
const TRAIT: Record<CharacterDef['trait'], string> = {
  nightEyes: '밤눈 · 주변을 조금 더 넓게 밝혀요',
  quickPaw: '빠른 손 · 빛을 더 빨리 다시 보내요',
  cheekPouch: '볼주머니 · 아이템 효과 1.5배',
};

/** 잠긴 친구 안내. 잠긴 동안은 빛을 잃은 모습 초상을 보여 준다 */
const LOCKED_LINE = '잃어버린 친구예요. 구출하면 함께해요';
const isLocked = (c: CharacterDef) => !Progress.isFriendOpen(c.id);

/** 받침이 있으면 '을', 없으면 '를' */
function objectJosa(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? '을' : '를';
}

/** 이 스테이지에서 되찾는 친구 */
function rescueFriend(s: StageDef): CharacterDef | null {
  const id = s.rescue ? enemyById(s.rescue.enemyId).friend : undefined;
  return id ? characterById(id) : null;
}

interface StageCard {
  def: StageDef;
  el: HTMLButtonElement;
}

export class SelectScreen {
  readonly el: HTMLElement;
  private index = 0;
  private stageId: string = STAGE_ORDER[0];
  /** 한 번 보여 준 뒤에는 직전 스테이지(RunState.stageId)를 기본으로 */
  private shownOnce = false;
  private readonly portrait: HTMLImageElement;
  private readonly name: HTMLElement;
  private readonly nameEn: HTMLElement;
  private readonly blurb: HTMLElement;
  private readonly stats: HTMLElement;
  private readonly lock: HTMLElement;
  private readonly roster: HTMLButtonElement[];
  private readonly stages: StageCard[];
  private readonly stageLine: HTMLElement;
  private readonly go: HTMLButtonElement;
  private readonly goLabel: HTMLElement;
  private readonly demo: HTMLButtonElement;

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

    this.roster = chars.map((_c, i) => {
      const b = h('button', { class: 'roster-card', type: 'button' }, h('img', { alt: '', width: 64, height: 64 }), h('span', { class: 'roster-card__lock' }, svg(lockIcon)));
      b.addEventListener('click', () => this.view(i));
      return b;
    });

    this.stages = STAGE_ORDER.map((id, i) => {
      const def = stageById(id);
      const friend = rescueFriend(def);
      const tag = def.boss
        ? h('span', { class: 'stage-card__tag stage-card__tag--boss' }, svg(moonIcon), enemyById(def.boss.enemyId).name)
        : friend
          ? h('span', { class: 'stage-card__tag stage-card__tag--friend' }, svg(pawIcon), friend.name)
          : h('span', { class: 'stage-card__tag stage-card__tag--none' });
      const el = h(
        'button',
        { class: 'stage-card', type: 'button', 'data-theme': def.theme },
        h('span', { class: 'stage-card__num' }, String(i + 1)),
        h('span', { class: 'stage-card__name' }, def.name),
        h('span', { class: 'stage-card__meta' }, svg(lampIcon), `등불 ${def.stations}`),
        tag,
        h('span', { class: 'stage-card__badge stage-card__badge--clear' }, svg(badgeStarIcon)),
        h('span', { class: 'stage-card__badge stage-card__badge--lock' }, svg(lockIcon)),
      );
      el.addEventListener('click', () => this.pickStage(id));
      return { def, el };
    });
    this.stageLine = h('p', { class: 'select__stage-line' });

    this.goLabel = h('span', {}, '빛을 밝혀요');
    this.go = h('button', { class: 'pill pill--primary select__go', type: 'button' }, svg(playIcon), this.goLabel);
    this.go.addEventListener('click', () => this.start());

    // 팀 시연용: 튜토리얼·스테이지·친구를 모두 연다 (눈에 덜 띄게 구석에)
    this.demo = h('button', { class: 'select__demo', type: 'button' }, '시연: 모두 열기');
    this.demo.addEventListener('click', () => Progress.unlockAll());

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
      h('h4', { class: 'select__label' }, '밤을 골라요'),
      h('div', { class: 'select__nights', role: 'group', 'aria-label': '밤' }, ...this.stages.map((s) => s.el)),
      this.stageLine,
      this.go,
      this.demo,
    );

    bus.on('progress:change', () => this.render());
  }

  show(): void {
    // 직전 선택을 기본값으로
    this.index = Math.max(0, GameData.characters.findIndex((c) => c.id === RunState.characterId));
    const prev = RunState.stageId;
    const order = STAGE_ORDER as readonly string[];
    this.stageId = this.shownOnce && order.includes(prev) && Progress.isStageOpen(prev) ? prev : defaultStage();
    this.shownOnce = true;
    this.render();
  }

  private render(): void {
    this.view(this.index);
    this.pickStage(this.stageId);
    this.demo.disabled = Progress.data.demo;
    this.demo.textContent = Progress.data.demo ? '시연: 모두 열렸어요' : '시연: 모두 열기';
  }

  private view(i: number): void {
    const chars = GameData.characters;
    this.index = (i + chars.length) % chars.length;
    const c = chars[this.index];
    const locked = isLocked(c);
    this.portrait.src = locked ? lostPortraitUrl(c.id) : portraitUrl(c.id);
    this.portrait.classList.toggle('is-locked', locked);
    this.name.textContent = c.name;
    this.nameEn.textContent = c.nameEn;
    this.blurb.textContent = c.blurb;
    this.stats.textContent = `사거리 ${c.lightRange} · 위력 ${c.lightPower} · ${TRAIT[c.trait]}`;
    this.lock.textContent = locked ? LOCKED_LINE : '';
    this.lock.hidden = !locked;
    this.roster.forEach((b, k) => {
      const def = chars[k];
      const off = isLocked(def);
      const img = b.querySelector('img');
      if (img) img.src = off ? lostPortraitUrl(def.id) : portraitUrl(def.id);
      b.classList.toggle('is-locked', off);
      b.classList.toggle('is-current', k === this.index);
      b.setAttribute('aria-label', `${def.name}${off ? ' (잠김)' : ''}`);
    });
    this.updateGo();
  }

  private pickStage(id: string): void {
    this.stageId = id;
    const cleared = Progress.data.cleared;
    for (const s of this.stages) {
      const open = Progress.isStageOpen(s.def.id);
      const done = cleared.includes(s.def.id);
      s.el.classList.toggle('is-locked', !open);
      s.el.classList.toggle('is-cleared', done && open);
      s.el.classList.toggle('is-current', s.def.id === id);
      s.el.setAttribute('aria-pressed', String(s.def.id === id));
      s.el.setAttribute('aria-label', `${s.def.name}, 등불 ${s.def.stations}개${!open ? ' (잠김)' : done ? ' (지나 온 밤)' : ''}`);
    }
    const def = stageById(id);
    if (Progress.isStageOpen(id)) {
      this.stageLine.textContent = def.blurb ?? '';
    } else {
      const i = (STAGE_ORDER as readonly string[]).indexOf(id);
      const before = i <= 0 ? stageById('tutorial').name : stageById(STAGE_ORDER[i - 1]).name;
      this.stageLine.textContent = `${before}${objectJosa(before)} 지나면 열려요`;
    }
    this.stageLine.classList.toggle('is-locked', !Progress.isStageOpen(id));
    this.updateGo();
  }

  /** 주 버튼: 친구·스테이지가 모두 열려 있어야 시작. 아직 처음 밤(튜토리얼)을 안 했으면 그리로 안내 */
  private updateGo(): void {
    const charLocked = isLocked(GameData.characters[this.index]);
    const stageOpen = Progress.isStageOpen(this.stageId);
    const toTutorial = !stageOpen && !Progress.tutorialDone && this.stageId === STAGE_ORDER[0];
    this.go.disabled = charLocked || (!stageOpen && !toTutorial);
    this.goLabel.textContent = charLocked || (!stageOpen && !toTutorial) ? '아직 잠겨 있어요' : toTutorial ? '처음 밤부터 해요' : '빛을 밝혀요';
  }

  private start(): void {
    const def = GameData.characters[this.index];
    if (isLocked(def)) return;
    const open = Progress.isStageOpen(this.stageId);
    if (!open && Progress.tutorialDone) return;
    RunState.characterId = def.id;
    // 아직 처음 밤(튜토리얼)을 안 했으면 튜토리얼로 — 간추린 이야기부터 (2026-11-13 라이언)
    if (!open) return startTutorial();
    RunState.stageId = this.stageId;
    bus.emit('ui:start-run');
  }
}

/** 처음 고르는 밤: 아직 안 지난 가장 앞 밤(열려 있으면), 아니면 열린 밤 중 마지막 */
function defaultStage(): string {
  const next = Progress.nextStage;
  if (Progress.isStageOpen(next)) return next;
  const open = STAGE_ORDER.filter((s) => Progress.isStageOpen(s));
  return open[open.length - 1] ?? STAGE_ORDER[0];
}
