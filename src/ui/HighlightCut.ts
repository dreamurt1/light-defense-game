// 그림 컷 (2026-11-27 13:00 기획 세션·라이언 확정 — 하이라이트 컷 ①): 큰 사건의 아침, 아침 화면이 뜨기 직전 전체 화면 컷.
//  - 그림(1280×720 cover, public/cuts/ — cuts.json art) + 아래 띠: 제목(종이색) + 대사 1~2줄(*낱말* = 호박빛) + '계속'
//  - 그림이 오기 전에는 아침 배경(--morning-art) 위에 글만 (기획: 글자만 먼저 라이브)
//  - 2초 뒤부터 탭·버튼으로 넘김(실수로 넘기지 않게), 시스템 뒤로가기·가장자리 당기기 = 계속(ui/HistoryNav.ts closeOverlay)
//  - 처음 한 번만(Progress.seenCuts, 런이 끝나도 남음). 정식 런의 아침에만(run:morning은 테스트 판·튜토리얼에서 오지 않음)
//  - 한 아침에 하나: cuts.json cutOrder(노월 → 셋 → 토리 → 환해짐)에서 조건이 맞고 안 본 것 (systems/highlights.ts pickCut)
import { bus, type RunResult } from '../core/events';
import { Progress } from '../core/Progress';
import { GameData, characterById, type CharacterId } from '../data';
import { runPath, type RunData } from '../systems/nightRun';
import { witchFormOf } from '../systems/nightRules';
import { fillText, markup, pickCut, type CutId } from '../systems/highlights';
import { h } from './dom';

/** 사라지는 연출 (CSS hcut-leave와 같게) */
const LEAVE_MS = 360;

let current: HighlightCut | null = null;

/** 뒤로가기·가장자리 당기기 = 계속 (일부러 하는 몸짓이라 2초 전이라도): 컷이 떠 있으면 넘기고 true */
export function closeHighlightCut(): boolean {
  return current?.close(true) ?? false;
}

export class HighlightCut {
  readonly el = h('div', { class: 'hcut', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'hcut-title' });
  private readonly next = h('button', { class: 'pill pill--primary hcut__next', type: 'button' }, '계속');
  private readyTimer = 0;
  private leaveTimer = 0;
  private ready = false;

  constructor() {
    current = this;
    // 점검용 고리 (개발 서버에서만 — 완료 기준·화면 찍기)
    if (import.meta.env.DEV) (window as unknown as { __cut: HighlightCut }).__cut = this;
    this.el.hidden = true;
    this.next.addEventListener('click', () => this.close());
    // 2초 뒤부터는 화면 어디를 눌러도 넘김
    this.el.addEventListener('click', (e) => {
      if (e.target !== this.next) this.close();
    });
    bus.on('run:morning', (e) => this.onMorning(e.result, e.before, e.run));
    // 아침이 아닌 곳으로 가면(새로고침 대신 홈 등) 조용히 닫음
    bus.on('ui:navigate', (e) => e.to !== 'morning' && this.close(true));
    bus.on('run:end', () => this.close(true));
  }

  private onMorning(r: RunResult, before: RunData, run: RunData): void {
    const party = [run.characterId, ...(Object.keys(run.friendNights) as CharacterId[])];
    const id = pickCut({ outcome: r.outcome, bossCalmed: r.bossCalmed, rescuedNow: r.friends ?? [], party }, Progress.data.seenCuts, GameData.cuts.cutOrder);
    if (!id) return;
    Progress.markSeen(id);
    const B = GameData.game.boss;
    this.show(id, {
      keeper: characterById(run.characterId).name,
      calmLine: (witchFormOf(runPath(before)) === 'angry' ? B.angry : B.calm).calmLine,
    });
  }

  /** 컷 하나를 띄운다 (아침 흐름 밖에서 부르는 건 점검용) */
  show(id: CutId, vars: Readonly<Record<string, string>>): void {
    const def = GameData.cuts.cuts[id];
    window.clearTimeout(this.readyTimer);
    window.clearTimeout(this.leaveTimer);
    const art = def.art
      ? h('div', { class: 'hcut__art hcut__art--image', 'aria-hidden': 'true' }, h('img', { class: 'hcut__image', src: `cuts/${def.art}`, alt: '', width: 1280, height: 720 }))
      : h('div', { class: 'hcut__art hcut__art--sky', 'aria-hidden': 'true' });
    const lines = def.lines.map((l) =>
      h(
        'p',
        { class: 'hcut__line' },
        ...(l.who ? [h('b', { class: 'hcut__who' }, l.who)] : []),
        h('span', { class: 'hcut__say' }, ...markup(fillText(l.text, vars)).map((p) => (p.em ? h('em', {}, p.text) : document.createTextNode(p.text)))),
      ),
    );
    this.el.replaceChildren(art, h('div', { class: 'hcut__band' }, h('h2', { class: 'hcut__title', id: 'hcut-title' }, def.title), h('div', { class: 'hcut__lines' }, ...lines), this.next));
    this.el.dataset.id = id;
    this.el.classList.remove('is-leaving', 'is-ready');
    this.ready = false;
    this.next.setAttribute('aria-disabled', 'true');
    this.el.hidden = false;
    this.readyTimer = window.setTimeout(() => {
      this.ready = true;
      this.el.classList.add('is-ready');
      this.next.removeAttribute('aria-disabled');
      this.next.focus({ preventScroll: true });
    }, GameData.cuts.tapAfterMs);
    bus.emit('ui:cut', { id, open: true });
  }

  /** 넘김. force = 2초 전이라도(뒤로가기·화면 이동). 떠 있었으면 true */
  close(force = false): boolean {
    if (this.el.hidden || this.el.classList.contains('is-leaving')) return false;
    if (!this.ready && !force) return true;
    window.clearTimeout(this.readyTimer);
    this.el.classList.add('is-leaving');
    this.leaveTimer = window.setTimeout(() => {
      this.el.hidden = true;
      this.el.classList.remove('is-leaving');
      this.el.replaceChildren();
      delete this.el.dataset.id;
      bus.emit('ui:cut', { id: null, open: false });
    }, LEAVE_MS);
    return true;
  }
}
