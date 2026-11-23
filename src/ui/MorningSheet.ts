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
import { NIGHT_STAGE, RunState } from '../core/RunState';
import { saveRun } from '../core/runSave';
import { GameData, characterById, type PrepDef } from '../data';
import { runPath, type RunData } from '../systems/nightRun';
import { growthLine } from '../systems/growth';
import { firstNightOfBand } from '../systems/nightRules';
import { parseBlobs, type GridMap } from '../systems/grid';
import { buyPrep, canBuy } from '../systems/shop';
import { formatScore, h, svg } from './dom';
import { heartIcon, homeIcon, playIcon, prepIcons } from './icons';
import { PATH_TITLE, hasBatchim, nightSubject, pathLine } from './runText';
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
  /** 아침 상점 (2026-11-23): 별가루로 이번 나들이 동안만 쓰는 준비물 */
  private readonly shop = h('section', { class: 'morning__shop', 'aria-labelledby': 'morning-shop-title' });
  private readonly shopGrid = h('div', { class: 'morning__shop-grid' });
  private readonly shopNote = h('p', { class: 'morning__shop-note', 'aria-live': 'polite' });
  private result: RunResult | null = null;

  constructor() {
    this.hearts = Array.from({ length: GameData.game.run.maxHearts }, () => svg(heartIcon));
    const next = h('button', { class: 'pill pill--primary morning__next', type: 'button' }, svg(playIcon), '다음 밤으로 →');
    next.addEventListener('click', () => nextNight());
    const home = h('button', { class: 'pill pill--secondary morning__home', type: 'button' }, svg(homeIcon), '집으로 (기록을 남겨요)');
    home.addEventListener('click', () => goHome());
    this.region.hidden = true;
    this.shop.append(h('h3', { class: 'morning__shop-title', id: 'morning-shop-title' }, '아침 상점 · 이번 나들이 동안만'), this.shopGrid, this.shopNote);

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
    this.result = r;
    this.shopNote.textContent = '';
    const n = r.night ?? before.night;
    this.title.textContent = `${nightSubject(n)} 밝았어요`;
    this.renderRegion(run.night);
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

    this.renderRun(run);
    const up = growthLine(before.level, run.level, run.characterId, GameData.game.growth);
    this.level.textContent = up ? `빛 레벨 ★${run.level} · 이번 밤 ${up}` : `빛 레벨 ★${run.level}`;
  }

  /**
   * 새 지역 (2026-11-23, NIGHT_RUN.md 7-5절): 다음 밤이 구간에 처음 닿는 밤이고 그 구간의 맵을 아직 발견하지 않았으면
   * '{구간}을 발견했어요 · 밤 n부터 이 길로 나가요' + 작은 지도 + '발견한 지역 n/6', 그 구간의 맵을 발견한 것으로
   */
  private renderRegion(nextNight: number): void {
    const band = firstNightOfBand(nextNight);
    const fresh = band ? band.maps.filter((id) => !Progress.data.discovered.includes(id)) : [];
    this.region.hidden = !band || fresh.length === 0 || RunState.test;
    if (this.region.hidden || !band) return;
    Progress.discover(band.maps);
    const total = Math.max(6, GameData.nights.bands.reduce((s, b) => s + b.maps.length, 0));
    const map = GameData.maps[band.maps[0]];
    const desc = band.id === 'C' ? '빛이 꺼져 어둠에 넘어간 바깥 마을이에요' : '';
    this.region.replaceChildren(
      h('p', { class: 'morning__region-title' }, `${band.name}${hasBatchim(band.name) ? '을' : '를'} 발견했어요`),
      h('p', { class: 'morning__region-line' }, `밤 ${band.fromNight}부터 이 길로 나가요${desc ? ' · ' + desc : ''}`),
      ...(map ? [miniMap(map)] : []),
      h('p', { class: 'morning__region-count' }, `발견한 지역 ${Progress.data.discovered.length}/${total}`),
    );
    this.region.dataset.band = band.id;
  }

  /** 하트·별가루·상점 (사면 다시) */
  private renderRun(run: RunData): void {
    const r = this.result;
    this.dust.textContent = `✦+${r?.dust ?? 0} → ✦${Progress.data.dust}`;
    this.hearts.forEach((el, i) => el.classList.toggle('is-empty', i >= run.hearts));
    this.hearts[0]?.parentElement?.setAttribute('aria-label', `하트 ${run.hearts}개`);
    this.shopGrid.replaceChildren(...GameData.shop.prep.map((def) => this.prepCard(def, run)));
  }

  private prepCard(def: PrepDef, run: RunData): HTMLElement {
    const state = canBuy(def, run, Progress.data.dust);
    const tag = state === 'owned' ? '챙겼어요' : `✦${def.price}`;
    const b = h(
      'button',
      { class: `prep-card${state === 'owned' ? ' is-owned' : ''}${state === 'short' ? ' is-short' : ''}`, type: 'button', 'aria-label': `${def.name} — ${def.desc}, ${tag}` },
      h('span', { class: 'prep-card__icon' }, svg(prepIcons[def.id] ?? prepIcons.extra_charm)),
      h('span', { class: 'prep-card__text' }, h('strong', {}, def.name), h('small', {}, def.desc)),
      h('span', { class: 'prep-card__price' }, tag),
    );
    b.addEventListener('click', () => this.buy(def));
    return b;
  }

  /** 사기: 별가루가 모자라면 '별가루가 부족해요', 사면 런을 고치고 저장 */
  private buy(def: PrepDef): void {
    const run = RunState.run;
    if (!run || RunState.stageId !== NIGHT_STAGE || RunState.test) return;
    const state = canBuy(def, run, Progress.data.dust);
    if (state === 'owned') return;
    if (state === 'short' || !Progress.spendDust(def.price)) {
      this.shopNote.textContent = '별가루가 부족해요';
      return;
    }
    const next = buyPrep(def, run, GameData.game.run.maxHearts);
    RunState.run = next;
    saveRun(next);
    this.shopNote.textContent = `${def.name}${hasBatchim(def.name) ? '을' : '를'} 챙겼어요`;
    this.renderRun(next);
  }
}

