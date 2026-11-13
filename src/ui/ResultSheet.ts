// 결과 = 오늘 전투 개요 (2026-11-12 새 기획): 기본 승리(아침) / 완전 승리(모든 등불이 밝음) / 오늘은 여기까지(하트 소진·중앙 광원 꺼짐).
// 2026-11-13 컨셉 시연판: 노월을 진정시킴(boss) · 튜토리얼 마침(tutorial) 문구, 자비·쓴 아이템 통계, 되찾은 친구 한 줄, '다음 밤으로'.
// 배치는 UI Screen Sheet(마을 위 가운데 패널, 통계 줄, 버튼). UI에서 죽·처치·킬·실패는 쓰지 않는다.
// `다음 밤으로` → 다음 스테이지 바로 시작(승리이고 다음 밤이 있을 때), `다시 한 번` → 선택 화면(직전 선택이 기본값),
// `홈으로` → 홈, `지난 밤들에 남기기` → 이 기기 랭킹에 등록. 튜토리얼은 `첫 번째 밤으로` + `홈으로`만.
import { bus, type RunResult } from '../core/events';
import { RunState } from '../core/RunState';
import { seedLabel } from '../core/rng';
import { GameData, STAGE_ORDER, characterById, type CharacterId } from '../data';
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
  if (r.reason === 'tutorial') return '이제 첫 번째 밤으로 가요';
  if (r.reason === 'boss' && r.outcome !== 'over') {
    return `빛이 어둠에게도 닿았어요 · ${r.outcome === 'complete' ? complete : `남은 하트 ${r.heartsLeft}개`}`;
  }
  if (r.outcome === 'complete') return `중앙 광원과 등불이 모두 밝게 빛나요 · ${complete}`;
  if (r.outcome === 'victory') return `중앙 광원을 지켰어요 · 남은 하트 ${r.heartsLeft}개`;
  if (r.reason === 'central') return `중앙 광원이 잠들었어요 · 버틴 시간 ${formatTime(r.survivedSec)}`;
  return `버틴 시간 ${formatTime(r.survivedSec)} · 구출한 주민 ${r.rescued}명`;
}

