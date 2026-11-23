// 아침 화면 (2026-11-23 밤 나들이 v3, NIGHT_RUN.md 4-3절) — 런에서 밤을 이기면 나온다(Router 화면 'morning', 씬은 멈춤).
//  - "밤 {n}이 밝았어요" / "아침이에요. 마을은 무사해요."
//  - 요약 6칸: 오늘 점수 · 자비 · 돌려보낸 어둠의 주민 · 구출한 주민 · 켠 등불 n/m · 별가루 +k → 잔액
//  - 하트(최대 4칸) · ★빛 레벨과 이번 밤 오른 효과(Phase 9) · 아침 상점(Phase 9) · 새 지역(Phase 10)
//  - 다음 밤으로 → (주요) / 집으로 (기록을 남겨요) (보조). 아침 화면을 건너뛰지 않는다(지시서 12절)
//  - 구출 밤이면 리본 "{친구}가 함께하게 됐어요"
// 배경은 새벽 하늘(#3A3F78 → #F2B880). 그림(ChatGPT v3 브리프 morning·morning-wide)이 오면 --morning-art로 깐다.
import { bus, type RunResult } from '../core/events';
import { Progress } from '../core/Progress';
import { goHome, nextNight } from '../core/runFlow';
import { GameData, characterById } from '../data';
import { runPath, type RunData } from '../systems/nightRun';
import { formatScore, h, svg } from './dom';
import { heartIcon, homeIcon, playIcon } from './icons';
import { PATH_TITLE, nightSubject, pathLine } from './runText';
import { screenShell } from './screens/common';

function row(label: string, value: HTMLElement, cls = ''): HTMLElement {
  return h('div', { class: `result__row ${cls}`.trim() }, h('dt', {}, label), h('dd', {}, value));
}

export class MorningSheet {
  readonly el: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly ribbon = h('p', { class: 'result__friend morning__ribbon' });
  private readonly region = h('div', { class: 'morning__region' });
  private readonly title = h('h2', { class: 'sheet__title', id: 'morning-title' });
  private readonly path = h('p', { class: 'morning__path' });
  private readonly score = h('strong', { class: 'result__score' });
  private readonly mercy = h('span');
  private readonly returned = h('span');
  private readonly rescued = h('span');
  private readonly stations = h('span');
  private readonly dust = h('span');
  private readonly hearts: SVGSVGElement[];
  private readonly level = h('p', { class: 'morning__level' });
  /** 아침 상점 (Phase 9가 채운다) */
  readonly shop = h('section', { class: 'morning__shop', 'aria-label': '아침 상점' });

  constructor() {
    this.hearts = Array.from({ length: GameData.game.run.maxHearts }, () => svg(heartIcon));
    const next = h('button', { class: 'pill pill--primary morning__next', type: 'button' }, svg(playIcon), '다음 밤으로 →');
    next.addEventListener('click', () => nextNight());
    const home = h('button', { class: 'pill pill--secondary morning__home', type: 'button' }, svg(homeIcon), '집으로 (기록을 남겨요)');
    home.addEventListener('click', () => goHome());
    this.region.hidden = true;
    this.shop.hidden = true;

    this.panel = h(
      'div',
      { class: 'sheet__panel morning__panel', tabindex: -1, role: 'region', 'aria-labelledby': 'morning-title' },
      this.region,
      this.ribbon,
      this.title,
      h('p', { class: 'sheet__subtitle' }, '아침이에요. 마을은 무사해요.'),
      this.path,
      h(
        'dl',
        { class: 'result__stats morning__stats' },
        row('오늘 점수', this.score, 'result__row--score'),
        row('자비', this.mercy),
        row('돌려보낸 어둠의 주민', this.returned),
        row('구출한 주민', this.rescued),
        row('켠 등불', this.stations),
        row('별가루', this.dust),
      ),
      h('div', { class: 'morning__run' }, h('div', { class: 'morning__hearts', role: 'img' }, ...this.hearts), this.level),
      this.shop,
      h('div', { class: 'sheet__actions morning__actions' }, next, home),
    );
    this.el = screenShell('morning', h('div', { class: 'morning__sky', 'aria-hidden': 'true' }), h('div', { class: 'morning__wrap' }, this.panel));
    bus.on('run:morning', (e) => this.render(e.result, e.before, e.run));
  }

  /** 화면에 들어올 때 */
  show(): void {
    this.panel.scrollTop = 0;
    this.panel.focus({ preventScroll: true });
  }

  private render(r: RunResult, before: RunData, run: RunData): void {
    const n = r.night ?? before.night;
    this.title.textContent = `${nightSubject(n)} 밝았어요`;
    const friends = (r.friends ?? []).map((id) => characterById(id).name);
    this.ribbon.textContent = friends.length ? `${friends.join('와 ')}가 함께하게 됐어요` : '';
    this.ribbon.hidden = friends.length === 0;

    // 두 길 (행렬이 지나간 뒤부터, Phase 8)
    const banished = run.banish;
    const path = runPath(run);
    this.path.hidden = run.mercy + banished === 0;
    this.path.dataset.path = path;
    this.path.textContent = `${PATH_TITLE[path]} · ${pathLine(run.mercy, banished)}`;

    this.score.textContent = formatScore(r.score);
    this.mercy.textContent = `${r.mercy}번`;
    this.returned.textContent = `${r.retreated + (r.banish ?? 0)}명`;
    this.rescued.textContent = `${r.rescued}명`;
    this.stations.textContent = `${r.stationsLit} / ${r.stationsTotal}`;
    this.dust.textContent = `✦+${r.dust ?? 0} → ✦${Progress.data.dust}`;

    this.hearts.forEach((el, i) => el.classList.toggle('is-empty', i >= run.hearts));
    this.hearts[0]?.parentElement?.setAttribute('aria-label', `하트 ${run.hearts}개`);
    this.level.hidden = run.level <= 1;
    this.level.textContent = `빛 레벨 ★${run.level}`;
  }
}
