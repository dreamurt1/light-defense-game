// 초상 배너 (2026-11-27 13:00 기획 세션·라이언 확정 — 하이라이트 컷 ②): 밤 중 사건에 초상 56px + 한 줄(+ 작은 둘째 줄), 2.5~3.5초.
//  - 판을 멈추지 않는다. 자리는 위 HUD 바로 아래 토스트 자리 — 떠 있는 동안 토스트가 아래로 비킨다(:root[data-pline]).
//  - 겹치면 줄 세워 하나씩(systems/highlights.ts BannerQueue). 판을 떠나거나 끝나면 지움.
//  - 첫 행렬(line-parade-first)은 계정에 처음 한 번(Progress.seenCuts — 정식 런에서만 남김, 테스트 판은 그 판에서 한 번 띄움).
//    토리·도토 구출·노월 등장·작은 화해는 일어날 때마다. 튜토리얼에서는 띄우지 않음(5단계 글과 겹침).
//  - 문장·초상 자리 = src/data/cuts.json lines·portraits
import { bus } from '../core/events';
import { Progress } from '../core/Progress';
import { RunState } from '../core/RunState';
import { GameData, characterById, type BannerDef, type EnemyId } from '../data';
import { BannerQueue, fillText, lineDuration, type LineId } from '../systems/highlights';
import { h } from './dom';
import { faceCanvas, preloadFaces } from './portraitFace';

interface Banner {
  id: LineId;
  portrait: string;
  who: string;
  text: string;
  sub: string;
}

/** 사라지는 연출 시간 (CSS pline-leave와 같게) */
const LEAVE_MS = 320;
/** 작은 화해의 주민: 마지막으로 자비를 베푼 행렬 주민(없으면 올빼미) */
const GIVERS: readonly EnemyId[] = ['owl', 'moth', 'firefly'];

export class PortraitLine {
  readonly el = h('div', { class: 'pline', role: 'status', 'aria-live': 'polite' });
  private readonly queue = new BannerQueue<Banner>(3);
  private timer = 0;
  private leaveTimer = 0;
  /** 이번 판에 첫 행렬 배너를 띄웠는가 */
  private paradeShown = false;
  private giver: EnemyId = 'owl';

  constructor() {
    this.el.hidden = true;
    bus.on('run:start', () => {
      this.reset();
      this.paradeShown = false;
      this.giver = 'owl';
      if (this.allowed) preloadFaces();
    });
    bus.on('ui:navigate', (e) => e.to !== 'play' && this.reset());
    bus.on('game:over', () => this.reset());
    bus.on('game:clear', () => this.reset());

    bus.on('parade:enter', () => {
      if (this.paradeShown) return;
      this.paradeShown = true;
      if (RunState.isRealRun && !Progress.markSeen('line-parade-first')) return;
      this.push('line-parade-first');
    });
    bus.on('friend:rescued', (e) => {
      if (e.characterId === 'tori') this.push('line-tori');
      else if (e.characterId === 'doto') this.push('line-doto');
    });
    bus.on('witch:spawn', (e) => {
      const B = GameData.game.boss;
      const form = e.form === 'angry' ? B.angry : B.calm;
      this.push('line-witch', {
        portrait: e.form === 'angry' ? 'witch-angry' : 'witch',
        text: form.enterLine,
        sub: e.form === 'angry' ? '분노한 노월이 나타났어요' : '노월이 찾아왔어요',
      });
    });
    bus.on('mercy:gain', (e) => {
      if (GIVERS.includes(e.enemyId)) this.giver = e.enemyId;
    });
    bus.on('run:event', (e) => {
      if (e.kind === 'gift') this.push('line-gift', { portrait: this.giver, who: enemyName(this.giver) });
    });
  }

  /** 튜토리얼이 아니면 띄움 */
  private get allowed(): boolean {
    return RunState.stageId !== 'tutorial';
  }

  private push(id: LineId, over: Partial<Banner> = {}): void {
    if (!this.allowed) return;
    const def: BannerDef = GameData.cuts.lines[id];
    const vars = { keeper: characterById(RunState.keeperId).name };
    const b: Banner = {
      id,
      portrait: over.portrait ?? def.portrait,
      who: over.who ?? def.who ?? '',
      text: fillText(over.text ?? def.text, vars),
      sub: fillText(over.sub ?? def.sub ?? '', vars),
    };
    const now = this.queue.push(b);
    if (now) this.show(now);
  }

  private show(b: Banner): void {
    window.clearTimeout(this.leaveTimer);
    const face = h('span', { class: 'pline__face' }, faceCanvas(b.portrait));
    const line = h('p', { class: 'pline__line' }, ...(b.who ? [h('b', { class: 'pline__who' }, b.who)] : []), h('span', { class: 'pline__text' }, b.text));
    const text = h('div', { class: 'pline__body' }, line, ...(b.sub ? [h('p', { class: 'pline__sub' }, b.sub)] : []));
    this.el.replaceChildren(h('div', { class: 'pline__card' }, face, text));
    this.el.dataset.id = b.id;
    this.el.dataset.portrait = b.portrait;
    this.el.classList.remove('is-leaving');
    this.el.hidden = false;
    document.documentElement.dataset.pline = 'on';
    // 같은 자리에 이어 뜰 때도 다시 떠오르게
    this.el.style.animation = 'none';
    void this.el.offsetWidth;
    this.el.style.animation = '';
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.leave(), lineDuration(!!b.sub, GameData.cuts));
  }

  private leave(): void {
    this.el.classList.add('is-leaving');
    this.leaveTimer = window.setTimeout(() => {
      const next = this.queue.done();
      if (next) {
        this.show(next);
        return;
      }
      this.hide();
    }, LEAVE_MS);
  }

  private hide(): void {
    this.el.hidden = true;
    this.el.classList.remove('is-leaving');
    this.el.replaceChildren();
    delete this.el.dataset.id;
    delete document.documentElement.dataset.pline;
  }

  private reset(): void {
    window.clearTimeout(this.timer);
    window.clearTimeout(this.leaveTimer);
    this.queue.clear();
    this.hide();
  }
}

function enemyName(id: EnemyId): string {
  return GameData.enemies.find((e) => e.id === id)?.name ?? '';
}