/** 승리한 판의 다음 밤 (마지막 밤이면 없음) */
function nextStageOf(r: RunResult): string | null {
  if (r.outcome === 'over' || r.reason === 'tutorial') return null;
  const i = (STAGE_ORDER as readonly string[]).indexOf(r.stageId);
  return i >= 0 && i + 1 < STAGE_ORDER.length ? STAGE_ORDER[i + 1] : null;
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
  private readonly statList: HTMLElement;
  private readonly score = h('strong', { class: 'result__score' });
  private readonly combo = h('span');
  private readonly rescued = h('span');
  private readonly retreated = h('span');
  private readonly stations = h('span');
  private readonly mercy = h('span');
  private readonly mercyRow: HTMLElement;
  private readonly items = h('span');
  private readonly seed: HTMLElement;
  private readonly next: HTMLButtonElement;
  private readonly nextLabel: HTMLElement;
  private readonly again: HTMLButtonElement;
  private readonly save: HTMLButtonElement;
  private readonly saveLabel: HTMLElement;
  private result: RunResult | null = null;
  /** 다음 버튼이 시작할 스테이지 (튜토리얼이면 stage-1) */
  private nextStage: string | null = null;
  /** 이번 판에 되찾은 친구 (run:start에서 비우고 friend:rescued로 채운다) */
  private friends: CharacterId[] = [];
  private countFrame = 0;

  constructor(private readonly ranking: Ranking) {
    this.title = h('h2', { class: 'sheet__title', id: 'result-title' });
    this.subtitle = h('p', { class: 'sheet__subtitle' });
    this.friendLine = h('p', { class: 'result__friend' });
    this.seed = h('small', { class: 'result__seed' });

    this.nextLabel = h('span', {}, '다음 밤으로');
    this.next = h('button', { class: 'pill pill--primary result__next', type: 'button' }, svg(playIcon), this.nextLabel);
    this.next.addEventListener('click', () => this.startNext());
    this.again = h('button', { class: 'pill pill--primary result__again', type: 'button' }, svg(playIcon), '다시 한 번');
    this.again.addEventListener('click', () => bus.emit('ui:navigate', { to: 'select' }));
    const village = h('button', { class: 'pill pill--secondary', type: 'button' }, svg(homeIcon), '홈으로');
    village.addEventListener('click', () => bus.emit('ui:navigate', { to: 'home' }));
    this.saveLabel = h('span', {}, '지난 밤들에 남기기');
    this.save = h('button', { class: 'pill pill--ghost result__save', type: 'button' }, svg(podiumIcon), this.saveLabel);
    this.save.addEventListener('click', () => void this.submit());

    this.mercyRow = statRow('자비', this.mercy);
    this.statList = h(
      'dl',
      { class: 'result__stats' },
      h('div', { class: 'result__row result__row--score' }, h('dt', {}, '오늘 점수'), h('dd', {}, this.score)),
      statRow('최대 콤보', this.combo),
      statRow('구출한 주민', this.rescued),
      statRow('돌려보낸 어둠의 주민', this.retreated),
      statRow('켠 등불', this.stations),
      this.mercyRow,
      statRow('쓴 아이템', this.items),
    );

    // 시트를 열면 버튼이 아니라 패널에 포커스를 둔다: 탭 사용자에게 포커스 링을 띄우지 않고, 키보드는 Tab으로 버튼에 간다
    this.panel = h(
      'div',
      { class: 'sheet__panel', tabindex: -1 },
      this.title,
      this.subtitle,
      this.friendLine,
      this.statList,
      h('div', { class: 'sheet__actions' }, this.next, this.again, village, this.save),
      this.seed,
    );
    this.el = h('section', { class: 'sheet sheet--result', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'result-title' }, this.panel);
    this.el.hidden = true;

    bus.on('game:over', (e) => this.open(e.result));
    bus.on('game:clear', (e) => this.open(e.result));
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
    const tutorial = result.reason === 'tutorial';
    // CSS 톤: clear(아침빛) / over
    this.el.dataset.outcome = result.outcome === 'over' ? 'over' : 'clear';
    this.title.textContent = title(result);
    this.subtitle.textContent = subtitle(result);

    // 되찾은 친구: "토리가 함께하게 됐어요" (토리·도토 모두 받침 없음 → '가')
    const names = this.friends.map((id) => characterById(id).name);
    this.friendLine.textContent = names.length ? `${names.join('와 ')}가 함께하게 됐어요` : '';
    this.friendLine.hidden = names.length === 0;

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

    // 버튼: 튜토리얼 = 첫 번째 밤으로 + 홈으로 / 승리이고 다음 밤이 있으면 다음 밤으로 + 다시 한 번 + 홈으로 / 그 밖 = 다시 한 번 + 홈으로
    this.nextStage = tutorial ? STAGE_ORDER[0] : nextStageOf(result);
    this.next.hidden = this.nextStage === null;
    this.nextLabel.textContent = tutorial ? '첫 번째 밤으로' : '다음 밤으로';
    this.again.hidden = tutorial;
    // 다음 밤이 있으면 '다시 한 번'은 보조 버튼으로 내린다
    this.again.classList.toggle('pill--primary', this.next.hidden);
    this.again.classList.toggle('pill--secondary', !this.next.hidden);
    this.save.hidden = tutorial;
    this.save.disabled = false;
    this.saveLabel.textContent = '지난 밤들에 남기기';
    this.el.dataset.next = this.next.hidden ? 'no' : tutorial ? 'tutorial' : 'yes';

    this.el.hidden = false;
    this.countUp(result.score);
    this.panel.focus({ preventScroll: true });
  }

  private close(): void {
    cancelAnimationFrame(this.countFrame);
    this.el.hidden = true;
    this.result = null;
  }

  /** 다음 밤(또는 튜토리얼 뒤 첫 번째 밤)을 바로 시작 */
  private startNext(): void {
    if (!this.nextStage) return;
    RunState.stageId = this.nextStage;
    RunState.test = false;
    bus.emit('ui:start-run');
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

  private async submit(): Promise<void> {
    const r = this.result;
    if (!r || this.save.disabled) return;
    this.save.disabled = true;
    const { rank } = await this.ranking.submit({
      playerId: localPlayerId(localStorage),
      nickname: RunState.nickname,
      score: r.score,
      survivedSec: r.survivedSec,
      characterId: r.characterId,
      stageId: r.stageId,
      maxCombo: r.maxCombo,
      seed: r.seed,
      clientVersion: __APP_VERSION__,
      outcome: r.outcome,
      continued: r.continued,
    });
    this.saveLabel.textContent = `지난 밤들에 남겼어요 · ${rank}위`;
  }
}
