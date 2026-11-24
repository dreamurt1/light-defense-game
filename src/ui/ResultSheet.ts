// 결과 = 오늘 전투 개요 (2026-11-12 새 기획): 기본 승리(아침) / 완전 승리(모든 등불이 밝음) / 오늘은 여기까지(하트 소진·중앙 광원 꺼짐).
// 2026-11-13 컨셉 시연판: 노월을 진정시킴(boss) · 튜토리얼 마침(tutorial) 문구, 자비·쓴 아이템 통계, 되찾은 친구 한 줄, '다음 밤으로'.
// 배치는 UI Screen Sheet(마을 위 가운데 패널, 통계 줄, 버튼). UI에서 죽·처치·킬·실패는 쓰지 않는다.
// 2026-11-23 밤 나들이 v3: 정식 런은 밤의 결과가 아니라 '런의 끝'(run:end)을 보여 준다 — 패배 = 오늘은 여기까지, 아침에 집으로 = 오늘 밤들은 여기까지(새벽빛).
//   길 제목 + 요약 6칸(점수·밤·최대 콤보·구출·켠 등불·별가루) + 최고 기록 갱신, 버튼 = 다시 나가기 / 홈으로 / 지난 밤들에 남기기.
// 튜토리얼·테스트(트라이얼·밤 n 체험)는 그 판의 결과(game:*). 튜토리얼 = `밤 나들이 시작` + `홈으로`, 테스트는 `다시 한 번`·다음 밤 체험.
import { bus, type RunResult } from '../core/events';
import { NIGHT_STAGE, RunState } from '../core/RunState';
import { seedLabel } from '../core/rng';
import { startNewRun } from '../core/runFlow';
import { GameData, characterById, type CharacterId } from '../data';
import type { RunSummary } from '../systems/nightRun';
import { PATH_TITLE, pathLine } from './runText';
import { pathIconName, withIcon } from './v3Icons';
import type { Ranking } from '../services/Ranking';
import { localPlayerId } from '../services/LocalRanking';
import { formatScore, formatTime, h, prefersReducedMotion, svg } from './dom';
import { homeIcon, playIcon, podiumIcon } from './icons';

const COUNT_UP_MS = 900;

const TITLE: Record<RunResult['outcome'], string> = {
  victory: '아침이 왔어요',
  complete: '마을이 환해졌어요',
  over: '오늘은 여기까지',
};

function title(r: RunResult): string {
  if (r.reason === 'tutorial') return '준비됐어요!';
  if (r.reason === 'boss' && r.outcome !== 'over') return '노월이 마음을 열었어요';
  return TITLE[r.outcome];
}

function subtitle(r: RunResult): string {
  const complete = `점수 ×${GameData.game.score.completeMultiplier}`;
  if (r.reason === 'tutorial') return '이제 밤 나들이를 떠나요';
  if (r.reason === 'boss' && r.outcome !== 'over') {
    return `빛이 어둠에게도 닿았어요 · ${r.outcome === 'complete' ? complete : `남은 하트 ${r.heartsLeft}개`}`;
  }
  if (r.outcome === 'complete') return `중앙 광원과 등불이 모두 밝게 빛나요 · ${complete}`;
  if (r.outcome === 'victory') return `중앙 광원을 지켰어요 · 남은 하트 ${r.heartsLeft}개`;
  if (r.reason === 'central') return `중앙 광원이 잠들었어요 · 버틴 시간 ${formatTime(r.survivedSec)}`;
  return `버틴 시간 ${formatTime(r.survivedSec)} · 구출한 주민 ${r.rescued}명`;
}

/** 런의 끝 제목·부제 */
function runTitle(s: RunSummary): string {
  return s.outcome === 'home' ? '오늘 밤들은 여기까지' : '오늘은 여기까지';
}

function runSubtitle(s: RunSummary): string {
  if (s.outcome === 'home') return `밤 ${s.night}까지 마을을 지켰어요 · ${characterById(s.characterId).name}가 집으로 돌아가요`;
  if (s.reason === 'central') return `밤 ${s.night} · 중앙 광원이 잠들었어요`;
  return `밤 ${s.night} · 버틴 시간 ${formatTime(s.lastSurvivedSec)} · 구출한 주민 ${s.stats.rescued}명`;
}

