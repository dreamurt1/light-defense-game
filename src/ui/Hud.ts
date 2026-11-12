// 플레이 중 HUD. 레퍼런스(reference/ChatGPT-Images)의 분위기를 따른다:
//   위 한 줄 = 달 · "밤 mm:ss" · 민트 진행 바(클라이맥스 눈금) · 점수 · 콤보
//   아래 = 하트 3개 + HP 바 · LP(빛) 바 · 중앙 광원 광도 · 켠 등불 수 · 일시정지  (2026-11-12 새 기획)
// 매 프레임이 아니라 이벤트가 올 때만 DOM을 고친다.
import { bus, type RunResult } from '../core/events';
import { GameData } from '../data';
import { isComboMilestone } from '../systems/ComboSystem';
import { bandOf } from '../systems/lightLevel';
import { formatScore, formatTime, h, replay, svg } from './dom';
import { crystalIcon, heartIcon, lampIcon, moonIcon, pauseIcon, starIcon, swooshArt } from './icons';

const G = GameData.game;
const BAND_NAMES = G.lightLevels.names;

function meter(cls: string, label: string, icon: string): { el: HTMLElement; fill: HTMLElement } {
  const fill = h('span', { class: 'meter__fill' });
  const el = h('div', { class: `meter ${cls}`, role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 100 }, svg(icon), h('span', { class: 'meter__track' }, fill));
  return { el, fill };
}

export class Hud {
  readonly el: HTMLElement;
  private readonly clock: HTMLElement;
  private readonly bar: HTMLElement;
  private readonly score: HTMLOutputElement;
  private readonly combo: HTMLElement;
  private readonly comboCount: HTMLElement;
  private readonly hearts: SVGSVGElement[];
  private readonly heartsBox: HTMLElement;
  private readonly hp: HTMLElement;
  private readonly lp: { el: HTMLElement; fill: HTMLElement };
  private readonly source: { el: HTMLElement; fill: HTMLElement };
  private readonly stations: HTMLElement;
  private readonly stationsCount: HTMLElement;
  private readonly edge: HTMLElement;
  private readonly burst: HTMLElement;
  private readonly burstText: HTMLElement;
  /** 홈의 `테스트` 판이면 시계 자리에 '테스트' */
  private test = false;

  constructor() {
    this.clock = h('span', { class: 'night-clock__time' }, '00:00');
    // 시간대 경계 눈금: 한밤중 시작, 클라이맥스(새벽 전) 시작
    const notches = [G.stage.phases.midnight[0], G.stage.climaxAt].map((at) => h('span', { class: 'night-bar__notch', style: `--at: ${at}` }));
    this.bar = h(
      'div',
      { class: 'night-bar', role: 'progressbar', 'aria-label': '아침까지', 'aria-valuemin': 0, 'aria-valuemax': 100 },
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

    // 루미: 하트 + HP
    this.hearts = Array.from({ length: G.stage.hearts }, () => svg(heartIcon));
    this.hp = h('span', { class: 'vitals__hp-fill' });
    this.heartsBox = h('div', { class: 'vitals__hearts' }, ...this.hearts);
    const vitals = h('div', { class: 'vitals', role: 'group', 'aria-label': '루미' }, this.heartsBox, h('span', { class: 'vitals__hp' }, this.hp));
    this.lp = meter('meter--lp', '빛 (LP)', starIcon);
    this.source = meter('meter--source', '중앙 광원', crystalIcon);
    this.stationsCount = h('span', { class: 'stations__count' }, '0/0');
    this.stations = h('div', { class: 'stations', role: 'img', 'aria-label': '켠 등불' }, svg(lampIcon), this.stationsCount);
    const pause = h('button', { class: 'round-button', type: 'button', 'aria-label': '일시정지' }, svg(pauseIcon));
    pause.addEventListener('click', () => bus.emit('ui:pause-toggle'));

    const bottom = h(
      'footer',
      { class: 'hud-bottom' },
      h(
        'div',
        { class: 'hud-bottom__row' },
        vitals,
        h('span', { class: 'hud-bottom__rule', 'aria-hidden': 'true' }),
        h('div', { class: 'meters' }, this.lp.el, this.source.el),
        this.stations,
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
      this.el.classList.remove('is-low', 'is-ended', 'is-down', 'is-source-low');
      this.test = e.test;
      this.el.classList.toggle('is-test', e.test);
      this.setNight(0, e.durationSec);
      this.combo.classList.add('is-empty');
      this.score.textContent = '0';
    });
    bus.on('night:tick', (e) => this.setNight(e.t, e.durationSec));
    bus.on('night:phase', (e) => (this.el.dataset.phase = e.phase));
    bus.on('score:change', (e) => (this.score.textContent = formatScore(e.score)));
    bus.on('combo:change', (e) => this.setCombo(e.combo, e.reason, e.windowSec));
    bus.on('player:vitals', (e) => this.setVitals(e.hp, e.maxHp, e.hearts));
    bus.on('player:hurt', () => replay(this.edge, 'is-hit'));
    bus.on('player:down', () => {
      this.el.classList.add('is-down');
      replay(this.heartsBox, 'is-lost');
    });
    bus.on('player:respawn', () => this.el.classList.remove('is-down'));
    bus.on('lp:change', (e) => this.setMeter(this.lp, (e.value - e.min) / (e.max - e.min), e.value));
    bus.on('central:change', (e) => {
      this.setMeter(this.source, (e.value - e.outAt) / (e.max - e.outAt), e.value);
      this.el.classList.toggle('is-source-low', bandOf(e.value, G.lightLevels.bands) === 0);
    });
    bus.on('central:hit', () => replay(this.source.el, 'is-hit'));
    bus.on('station:change', (e) => {
      this.stationsCount.textContent = `${e.lit}/${e.total}`;
      this.stations.classList.toggle('is-all', e.total > 0 && e.lit === e.total);
      this.stations.setAttribute('aria-label', `켠 등불 ${e.lit} / ${e.total}`);
    });
    bus.on('station:lit', () => replay(this.stations, 'is-bump'));
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
    this.bar.setAttribute('aria-valuenow', String(Math.round(p * 100)));
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

  private setVitals(hp: number, maxHp: number, hearts: number): void {
    this.hearts.forEach((el, i) => el.classList.toggle('is-empty', i >= hearts));
    this.hp.style.setProperty('--p', String(Math.max(0, Math.min(1, hp / maxHp))));
    const low = hp / maxHp <= G.player.lowHpRatio && hp > 0;
    this.el.classList.toggle('is-low', low);
    this.heartsBox.parentElement?.setAttribute('aria-label', `루미 하트 ${hearts} · HP ${Math.ceil(hp)} / ${maxHp}`);
  }

  /** 막대 + 광도 단계 이름(스크린 리더) */
  private setMeter(m: { el: HTMLElement; fill: HTMLElement }, ratio: number, value: number): void {
    const p = Math.max(0, Math.min(1, ratio));
    m.fill.style.setProperty('--p', String(p));
    const band = bandOf(value, G.lightLevels.bands);
    m.el.dataset.band = String(band);
    m.el.setAttribute('aria-valuenow', String(Math.round(value)));
    m.el.setAttribute('aria-valuetext', BAND_NAMES[band]);
  }
}
