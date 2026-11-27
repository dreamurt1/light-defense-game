// 지난 밤들(랭킹): 오늘 / 이번 주 / 전체, 최대 100줄, 내 최고 기록은 아래에 고정 (기획서).
// M5 전까지는 이 기기의 기록(LocalRanking).
// 2026-11-23 밤 나들이 v3: '밤' 열(아침을 맞은 밤 수)과 길 점(민트 = 지키는 길, 주황 = 넓히는 길, 회색 = 중립), 정렬은 점수 → 밤 수 → 버틴 시간.
// 2026-11-27 16:33 라이언 확정: 탭 둘 — '기록'(위 목록 그대로) · '밤의 기억'(이야기 카드 6 + 하이라이트 컷 4 앨범, 본 것만 열림 — systems/album.ts, ui/AlbumViewer.ts)
import { Progress } from '../../core/Progress';
import { RunState } from '../../core/RunState';
import { GameData } from '../../data';
import { albumCount, unlocked, type AlbumEntry } from '../../systems/album';
import { albumArt, openAlbumViewer } from '../AlbumViewer';
import { lockIcon } from '../icons';
import { localPlayerId } from '../../services/LocalRanking';
import type { Ranking, RankingPeriod, RankingRow } from '../../services/Ranking';
import { formatScore, formatTime, h, svg } from '../dom';
import { starIcon } from '../icons';
import { pathIconName, v3Icon } from '../v3Icons';
import { screenBar, screenShell } from './common';

const PATH_NAME = { keep: '지키는 길', expand: '넓히는 길', mixed: '빛과 어둠 사이' } as const;

const PERIODS: { id: RankingPeriod; label: string }[] = [
  { id: 'day', label: '오늘' },
  { id: 'week', label: '이번 주' },
  { id: 'all', label: '전체' },
];

function row(r: RankingRow, mine = false): HTMLElement {
  return h(
    'li',
    { class: `rank-row${mine ? ' rank-row--me' : ''}${r.rank <= 3 ? ' rank-row--top' : ''}` },
    h('span', { class: 'rank-row__rank' }, mine ? '나' : String(r.rank)),
    h('span', { class: 'rank-row__name' }, h('span', { class: 'rank-row__path', 'data-path': r.path, title: PATH_NAME[r.path], 'aria-label': PATH_NAME[r.path] }, ...(pathIconName(r.path) ? [v3Icon(pathIconName(r.path)!)] : [])), r.nickname, r.outcome !== 'over' ? h('span', { class: 'rank-row__dawn', title: '아침까지' }, svg(starIcon)) : ''),
    h('span', { class: 'rank-row__nights' }, r.nights > 0 ? `밤 ${r.nights}` : '–'),
    h('span', { class: 'rank-row__time' }, formatTime(r.survivedSec)),
    h('span', { class: 'rank-row__score' }, formatScore(r.score)),
  );
}

export class RankingScreen {
  readonly el: HTMLElement;
  private period: RankingPeriod = 'day';
  private readonly list: HTMLElement;
  private readonly me: HTMLElement;
  private readonly tabs: HTMLButtonElement[];
  /** 기록 / 밤의 기억 (2026-11-27) */
  private readonly sectionTabs: HTMLButtonElement[];
  private readonly records: HTMLElement;
  private readonly album = h('div', { class: 'album', role: 'tabpanel' });

  constructor(private readonly ranking: Ranking) {
    this.list = h('ol', { class: 'rank-list' });
    this.me = h('div', { class: 'rank-me' });
    this.tabs = PERIODS.map((p) => {
      const b = h('button', { class: 'tab', type: 'button', role: 'tab' }, p.label);
      b.addEventListener('click', () => void this.load(p.id));
      return b;
    });
    this.sectionTabs = (['records', 'album'] as const).map((id) => {
      const b = h('button', { class: 'tab', type: 'button', role: 'tab', 'data-section': id }, id === 'records' ? '기록' : '밤의 기억');
      b.addEventListener('click', () => this.setSection(id));
      return b;
    });
    this.records = h('div', { class: 'rank-records', role: 'tabpanel' }, h('div', { class: 'tabs', role: 'tablist' }, ...this.tabs), this.list, this.me);
    this.el = screenShell('ranking', screenBar('지난 밤들'), h('div', { class: 'tabs tabs--section', role: 'tablist' }, ...this.sectionTabs), this.records, this.album);
    this.setSection('records');
  }

  show(): void {
    void this.load(this.period);
    this.renderAlbum();
  }

  private setSection(id: 'records' | 'album'): void {
    this.sectionTabs.forEach((b) => {
      const on = b.dataset.section === id;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', String(on));
    });
    this.records.hidden = id !== 'records';
    this.album.hidden = id !== 'album';
    if (id === 'album') this.renderAlbum();
  }

  /** 밤의 기억: 10칸 — 열린 칸은 그림 + 제목(누르면 크게), 잠긴 칸은 어두운 실루엣 + 자물쇠 + 힌트 한 줄 */
  private renderAlbum(): void {
    const p = Progress.data;
    const entries = GameData.album;
    const open = entries.filter((e) => unlocked(e, p));
    const { open: n, total } = albumCount(entries, p);
    this.sectionTabs[1].textContent = `밤의 기억 ${n}/${total}`;
    const card = (e: AlbumEntry): HTMLElement => {
      const on = unlocked(e, p);
      const src = albumArt(e);
      const thumb = h('span', { class: 'album-card__thumb', 'aria-hidden': 'true' }, src ? h('img', { src, alt: '', width: 320, height: 180, loading: 'lazy', decoding: 'async' }) : h('span', { class: 'album-card__sky' }), ...(on ? [] : [h('span', { class: 'album-card__lock' }, svg(lockIcon))]));
      const b = h(
        'button',
        { class: `album-card${on ? '' : ' is-locked'}`, type: 'button', 'data-id': e.id, 'aria-label': on ? e.title : `잠김 — ${e.hint}` },
        thumb,
        on ? h('span', { class: 'album-card__title' }, e.title) : h('span', { class: 'album-card__hint' }, e.hint),
      );
      if (on) b.addEventListener('click', () => openAlbumViewer(open, open.indexOf(e)));
      else b.setAttribute('aria-disabled', 'true');
      return b;
    };
    this.album.replaceChildren(h('div', { class: 'album__grid' }, ...entries.map(card)));
  }

  private async load(period: RankingPeriod): Promise<void> {
    this.period = period;
    this.tabs.forEach((b, i) => {
      const on = PERIODS[i].id === period;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', String(on));
    });
    const rows = await this.ranking.top(period);
    this.list.replaceChildren(...(rows.length ? rows.map((r) => row(r)) : [h('li', { class: 'rank-empty' }, '아직 남긴 밤이 없어요')]));
    const mine = await this.ranking.me(localPlayerId(localStorage), period);
    this.me.replaceChildren(mine ? row({ ...mine.best, rank: mine.rank, nickname: `${RunState.nickname} · ${mine.rank}위` }, true) : '');
    this.me.hidden = !mine;
  }
}
