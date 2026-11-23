// 선택 화면 (2026-11-12 새 기획 → 2026-11-13 컨셉 시연판): 등불지기(루미·토리·도토) + 챙겨 갈 아이템.
// 2026-11-23 밤 나들이 v3: 스테이지 4칸 대신 안내 칸 '오늘 밤 나들이' — 시작하면 새 런(밤 1부터, core/runFlow.ts).
// 배치는 UI Screen Sheet(아치 속 큰 초상 + 좌우 화살표 + 이름·한 줄 소개 + 아래 칸 + 주 버튼) 아래에 '밤을 골라요' 줄을 더했다.
//  - 친구 잠금은 진행 저장(Progress.isFriendOpen): 구출 스테이지에서 되찾으면 열린다. 잠긴 동안은 초상 실루엣(짙은 면색) + 물음표 (2026-11-20)
//  - 챙겨 갈 아이템은 런에서 아침을 맞은 최고 밤 수로 열린다(Progress.bestNight, items.json carryUnlock 'night-n')
//  - 구석의 '시연: 모두 열기'(팀 시연용)는 Progress.unlockAll
import { bus } from '../../core/events';
import { Progress } from '../../core/Progress';
import { RunState } from '../../core/RunState';
import { GameData, type CharacterDef, type ItemDef } from '../../data';
import { startNewRun } from '../../core/runFlow';
import { nightObject, hasBatchim } from '../runText';
import { loadSettings, saveSettings } from '../../core/Settings';
import { carryItemIds, carryOrDefault, isUnlocked, unlockNight } from '../../systems/unlocks';
import { h, svg } from '../dom';
import { chevronLeftIcon, chevronRightIcon, lockIcon, moonIcon, playIcon } from '../icons';
import { lockedShade, portraitUrl, screenBar, screenShell, setLockedShade } from './common';
import { startTutorial } from '../Story';

/** 특성 이름과 짧은 설명 (제안: 새 기획에 특성이 없어 기존 이름을 이어 씀) */
const TRAIT: Record<CharacterDef['trait'], string> = {
  nightEyes: '밤눈 · 주변을 조금 더 넓게 밝혀요',
  quickFeet: '빠른 발 · 더 빨리 달리고 등불을 금세 켜요',
  cheekPouch: '볼주머니 · 아이템 효과 1.5배',
};

/** 잠긴 친구 안내. 잠긴 동안은 초상 실루엣 + 물음표를 보여 준다 */
const LOCKED_LINE = '잃어버린 친구예요. 구출하면 함께해요';
const isLocked = (c: CharacterDef) => !Progress.isFriendOpen(c.id);

/** 받침이 있으면 '을', 없으면 '를' */
function objectJosa(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? '을' : '를';
}

export class SelectScreen {
  readonly el: HTMLElement;
  private index = 0;
  private readonly portrait: HTMLImageElement;
  /** 잠긴 친구일 때 초상 대신 보이는 실루엣 + 물음표 */
  private readonly shade: HTMLElement;
  private readonly name: HTMLElement;
  private readonly nameEn: HTMLElement;
  private readonly blurb: HTMLElement;
  private readonly stats: HTMLElement;
  private readonly lock: HTMLElement;
  private readonly roster: HTMLButtonElement[];
  private readonly carry: { id: string; def: ItemDef; el: HTMLButtonElement }[];
  private readonly carryRow: HTMLElement;
  private readonly carryLine: HTMLElement;
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
    this.shade = lockedShade('select__portrait select__shade');
    this.name = h('span');
    this.nameEn = h('small');
    this.blurb = h('p', { class: 'select__blurb' });
    this.stats = h('p', { class: 'select__stats' });
    this.lock = h('p', { class: 'select__lock' });

    this.roster = chars.map((_c, i) => {
      const b = h('button', { class: 'roster-card', type: 'button' }, h('img', { alt: '', width: 64, height: 64 }), lockedShade(), h('span', { class: 'roster-card__lock' }, svg(lockIcon)));
      b.addEventListener('click', () => this.view(i));
      return b;
    });

    // 판 시작 전에 챙겨 갈 아이템 (2026-11-18): 빛의 부적은 늘 함께, 하나 더 고른다. 밤을 지나면 하나씩 열린다
    this.carry = carryItemIds(GameData.items).map((id) => {
      const def = GameData.items.find((i) => i.id === id) as ItemDef;
      const el = h(
        'button',
        { class: 'carry-item', type: 'button', 'aria-pressed': 'false' },
        h('span', { class: 'carry-item__icon' }, h('img', { src: `assets/items/item-${id}.png`, alt: '', width: 40, height: 40 })),
        h('span', { class: 'carry-item__name' }, def.name),
        h('span', { class: 'carry-item__lock' }, svg(lockIcon)),
      ) as HTMLButtonElement;
      el.addEventListener('click', () => this.pickCarry(id));
      return { id, def, el };
    });
    this.carryRow = h('div', { class: 'select__carry', role: 'group', 'aria-label': '챙겨 갈 아이템' }, ...this.carry.map((c) => c.el));
    this.carryLine = h('p', { class: 'select__carry-line' });

    this.goLabel = h('span', {}, '빛을 밝혀요');
    this.go = h('button', { class: 'pill pill--primary select__go', type: 'button' }, svg(playIcon), this.goLabel);
    this.go.addEventListener('click', () => this.start());

