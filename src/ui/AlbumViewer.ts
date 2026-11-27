// 밤의 기억 보기 (2026-11-27 16:33 라이언 확정, docs/plan/order-memory-album-26-1127.md): 앨범에서 연 칸을 전체 화면으로 다시 본다.
//  - 하이라이트 컷과 같은 모양(.hcut — ui/highlight.css): 그림(없으면 아침 하늘) + 아래 띠 제목·글 — 판 중 컷의 동작은 바꾸지 않는다(이건 따로)
//  - 읽기 전용: 이전 ‹ · 다음 › · 닫기, 좌우로 밀기·방향키도, 시스템 뒤로가기·가장자리 당기기·Esc = 닫기(ui/HistoryNav.ts closeOverlay)
import { RunState } from '../core/RunState';
import { GameData, characterById, type CutDef } from '../data';
import type { AlbumEntry } from '../systems/album';
import { fillText, markup } from '../systems/highlights';
import { h, svg } from './dom';
import { chevronLeftIcon, chevronRightIcon } from './icons';
import { storyCard } from './Story';

/** 밀어서 넘기는 거리 (화면 px) */
const SWIPE_PX = 60;

let viewer: AlbumViewer | null = null;

/** 뒤로가기: 떠 있으면 닫고 true */
export function closeAlbumViewer(): boolean {
  return viewer?.close() ?? false;
}

/** 열린 칸들(items) 중 index번째를 띄운다 */
export function openAlbumViewer(items: readonly AlbumEntry[], index: number): void {
  if (!viewer) {
    viewer = new AlbumViewer();
    (document.getElementById('ui') ?? document.body).append(viewer.el);
  }
  viewer.open(items, index);
}

/** 한 칸의 그림 주소 (없으면 null = 아침 하늘) */
export function albumArt(e: AlbumEntry): string | null {
  if (e.story) return storyCard(e.story).src;
  const def: CutDef | undefined = e.cut ? GameData.cuts.cuts[e.cut as keyof typeof GameData.cuts.cuts] : undefined;
  return def?.art ? `cuts/${def.art}` : null;
}

class AlbumViewer {
  readonly el = h('div', { class: 'hcut hcut--album is-ready', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'album-view-title' });
  private items: readonly AlbumEntry[] = [];
  private index = 0;
  private readonly prev = h('button', { class: 'icon-button album-view__nav', type: 'button', 'aria-label': '이전' }, svg(chevronLeftIcon));
  private readonly next = h('button', { class: 'icon-button album-view__nav', type: 'button', 'aria-label': '다음' }, svg(chevronRightIcon));
  private readonly closeBtn = h('button', { class: 'pill pill--secondary album-view__close', type: 'button' }, '닫기');
  private downX: number | null = null;

  constructor() {
    this.el.hidden = true;
    this.prev.addEventListener('click', () => this.go(-1));
    this.next.addEventListener('click', () => this.go(1));
    this.closeBtn.addEventListener('click', () => this.close());
    this.el.addEventListener('pointerdown', (e) => (this.downX = e.clientX));
    this.el.addEventListener('pointerup', (e) => {
      if (this.downX === null) return;
      const dx = e.clientX - this.downX;
      this.downX = null;
      if (Math.abs(dx) >= SWIPE_PX) this.go(dx < 0 ? 1 : -1);
    });
    addEventListener('keydown', (e) => {
      if (this.el.hidden) return;
      if (e.key === 'ArrowLeft') this.go(-1);
      else if (e.key === 'ArrowRight') this.go(1);
      else if (e.key === 'Escape') this.close();
    });
  }

  open(items: readonly AlbumEntry[], index: number): void {
    this.items = items;
    this.index = Math.max(0, Math.min(items.length - 1, index));
    this.el.hidden = false;
    this.render();
    this.closeBtn.focus({ preventScroll: true });
  }

  close(): boolean {
    if (this.el.hidden) return false;
    this.el.hidden = true;
    this.el.replaceChildren();
    return true;
  }

  private go(d: number): void {
    const n = this.index + d;
    if (n < 0 || n >= this.items.length) return;
    this.index = n;
    this.render();
  }

  private render(): void {
    const e = this.items[this.index];
    const src = albumArt(e);
    const art = src
      ? h('div', { class: 'hcut__art hcut__art--image', 'aria-hidden': 'true' }, h('img', { class: 'hcut__image', src, alt: '', width: 1280, height: 720 }))
      : h('div', { class: 'hcut__art hcut__art--sky', 'aria-hidden': 'true' });
    const lines = this.lines(e).map((l) =>
      h(
        'p',
        { class: 'hcut__line' },
        ...(l.who ? [h('b', { class: 'hcut__who' }, l.who)] : []),
        h('span', { class: 'hcut__say' }, ...markup(l.text).map((p) => (p.em ? h('em', {}, p.text) : document.createTextNode(p.text)))),
      ),
    );
    this.prev.toggleAttribute('disabled', this.index === 0);
    this.next.toggleAttribute('disabled', this.index === this.items.length - 1);
    const nav = h('div', { class: 'album-view__bar' }, this.prev, h('span', { class: 'album-view__count' }, `${this.index + 1} / ${this.items.length}`), this.next, this.closeBtn);
    this.el.dataset.id = e.id;
    this.el.replaceChildren(art, h('div', { class: 'hcut__band' }, h('h2', { class: 'hcut__title', id: 'album-view-title' }, e.title), h('div', { class: 'hcut__lines' }, ...lines), nav));
  }

  /** 글: 이야기 카드는 카드 글 그대로, 컷은 대사(고른 등불지기 이름 · 찾아온 노월의 대사) */
  private lines(e: AlbumEntry): { who?: string; text: string }[] {
    if (e.story) return storyCard(e.story).lines.map((text) => ({ text }));
    const def = e.cut ? GameData.cuts.cuts[e.cut as keyof typeof GameData.cuts.cuts] : undefined;
    const vars = { keeper: characterById(RunState.characterId).name, calmLine: GameData.game.boss.calm.calmLine };
    return (def?.lines ?? []).map((l) => ({ who: l.who, text: fillText(l.text, vars) }));
  }
}
