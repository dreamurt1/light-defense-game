// 결과: 게임 오버(등불이 꺼지고 패널이 올라옴) / 클리어(새벽빛) 두 톤.
// 배치는 UI Screen Sheet(마을 위 가운데 패널, 통계 줄, 버튼 세 개), 문구·버튼은 기획서. 버틴 시간·되찾은 이웃은 부제(기획서 문구)에 있어 통계 줄에서 빼고 점수·최대 콤보만 둔다.
// `다시 한 번` → 선택 화면(직전 선택이 기본값), `홈으로` → 홈, `지난 밤들에 남기기` → 이 기기 랭킹에 등록.
import { bus, type RunResult } from '../core/events';
import { RunState } from '../core/RunState';
import { seedLabel } from '../core/rng';
import type { Ranking } from '../services/Ranking';
import { localPlayerId } from '../services/LocalRanking';
import { formatScore, formatTime, h, prefersReducedMotion, svg } from './dom';
import { homeIcon, playIcon, podiumIcon } from './icons';

const COUNT_UP_MS = 900;

function statRow(label: string, value: HTMLElement): HTMLElement {
  return h('div', { class: 'result__row' }, h('dt', {}, label), h('dd', {}, value));
}

export class ResultSheet {
  readonly el: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly title: HTMLElement;
  private readonly subtitle: HTMLElement;
  private readonly score = h('strong', { class: 'result__score' });
  private readonly combo = h('span');
  private readonly witchLine: HTMLElement;
  private readonly seed: HTMLElement;
  private readonly save: HTMLButtonElement;
  private readonly saveLabel: HTMLElement;
  private result: RunResult | null = null;
  private countFrame = 0;

  constructor(private readonly ranking: Ranking) {
    this.title = h('h2', { class: 'sheet__title', id: 'result-title' });
    this.subtitle = h('p', { class: 'sheet__subtitle' });
    this.witchLine = h('p', { class: 'result__witch' }, '노월도 조금 깨어났어요');
    this.seed = h('small', { class: 'result__seed' });

    const again = h('button', { class: 'pill pill--primary', type: 'button' }, svg(playIcon), '다시 한 번');
    again.addEventListener('click', () => bus.emit('ui:navigate', { to: 'select' }));
    const village = h('button', { class: 'pill pill--secondary', type: 'button' }, svg(homeIcon), '홈으로');
    village.addEventListener('click', () => bus.emit('ui:navigate', { to: 'home' }));
    this.saveLabel = h('span', {}, '지난 밤들에 남기기');
    this.save = h('button', { class: 'pill pill--ghost', type: 'button' }, svg(podiumIcon), this.saveLabel);
    this.save.addEventListener('click', () => void this.submit());

    // 시트를 열면 버튼이 아니라 패널에 포커스를 둔다: 탭 사용자에게 포커스 링을 띄우지 않고, 키보드는 Tab으로 버튼에 간다
    this.panel = h(
      'div',
      { class: 'sheet__panel', tabindex: -1 },
      this.title,
      this.subtitle,
      h(
        'dl',
        { class: 'result__stats' },
        statRow('오늘 밤 점수', this.score),
        statRow('최대 콤보', this.combo),
      ),
      this.witchLine,
      h('div', { class: 'sheet__actions' }, again, village, this.save),
      this.seed,
    );
    this.el = h('section', { class: 'sheet sheet--result', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'result-title' }, this.panel);
    this.el.hidden = true;

    bus.on('game:over', (e) => this.open(e.result));
    bus.on('game:clear', (e) => this.open(e.result));
    bus.on('run:start', () => this.close());
    bus.on('ui:navigate', () => this.close());
  }

  private open(result: RunResult): void {
    this.result = result;
    const clear = result.outcome === 'clear';
    this.el.dataset.outcome = result.outcome;
    this.title.textContent = clear ? '새벽이 왔어요' : '오늘 밤은 여기까지';
    this.subtitle.textContent = clear
      ? `등불은 아직 켜져 있어요 · 되찾은 이웃 ${result.returnedCount}명`
      : `버틴 시간 ${formatTime(result.survivedSec)} · 되찾은 이웃 ${result.returnedCount}명`;
    this.combo.textContent = `×${result.maxCombo}`;
    this.witchLine.hidden = !result.witchReturned;
    this.seed.textContent = `#${seedLabel(result.seed)}`;
    this.save.disabled = false;
    this.saveLabel.textContent = '지난 밤들에 남기기';
    this.el.hidden = false;
    this.countUp(result.score);
    this.panel.focus({ preventScroll: true });
  }

  private close(): void {
    cancelAnimationFrame(this.countFrame);
    this.el.hidden = true;
    this.result = null;
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
      equipmentId: r.equipmentId,
      maxCombo: r.maxCombo,
      seed: r.seed,
      clientVersion: __APP_VERSION__,
      outcome: r.outcome,
      continued: r.continued,
    });
    this.saveLabel.textContent = `지난 밤들에 남겼어요 · ${rank}위`;
  }
}