    // 팀 시연용: 튜토리얼·스테이지·친구를 모두 연다 (눈에 덜 띄게 구석에)
    this.demo = h('button', { class: 'select__demo', type: 'button' }, '시연: 모두 열기');
    this.demo.addEventListener('click', () => Progress.unlockAll());

    this.el = screenShell(
      'select',
      screenBar('등불지기'),
      h('div', { class: 'select__stage' }, prev, h('div', { class: 'select__arch' }, this.portrait, this.shade), next),
      h('h3', { class: 'select__name' }, this.name, ' ', this.nameEn),
      this.blurb,
      this.stats,
      this.lock,
      h('div', { class: 'select__roster', role: 'group', 'aria-label': '등불지기' }, ...this.roster),
      h('h4', { class: 'select__label select__label--carry' }, '챙겨 갈 아이템'),
      this.carryRow,
      this.carryLine,
      h('h4', { class: 'select__label select__label--run' }, svg(moonIcon), '오늘 밤 나들이'),
      h('p', { class: 'select__stage-line select__run-line' }, '밤 1 · 빛의 마을부터 시작해요. 아침마다 다음 밤으로 갈지, 집으로 돌아갈지 고를 수 있어요. 하트 3개는 밤들 사이에 이어져요.'),
      this.go,
      this.demo,
    );

    bus.on('progress:change', () => this.render());
  }

  show(): void {
    // 직전 선택을 기본값으로
    this.index = Math.max(0, GameData.characters.findIndex((c) => c.id === RunState.characterId));
    this.render();
  }

  private render(): void {
    this.view(this.index);
    this.renderCarry();
    this.demo.disabled = Progress.data.demo;
    this.demo.textContent = Progress.data.demo ? '시연: 모두 열렸어요' : '시연: 모두 열기';
  }

  private view(i: number): void {
    const chars = GameData.characters;
    this.index = (i + chars.length) % chars.length;
    const c = chars[this.index];
    const locked = isLocked(c);
    this.portrait.src = portraitUrl(c.id);
    this.portrait.hidden = locked;
    this.shade.hidden = !locked;
    if (locked) setLockedShade(this.shade, c.id);
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
      if (img) {
        img.src = portraitUrl(def.id);
        img.hidden = off;
      }
      const shade = b.querySelector<HTMLElement>('.locked-shade');
      if (shade) {
        shade.hidden = !off;
        if (off) setLockedShade(shade, def.id);
      }
      b.classList.toggle('is-locked', off);
      b.classList.toggle('is-current', k === this.index);
      b.setAttribute('aria-label', `${def.name}${off ? ' (잠김)' : ''}`);
    });
    this.updateGo();
  }

  /** 챙겨 갈 아이템을 고른다 (다시 누르면 안 챙김). 잠긴 것은 안내만 */
  private pickCarry(id: string): void {
    const c = this.carry.find((x) => x.id === id);
    if (!c || !isUnlocked(String(c.def.carryUnlock), Progress.data.bestNight, Progress.data.demo)) {
      if (c) this.carryLine.textContent = unlockLine(String(c.def.carryUnlock), c.def.name);
      return;
    }
    const s = loadSettings();
    saveSettings({ ...s, carryItem: s.carryItem === id ? '' : id });
    this.renderCarry();
  }

  private renderCarry(): void {
    const { bestNight, demo } = Progress.data;
    const chosen = carryOrDefault(loadSettings().carryItem, GameData.items, bestNight, demo);
    for (const c of this.carry) {
      const open = isUnlocked(String(c.def.carryUnlock), bestNight, demo);
      c.el.classList.toggle('is-locked', !open);
      c.el.classList.toggle('is-current', c.id === chosen);
      c.el.setAttribute('aria-pressed', String(c.id === chosen));
      c.el.setAttribute('aria-label', `${c.def.name}${open ? '' : ' (잠김)'}`);
    }
    const name = GameData.items.find((i) => i.id === chosen)?.name;
    this.carryLine.textContent = name ? `빛의 부적과 ${name}${objectJosa(name)} 챙겨 가요` : '빛의 부적만 챙겨 가요';
  }

  /** 주 버튼: 고른 친구가 열려 있어야 시작. 아직 처음 밤(튜토리얼)을 안 했으면 그리로 안내 */
  private updateGo(): void {
    const charLocked = isLocked(GameData.characters[this.index]);
    this.go.disabled = charLocked;
    this.goLabel.textContent = charLocked ? '아직 잠겨 있어요' : !Progress.tutorialDone ? '처음 밤부터 해요' : '빛을 밝혀요';
  }

  private start(): void {
    const def = GameData.characters[this.index];
    if (isLocked(def)) return;
    RunState.characterId = def.id;
    // 아직 처음 밤(튜토리얼)을 안 했으면 튜토리얼로 — 간추린 이야기부터 (2026-11-13 라이언)
    if (!Progress.tutorialDone) return startTutorial();
    // 새 런: 밤 1부터 (저장된 런이 있었으면 새 런으로 바뀜)
    startNewRun(def.id);
  }
}

/** 잠긴 아이템 안내: '밤 4를 지나면 별 목걸이가 열려요' */
export function unlockLine(unlock: string, name: string): string {
  const n = unlockNight(unlock);
  if (!n) return '';
  return `${nightObject(n)} 지나면 ${name}${hasBatchim(name) ? '이' : '가'} 열려요`;
}