function statRow(label: string, value: HTMLElement): HTMLElement {
  return h('div', { class: 'result__row' }, h('dt', {}, label), h('dd', {}, value));
}

export class ResultSheet {
  readonly el: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly title: HTMLElement;
  private readonly subtitle: HTMLElement;
  private readonly friendLine: HTMLElement;
  /** 테스트 판 안내 (2026-11-14) */
  private readonly testNote: HTMLElement;
  private readonly statList: HTMLElement;
  private readonly score = h('strong', { class: 'result__score' });
  private readonly combo = h('span');
  private readonly rescued = h('span');
  private readonly retreated = h('span');
  private readonly stations = h('span');
  private readonly mercy = h('span');
  private readonly mercyRow: HTMLElement;
  private readonly items = h('span');
  private readonly nights = h('span');
  private readonly dust = h('span');
  private readonly path = h('p', { class: 'result__path' });
  private readonly best = h('p', { class: 'result__best' });
  private readonly runRows: HTMLElement[];
  private readonly nightRows: HTMLElement[];
  private readonly scoreLabel = h('dt', {}, '오늘 점수');
  /** 런의 끝 (정식 런) */
  private summary: RunSummary | null = null;
  private readonly seed: HTMLElement;
  private readonly next: HTMLButtonElement;
  private readonly nextLabel: HTMLElement;
  private readonly again: HTMLButtonElement;
  private readonly againLabel: HTMLElement;
  private readonly save: HTMLButtonElement;
  private readonly saveLabel: HTMLElement;
  private result: RunResult | null = null;
  /** 다음 버튼: 튜토리얼 뒤 = 밤 나들이, 테스트 = 다음 밤 체험 */
  private nextNight: number | null = null;
  /** 이번 판에 되찾은 친구 (run:start에서 비우고 friend:rescued로 채운다) */
  private friends: CharacterId[] = [];
  private countFrame = 0;

  constructor(private readonly ranking: Ranking) {
    this.title = h('h2', { class: 'sheet__title', id: 'result-title' });
    this.subtitle = h('p', { class: 'sheet__subtitle' });
    this.friendLine = h('p', { class: 'result__friend' });
    this.testNote = h('p', { class: 'result__test' }, '테스트 판이라 진행과 지난 밤들에는 남지 않아요');
    this.seed = h('small', { class: 'result__seed' });

    this.nextLabel = h('span', {}, '다음 밤으로');
    this.next = h('button', { class: 'pill pill--primary result__next', type: 'button' }, svg(playIcon), this.nextLabel);
    this.next.addEventListener('click', () => this.startNext());
    this.againLabel = h('span', {}, '다시 한 번');
    this.again = h('button', { class: 'pill pill--primary result__again', type: 'button' }, svg(playIcon), this.againLabel);
    // 테스트 판이면 같은 판을 다시 테스트로 (2026-11-14), 아니면(런의 끝 '다시 나가기') 선택 화면으로
    this.again.addEventListener('click', () => {
      const r = this.result;
      if (RunState.test && r) bus.emit('ui:start-test', r.night ? { stageId: NIGHT_STAGE, night: r.night, mapId: RunState.testMapId } : { stageId: RunState.stageId });
      else bus.emit('ui:navigate', { to: 'select' });
    });
    const village = h('button', { class: 'pill pill--secondary', type: 'button' }, svg(homeIcon), '홈으로');
    village.addEventListener('click', () => bus.emit('ui:navigate', { to: 'home' }));
    this.saveLabel = h('span', {}, '지난 밤들에 남기기');
    this.save = h('button', { class: 'pill pill--ghost result__save', type: 'button' }, svg(podiumIcon), this.saveLabel);
    this.save.addEventListener('click', () => void this.submit());

    this.mercyRow = statRow('자비', this.mercy);
    const nightsRow = statRow('밤', this.nights);
    const dustRow = statRow('별가루', this.dust);
    const retreatedRow = statRow('돌려보낸 어둠의 주민', this.retreated);
    const itemsRow = statRow('쓴 아이템', this.items);
    this.runRows = [nightsRow, dustRow];
    this.nightRows = [retreatedRow, this.mercyRow, itemsRow];
    this.statList = h(
      'dl',
      { class: 'result__stats' },
      h('div', { class: 'result__row result__row--score' }, this.scoreLabel, h('dd', {}, this.score)),
      nightsRow,
      statRow('최대 콤보', this.combo),
      statRow('구출한 주민', this.rescued),
      retreatedRow,
      statRow('켠 등불', this.stations),
      this.mercyRow,
      itemsRow,
      dustRow,
    );

    // 시트를 열면 버튼이 아니라 패널에 포커스를 둔다: 탭 사용자에게 포커스 링을 띄우지 않고, 키보드는 Tab으로 버튼에 간다
    this.panel = h(
      'div',
      { class: 'sheet__panel', tabindex: -1 },
      this.title,
      this.subtitle,
      this.path,
      this.best,
      this.friendLine,
      this.testNote,
      this.statList,
      h('div', { class: 'sheet__actions' }, this.next, this.again, village, this.save),
      this.seed,
    );
    this.el = h('section', { class: 'sheet sheet--result', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'result-title' }, this.panel);
    this.el.hidden = true;

    // 정식 런의 밤은 아침 화면·런의 끝(run:end)으로 (core/runFlow.ts)
    bus.on('game:over', (e) => !RunState.isRealRun && this.open(e.result));
    bus.on('game:clear', (e) => !RunState.isRealRun && this.open(e.result));
    bus.on('run:end', (e) => this.openRun(e.summary, e.best));
    bus.on('run:start', () => {
      this.friends = [];
      this.close();
    });
    bus.on('friend:rescued', (e) => {
      if (!this.friends.includes(e.characterId)) this.friends.push(e.characterId);
    });
    bus.on('ui:navigate', () => this.close());
  }