/** 작은 지도: 격자를 작은 사각형으로 (새 지역 카드 — 그림 region-* 가 오면 그 위에) */
const MINI_COLOR: Record<string, string> = {
  rock: '#6b6684',
  house: '#c9a25c',
  barrel: '#8a6a44',
  hay: '#d9b25c',
  fence: '#7a5e48',
  river: '#3f6fa8',
  bridge: '#9a7a54',
  bush: '#3d6a52',
  lamp: '#ffc857',
};
function miniMap(map: GridMap): HTMLCanvasElement {
  const D = GameData.grid;
  const k = 6;
  const c = document.createElement('canvas');
  c.className = 'morning__minimap';
  c.width = D.cols * k;
  c.height = D.rows * k;
  c.setAttribute('aria-hidden', 'true');
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.fillStyle = '#232750';
  ctx.fillRect(0, 0, c.width, c.height);
  const p = D.plaza;
  ctx.fillStyle = '#3a3f78';
  ctx.fillRect(p.col0 * k, p.row0 * k, (p.col1 - p.col0 + 1) * k, (p.row1 - p.row0 + 1) * k);
  for (const b of parseBlobs(map, D)) {
    ctx.fillStyle = MINI_COLOR[b.kind] ?? '#555';
    ctx.fillRect(b.col * k + 0.5, b.row * k + 0.5, b.w * k - 1, b.h * k - 1);
  }
  ctx.fillStyle = '#ffc857';
  ctx.beginPath();
  ctx.arc(((p.col0 + p.col1 + 1) / 2) * k, ((p.row0 + p.row1 + 1) / 2) * k, k * 0.9, 0, Math.PI * 2);
  ctx.fill();
  return c;
}
