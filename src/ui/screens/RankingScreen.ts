// 지난 밤들(랭킹): 오늘 / 이번 주 / 전체, 최대 100줄, 내 최고 기록은 아래에 고정 (기획서).
// M5 전까지는 이 기기의 기록(LocalRanking).
import { RunState } from '../../core/RunState';
import { localPlayerId } from '../../services/LocalRanking';
import type { Ranking, RankingPeriod, RankingRow } from '../../services/Ranking';
import { formatScore, formatTime, h, svg } from '../dom';
import { starIcon } from '../icons';
import { screenBar, screenShell } from './common';

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
    h('span', { class: 'rank-row__name' }, r.nickname, r.outcome === 'clear' ? h('span', { class: 'rank-row__dawn', title: '새벽까지' }, svg(starIcon)) : ''),
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

  constructor(private readonly ranking: Ranking) {
    this.list = h('ol', { class: 'rank-list' });
    this.me = h('div', { class: 'rank-me' });
    this.tabs = PERIODS.map((p) => {
      const b = h('button', { class: 'tab', type: 'button', role: 'tab' }, p.label);
      b.addEventListener('click', () => void this.load(p.id));
      return b;
    });
    this.el = screenShell('ranking', screenBar('지난 밤들'), h('div', { class: 'tabs', role: 'tablist' }, ...this.tabs), this.list, this.me);
  }

  show(): void {
    void this.load(this.period);
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