  private open(result: RunResult): void {
    this.result = result;
    this.summary = null;
    this.el.dataset.mode = 'night';
    this.scoreLabel.textContent = '오늘 점수';
    this.path.hidden = true;
    this.best.hidden = true;
    for (const r of this.runRows) r.hidden = true;
    for (const r of this.nightRows) r.hidden = false;
    this.againLabel.textContent = '다시 한 번';
    const tutorial = result.reason === 'tutorial';
    // CSS 톤: clear(아침빛) / over
    this.el.dataset.outcome = result.outcome === 'over' ? 'over' : 'clear';
    this.title.textContent = title(result);
    this.subtitle.textContent = subtitle(result);

    // 되찾은 친구: "토리가 함께하게 됐어요" (토리·도토 모두 받침 없음 → '가')
    const names = this.friends.map((id) => characterById(id).name);
    this.friendLine.textContent = names.length ? `${names.join('와 ')}가 함께하게 됐어요` : '';
    // 테스트 판은 친구 해금이 남지 않으므로 알리지 않는다
    this.friendLine.hidden = names.length === 0 || RunState.test;
    this.testNote.hidden = !RunState.test;

    this.statList.hidden = tutorial;
    this.combo.textContent = `×${result.maxCombo}`;
    this.rescued.textContent = `${result.rescued}명`;
    this.retreated.textContent = `${result.retreated}명`;
    this.stations.textContent = `${result.stationsLit} / ${result.stationsTotal}`;
    const mercy = result.mercy ?? 0;
    this.mercy.textContent = `${mercy}번`;
    this.mercyRow.hidden = mercy <= 0;
    this.items.textContent = `${result.itemsUsed ?? 0}개`;
    this.seed.textContent = `#${seedLabel(result.seed)}`;

    // 버튼: 튜토리얼 = 밤 나들이 시작 + 홈으로 / 이긴 밤 n 체험 = 다음 밤 체험 + 다시 한 번 + 홈으로 / 그 밖 = 다시 한 번 + 홈으로
    this.nextNight = tutorial ? 1 : RunState.test && result.night && result.outcome !== 'over' ? result.night + 1 : null;
    this.next.hidden = this.nextNight === null;
    this.nextLabel.textContent = tutorial ? '밤 나들이 시작' : '다음 밤으로';
    this.again.hidden = tutorial;
    // 다음 밤이 있으면 '다시 한 번'은 보조 버튼으로 내린다
    this.again.classList.toggle('pill--primary', this.next.hidden);
    this.again.classList.toggle('pill--secondary', !this.next.hidden);
    this.save.hidden = tutorial || RunState.test;
    this.save.disabled = false;
    this.saveLabel.textContent = '지난 밤들에 남기기';
    this.el.dataset.next = this.next.hidden ? 'no' : tutorial ? 'tutorial' : 'yes';

    this.el.hidden = false;
    this.countUp(result.score);
    this.panel.focus({ preventScroll: true });
  }

