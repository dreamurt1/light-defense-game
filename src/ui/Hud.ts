// 플레이 중 HUD. 레퍼런스(reference/ChatGPT-Images)의 분위기를 따른다:
//   위 한 줄 = 달 · "밤 mm:ss" · 민트 진행 바 · 점수 · 콤보 / 아래 = 불꽃 5개 · 시너지 게이지 · 일시정지.
// 매 프레임이 아니라 이벤트가 올 때만 DOM을 고친다.
import { bus, type RunResult } from '../core/events';
import { GameData } from '../data';
import { isComboMilestone } from '../systems/ComboSystem';
import { formatScore, formatTime, h, replay, svg } from './dom';
import { badgeStarIcon, flameIcon, moonIcon, pauseIcon, sproutIcon, starIcon, swooshArt } from './icons';

const FLAMES = 5;
const { phases, durationSec } = GameData.game.night;
const SYNERGY_MAX = GameData.game.synergy.max;

export class Hud {
  readonly el: HTMLElement;
  private readonly clock: HTMLElement;
  private readonly bar: HTMLElement;
  private readonly score: HTMLOutputElement;
  private readonly combo: HTMLElement;
  private readonly comboCount: HTMLElement;
  private readonly flames: SVGSVGElement[];
  private readonly synergy: HTMLElement;
  private readonly edge: HTMLElement;
  private readonly burst: HTMLElement;
  private readonly burstText: HTMLElement;
  /** 홈의 `테스트` 판이면 시계 자리에 '테스트' */
  private test = false;

  constructor() {
    this.clock = h('span', { class: 'night-clock__time' }, '00:00');
    // 시간대 경계 눈금: 초저녁|한밤중, 한밤중|새벽 전
    const notches = [phases.midnight[0], phases.predawn[0]].map((t) =>
      h('span', { class: 'night-bar__notch', style: `--at: ${t / durationSec}` }),
    );
    this.bar = h(
      'div',
      { class: 'night-bar', role: 'progressbar', 'aria-label': '남은 밤', 'aria-valuemin': 0, 'aria-valuemax': durationSec },
      h('span', { class: 'night-bar__fill' }),
      ...notches,
      h('span', { class: 'night-bar__marker' }, svg(starIcon)),
      h('span', { class: 'night-bar__dawn' }, svg(starIcon)),
    );

    this.score = h('output', { class: 'stat__value' }, '0');
    this.comboCount = h('span', { class: 'stat__value' });
    this.combo = h('div', { class: 'stat stat--combo' }, h('span', { class: 'stat__label' }, '콤보'), this.comboCount);

    const top = h(
      'header',
      { class: 'hud-top' },
      h(
        'div',
        { class: 'hud-top__row' },
        h('div', { class: 'night-clock' }, svg(moonIcon), h('span', { class: 'night-clock__label' }, '밤'), this.clock),
        this.bar,
        h('div', { class: 'stat stat--score' }, h('span', { class: 'stat__label' }, '점수'), this.score),
        h('span', { class: 'hud-top__rule', 'aria-hidden': 'true' }),
        this.combo,
      ),
    );

    this.flames = Array.from({ length: FLAMES }, () => svg(flameIcon));
    this.synergy = h('span', { class: 'synergy__fill' });
    const pause = h('button', { class: 'round-button', type: 'button', 'aria-label': '일시정지' }, svg(pauseIcon));
    pause.addEventListener('click', () => bus.emit('ui:pause-toggle'));

    const bottom = h(
      'footer',
      { class: 'hud-bottom' },
      h(
        'div',
        { class: 'hud-bottom__row' },
        h('div', { class: 'flames', role: 'img', 'aria-label': '등불' }, ...this.flames),
        h('span', { class: 'hud-bottom__rule', 'aria-hidden': 'true' }),
        h(
          'div',
          { class: 'synergy', role: 'progressbar', 'aria-label': '시너지', 'aria-valuemin': 0, 'aria-valuemax': SYNERGY_MAX },
          svg(sproutIcon),
          h('span', { class: 'synergy__track' }, this.synergy),
        ),
        // 장착물 칸: 레퍼런스의 자리. 장착물은 M3라 지금은 꺼진 상태로 비워 둔다
        h('span', { class: 'slot', role: 'img', 'aria-label': '장착물 칸' }, svg(badgeStarIcon)),
        pause,
      ),
    );

    // 콤보 단계마다 터지는 큰 금빛 글자 + 별
    this.burstText = h('p', { class: 'combo-burst__text' });
    this.burst = h(
      'div',
      { class: 'combo-burst', 'aria-hidden': 'true' },
      svg(swooshArt),
      ...Array.from({ length: 6 }, (_, i) => h('span', { class: 'combo-burst__star', style: `--i: ${i}` }, svg(starIcon))),
      this.burstText,
    );

    this.edge = h('div', { class: 'edge', 'aria-hidden': 'true' });
    this.el = h('div', { class: 'hud' }, this.edge, this.burst, top, bottom);
    this.listen();
  }

