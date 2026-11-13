// 이야기 소개 (2026-11-13 컨셉 시연판, 1·2절 세계관): 카드 4장, 한 장에 1~2문장, '다음'·'건너뛰기'.
// 처음 '게임하기'를 누르면 이야기 → 튜토리얼 판으로 이어지고(HomeScreen), 설정의 '이야기 다시 보기'로 다시 볼 수 있다.
// 그림은 기존 에셋: 홈 배경, 중앙 광원 토템(3칸 시트의 첫 칸 = 밝음), 루미 초상, 빛을 잃은 토리 초상.
// 길게 설명하지 않는다(1절 4축): 짧게, 언제든 건너뛸 수 있게.
import { h } from './dom';

interface Card {
  /** 그림 구성 */
  art: 'villages' | 'lost' | 'shard' | 'dawn';
  lines: string[];
}

const CARDS: Card[] = [
  { art: 'villages', lines: ['숲 너머에 빛의 마을과 어둠의 마을이 있었어요.', '서로 다른 밤을 살며 조용히 지냈지요.'] },
  { art: 'lost', lines: ['빛의 마을이 넓어지자, 터전을 잃을까 겁난 어둠의 주민들이 외곽 등불을 꺼뜨렸어요.', '빛을 잃은 친구들은 제 모습을 잃었어요. 루미의 단짝 토리도요.'] },
  { art: 'shard', lines: ['루미는 마을의 수호 토템, 중앙 광원의 파편에서 빛을 보내는 힘을 얻었어요.'] },
  { art: 'dawn', lines: ['아침이 올 때까지 중앙 광원을 지키고, 꺼진 등불을 다시 켜요.', '빛은 공격이 아니라, 잃어버린 모습을 되찾아 주는 힘이에요.'] },
];

export interface StoryOptions {
  /** 끝까지 보거나 건너뛰면 불린다 */
  onDone?: () => void;
  /** 마지막 카드의 버튼 이름 (기본 '알겠어요') */
  finalLabel?: string;
}

function artFor(kind: Card['art']): HTMLElement {
  const art = h('div', { class: `story__art story__art--${kind}`, 'aria-hidden': 'true' });
  if (kind === 'villages') {
    art.append(h('span', { class: 'story__orb story__orb--light' }), h('span', { class: 'story__orb story__orb--dark' }));
  } else if (kind === 'lost') {
    art.append(h('img', { class: 'story__portrait story__portrait--lost', src: 'assets/characters/portrait-tori-lost.png', alt: '', width: 192, height: 192 }));
  } else if (kind === 'shard') {
    art.append(h('span', { class: 'story__totem' }), h('img', { class: 'story__portrait story__portrait--small', src: 'assets/characters/portrait-lumi.png', alt: '', width: 192, height: 192 }));
  } else {
    art.append(h('img', { class: 'story__portrait', src: 'assets/characters/portrait-lumi.png', alt: '', width: 192, height: 192 }));
  }
  return art;
}

class StoryView {
  readonly el: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly dots: HTMLElement[];
  private readonly next: HTMLButtonElement;
  private readonly skip: HTMLButtonElement;
  private index = 0;
  private opts: StoryOptions = {};

  constructor() {
    this.stage = h('div', { class: 'story__stage', 'aria-live': 'polite' });
    this.dots = CARDS.map(() => h('span', { class: 'story__dot' }));
    this.skip = h('button', { class: 'pill pill--secondary story__skip', type: 'button' }, '건너뛰기');
    this.next = h('button', { class: 'pill pill--primary story__next', type: 'button' }, '다음');
    this.skip.addEventListener('click', () => this.close());
    this.next.addEventListener('click', () => this.advance());
    this.el = h(
      'section',
      { class: 'story', role: 'dialog', 'aria-modal': 'true', 'aria-label': '이야기', tabindex: -1 },
      h('div', { class: 'story__bg', 'aria-hidden': 'true' }),
      this.stage,
      h('div', { class: 'story__foot' }, h('div', { class: 'story__dots', 'aria-hidden': 'true' }, ...this.dots), h('div', { class: 'story__actions' }, this.skip, this.next)),
    );
    this.el.hidden = true;
    // 카드 아무 곳이나 눌러도 다음으로 (버튼 밖)
    this.stage.addEventListener('click', () => this.advance());
    window.addEventListener('keydown', (e) => {
      if (this.el.hidden) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.close();
      } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
        // 버튼에 초점이 있으면 버튼 기본 동작에 맡긴다
        if (document.activeElement instanceof HTMLButtonElement && this.el.contains(document.activeElement)) return;
        e.preventDefault();
        this.advance();
      }
    }, true);
  }

  open(opts: StoryOptions): void {
    this.opts = opts;
    this.index = 0;
    this.el.hidden = false;
    this.render();
    this.next.focus({ preventScroll: true });
  }

  private advance(): void {
    if (this.index >= CARDS.length - 1) {
      this.close();
      return;
    }
    this.index++;
    this.render();
  }

  private close(): void {
    if (this.el.hidden) return;
    this.el.hidden = true;
    const done = this.opts.onDone;
    this.opts = {};
    done?.();
  }

  private render(): void {
    const card = CARDS[this.index];
    this.el.dataset.card = card.art;
    const text = h('div', { class: 'story__text' }, ...card.lines.map((l) => h('p', {}, l)));
    const wrap = h('div', { class: 'story__card' }, artFor(card.art), text);
    this.stage.replaceChildren(wrap);
    this.dots.forEach((d, i) => d.classList.toggle('is-on', i === this.index));
    const last = this.index === CARDS.length - 1;
    this.next.textContent = last ? (this.opts.finalLabel ?? '알겠어요') : '다음';
    // 마지막 장에서는 건너뛸 것이 없다
    this.skip.hidden = last;
  }
}

let view: StoryView | null = null;

/** 이야기를 연다. #ui 레이어 맨 위에 붙는다 */
export function openStory(opts: StoryOptions = {}): void {
  if (!view) {
    view = new StoryView();
    (document.getElementById('ui') ?? document.body).append(view.el);
  }
  view.open(opts);
}