  /** 런의 끝: 패배 또는 아침에 집으로 */
  private openRun(s: RunSummary, best: boolean): void {
    this.summary = s;
    this.result = null;
    this.el.dataset.mode = 'run';
    this.el.dataset.outcome = s.outcome === 'home' ? 'clear' : 'over';
    this.title.textContent = runTitle(s);
    this.subtitle.textContent = runSubtitle(s);
    const banished = s.stats.retreated + s.banish;
    this.path.hidden = false;
    this.path.dataset.path = s.path;
    withIcon(this.path, pathIconName(s.path), `${PATH_TITLE[s.path]} · ${pathLine(s.mercy, banished)}`);
    this.best.hidden = !best;
    this.best.textContent = `최고 기록 갱신! 밤 ${s.nights} · ${formatScore(s.score)}점`;
    this.friendLine.hidden = true;
    this.testNote.hidden = true;
    this.statList.hidden = false;
    this.scoreLabel.textContent = '점수';
    for (const r of this.runRows) r.hidden = false;
    for (const r of this.nightRows) r.hidden = true;
    this.nights.textContent = `${s.nights}밤`;
    this.combo.textContent = `×${s.stats.maxCombo}`;
    this.rescued.textContent = `${s.stats.rescued}명`;
    this.stations.textContent = `${s.stats.stationsLit}개`;
    withIcon(this.dust, 'stardust', `${s.dust}`, s.dust > 0);
    this.seed.textContent = `#${seedLabel(s.seed)}`;
    this.nextNight = null;
    this.next.hidden = true;
    this.again.hidden = false;
    this.againLabel.textContent = '다시 나가기';
    this.again.classList.add('pill--primary');
    this.again.classList.remove('pill--secondary');
    this.save.hidden = false;
    this.save.disabled = false;
    this.saveLabel.textContent = '지난 밤들에 남기기';
    this.el.dataset.next = 'no';
    this.el.hidden = false;
    this.countUp(s.score);
    this.panel.focus({ preventScroll: true });
  }

  private close(): void {
    cancelAnimationFrame(this.countFrame);
    this.el.hidden = true;
    this.result = null;
    this.summary = null;
  }

  /** 튜토리얼 뒤 = 밤 나들이 시작(고른 등불지기), 테스트 = 다음 밤 체험 */
  private startNext(): void {
    if (this.nextNight === null) return;
    if (RunState.test) {
      bus.emit('ui:start-test', { stageId: NIGHT_STAGE, night: this.nextNight, mapId: null });
      return;
    }
    startNewRun(RunState.characterId);
  }

  private countUp(target: number): void {
    cancelAnimationFrame(this.countFrame);
    if (prefersReducedMotion()) {
      this.score.textContent = formatScore(target);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / COUNT_UP_MS);
      this.score.textContent = formatScore(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) this.countFrame = requestAnimationFrame(step);
    };
    this.countFrame = requestAnimationFrame(step);
  }

  /** 런의 끝만 지난 밤들에 남긴다 (튜토리얼·테스트는 버튼이 없음) */
  private async submit(): Promise<void> {
    const s = this.summary;
    if (!s || this.save.disabled) return;
    this.save.disabled = true;
    const { rank } = await this.ranking.submit({
      playerId: localPlayerId(localStorage),
      nickname: RunState.nickname,
      score: s.score,
      survivedSec: s.stats.survivedSec,
      characterId: s.characterId,
      stageId: NIGHT_STAGE,
      nights: s.nights,
      path: s.path,
      dust: s.dust,
      maxCombo: s.stats.maxCombo,
      seed: s.seed,
      clientVersion: __APP_VERSION__,
      outcome: s.outcome,
      continued: false,
    });
    this.saveLabel.textContent = `지난 밤들에 남겼어요 · ${rank}위`;
  }
}