  private listen(): void {
    bus.on('run:start', (e) => {
      this.el.classList.remove('is-low', 'is-ended');
      this.test = e.test;
      this.el.classList.toggle('is-test', e.test);
      this.setNight(0, e.durationSec);
      this.setFlames(e.hp, e.maxHp);
      this.setSynergy(0);
      this.combo.classList.add('is-empty');
      this.score.textContent = '0';
    });
    bus.on('night:tick', (e) => this.setNight(e.t, e.durationSec));
    bus.on('night:phase', (e) => (this.el.dataset.phase = e.phase));
    bus.on('score:change', (e) => (this.score.textContent = formatScore(e.score)));
    bus.on('combo:change', (e) => this.setCombo(e.combo, e.reason, e.windowSec));
    bus.on('synergy:change', (e) => this.setSynergy(e.value));
    bus.on('synergy:burst', () => replay(this.synergy.parentElement as HTMLElement, 'is-full'));
    bus.on('lantern:damage', (e) => {
      this.setFlames(e.hp, e.maxHp);
      replay(this.edge, 'is-hit');
    });
    bus.on('lantern:heal', (e) => this.setFlames(e.hp, e.maxHp));
    bus.on('run:pause', (e) => this.el.classList.toggle('is-paused', e.paused));
    // 판이 끝나면 위 시계를 결과의 버틴 시간과 같게 맞춘다
    const end = (e: { result: RunResult }) => {
      this.el.classList.add('is-ended');
      this.clock.textContent = formatTime(e.result.survivedSec);
    };
    bus.on('game:over', end);
    bus.on('game:clear', end);
  }

  private setNight(t: number, duration: number): void {
    const p = Math.min(1, t / duration);
    this.bar.style.setProperty('--p', String(p));
    this.bar.setAttribute('aria-valuenow', String(Math.floor(t)));
    this.clock.textContent = this.test ? '테스트' : formatTime(t);
    this.bar.querySelectorAll<HTMLElement>('.night-bar__notch').forEach((n) => {
      n.classList.toggle('is-passed', p >= Number(n.style.getPropertyValue('--at')));
    });
  }

  private setCombo(combo: number, reason: string, windowSec: number): void {
    this.combo.classList.toggle('is-empty', combo === 0);
    if (combo === 0) return;
    this.comboCount.textContent = `×${combo}`;
    this.combo.style.setProperty('--window', `${windowSec}s`);
    if (reason === 'gain') {
      replay(this.combo, 'is-bump');
      this.combo.classList.remove('is-drop');
      if (isComboMilestone(combo)) this.celebrate(combo);
    } else {
      replay(this.combo, 'is-drop');
    }
    replay(this.combo, 'is-running');
  }

  private celebrate(combo: number): void {
    this.burstText.textContent = `콤보 ×${combo}`;
    replay(this.burst, 'is-on');
  }

  private setSynergy(value: number): void {
    const p = Math.max(0, Math.min(1, value / SYNERGY_MAX));
    this.synergy.style.setProperty('--p', String(p));
    this.synergy.closest('.synergy')?.setAttribute('aria-valuenow', String(Math.round(value)));
  }

  private setFlames(hp: number, maxHp: number): void {
    const per = maxHp / FLAMES;
    this.flames.forEach((f, i) => {
      const level = Math.max(0, Math.min(1, (hp - i * per) / per));
      f.classList.toggle('is-out', level <= 0);
      f.style.setProperty('--level', String(level));
    });
    const low = hp / maxHp <= GameData.game.lantern.lowHpRatio && hp > 0;
    this.el.classList.toggle('is-low', low);
    this.flames[0].parentElement?.setAttribute('aria-label', `등불 ${Math.ceil(hp)} / ${maxHp}`);
  }
}
