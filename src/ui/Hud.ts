// 플레이 중 HUD. 레퍼런스(reference/ChatGPT-Images)의 분위기를 따른다:
//   위 한 줄 = 달 · "밤 mm:ss" · 민트 진행 바(클라이맥스 눈금) · 점수 · 콤보
//   2026-11-23 밤 나들이 v3: "밤 {n} · mm:ss", 점수 = 런 누적, 끝에 ★빛 레벨(민트)·✦별가루(호박) — 런의 밤에만. 하트는 최대 4칸
//   아래 = 하트 3개 + HP 바 · LP(빛) 바 · 중앙 광원 HP(2026-11-14, 광도 = HP 비례) · 켠 등불 수 · 일시정지  (2026-11-12 새 기획)
// 매 프레임이 아니라 이벤트가 올 때만 DOM을 고친다.
import { bus, type RunResult } from '../core/events';
import { GameData } from '../data';
import { isComboMilestone } from '../systems/ComboSystem';
import { bandOf } from '../systems/lightLevel';
import { formatScore, formatTime, h, replay, svg } from './dom';
import { crystalIcon, heartIcon, lampIcon, moonIcon, pauseIcon, starIcon, swooshArt } from './icons';

const G = GameData.game;
const BAND_NAMES = G.lightLevels.names;

/**
 * @param short 아이콘 자리에 보이는 짧은 이름 (2026-11-13 라이언: 하단 게이지에 HP·LP를 알기 쉽게).
 * 아이콘 옆에 덧붙이면 가로 화면의 짧은 막대가 거의 사라져서 아이콘 자리를 쓴다
 */
function meter(cls: string, label: string, icon: string, short?: string): { el: HTMLElement; fill: HTMLElement } {
  const fill = h('span', { class: 'meter__fill' });
  const head = short ? h('span', { class: 'gauge-label', 'aria-hidden': 'true' }, short) : svg(icon);
  const el = h('div', { class: `meter ${cls}`, role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 100 }, head, h('span', { class: 'meter__track' }, fill));
  return { el, fill };
}

export class Hud {
  readonly el: HTMLElement;
  private readonly clock: HTMLElement;
  private readonly nightLabel = h('span', { class: 'night-clock__label' }, '밤');
  private readonly levelValue = h('span', { class: 'stat__value' });
  private readonly level: HTMLElement;
  private readonly dustValue = h('span', { class: 'stat__value' });
  private readonly dust: HTMLElement;
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
  /** 아이템 칸 2개 (2026-11-13 컨셉 시연판: 누르면 씀, PC Q·E) */
  private readonly slots: HTMLButtonElement[];
  /** 홈의 `테스트` 판이면 시계 자리에 '테스트' */
  private test = false;
  /** 끝나지 않는 판에서 시계 자리에 보일 이름 */
  private endlessLabel = '';

  constructor() {
    this.clock = h('span', { class: 'night-clock__time' }, '00:00');
    // 시간대 경계 눈금: 한밤중 시작, 클라이맥스(새벽 전) 시작
    const notches = [G.stage.phases.midnight[0], G.stage.climaxAt].map((at) => h('span', { class: 'night-bar__notch', style: `--at: ${at}` }));
    this.bar = h(
      'div',
      { class: 'night-bar', role: 'progressbar', 'aria-label': '아침까지', 'aria-valuemin': 0, 'aria-valuemax': 100 },
      h('span', { class: 'night-bar__fill' }),
      ...notches,
      // 별은 막대 폭 전체 띠(track) 안에 두고 띠를 transform으로 옮긴다(합성기만 일함, 2026-11-20)
      h('span', { class: 'night-bar__track' }, h('span', { class: 'night-bar__marker' }, svg(starIcon))),
      h('span', { class: 'night-bar__dawn' }, svg(starIcon)),
    );

    this.score = h('output', { class: 'stat__value' }, '0');
    this.comboCount = h('span', { class: 'stat__value' });
    this.combo = h('div', { class: 'stat stat--combo' }, h('span', { class: 'stat__label' }, '콤보'), this.comboCount);
    this.level = h('div', { class: 'stat stat--level', 'aria-label': '빛 레벨' }, h('span', { class: 'stat__mark', 'aria-hidden': 'true' }, '★'), this.levelValue);
    this.dust = h('div', { class: 'stat stat--dust', 'aria-label': '별가루' }, h('span', { class: 'stat__mark', 'aria-hidden': 'true' }, '✦'), this.dustValue);

    const top = h(
      'header',
      { class: 'hud-top' },
      h(
        'div',
        { class: 'hud-top__row' },
        h('div', { class: 'night-clock' }, svg(moonIcon), this.nightLabel, this.clock),
        this.bar,
        h('div', { class: 'stat stat--score' }, h('span', { class: 'stat__label' }, '점수'), this.score),
        h('span', { class: 'hud-top__rule', 'aria-hidden': 'true' }),
        this.combo,
        this.level,
        this.dust,
      ),
    );

    // 루미: 하트 + HP
    this.hearts = Array.from({ length: Math.max(G.stage.hearts, G.run.maxHearts) }, () => svg(heartIcon));
    this.hp = h('span', { class: 'vitals__hp-fill' });
    this.heartsBox = h('div', { class: 'vitals__hearts' }, ...this.hearts);
    const hpRow = h('div', { class: 'vitals__hp-row' }, h('span', { class: 'gauge-label', 'aria-hidden': 'true' }, 'HP'), h('span', { class: 'vitals__hp', role: 'img', 'aria-label': 'HP' }, this.hp));
    const vitals = h('div', { class: 'vitals', role: 'group', 'aria-label': '루미' }, this.heartsBox, hpRow);
    this.lp = meter('meter--lp', '빛 (LP)', starIcon, 'LP');
    this.source = meter('meter--source', '중앙 광원 HP', crystalIcon); // 글자 없이 결정 아이콘 (2026-11-13 라이언: HUD 글자는 HP·LP로 충분)
    this.stationsCount = h('span', { class: 'stations__count' }, '0/0');
    this.stations = h('div', { class: 'stations', role: 'img', 'aria-label': '켠 등불' }, svg(lampIcon), this.stationsCount);
    // 칸 2개, 아침 준비물 큰 주머니면 3개 (PC Q·E·R, 2026-11-23)
    this.slots = [0, 1, 2].map((i) => {
      const b = h('button', { class: 'item-slot', type: 'button', 'aria-label': `아이템 칸 ${i + 1}`, 'data-key': ['Q', 'E', 'R'][i] }) as HTMLButtonElement;
      // 2026-11-13 라이언: 이동 중엔 아이템이 안 눌림. 휴대폰은 이동 스틱을 누른 손가락이 있으면 두 번째 손가락에 click을 보내지 않으므로
      // 누르는 순간(pointerdown)에 쓴다. 키보드(Enter·Space)로 누른 click(detail 0)만 따로 받는다
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        bus.emit('ui:use-item', { slot: i });
      });
      b.addEventListener('click', (e) => {
        if (e.detail === 0) bus.emit('ui:use-item', { slot: i });
      });
      return b;
    });
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
        h('div', { class: 'item-slots' }, ...this.slots),
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

  private setSlots(slots: (string | null)[]): void {
    // 큰 주머니면 세 칸 — 세로 화면에서 막대 폭을 남기려고 간격을 줄인다 (run.css)
    this.el.classList.toggle('has-three-slots', slots.length >= 3);
    this.slots.forEach((b, i) => {
      b.hidden = i >= slots.length;
      const id = slots[i] ?? null;
      b.replaceChildren();
      b.classList.toggle('is-empty', !id);
      b.disabled = !id;
      const def = id ? GameData.items.find((d) => d.id === id) : null;
      b.title = def ? def.name : '빈 칸';
      if (def) b.append(h('img', { src: `assets/items/item-${def.id}.png`, alt: def.name, width: 40, height: 40 }));
    });
  }

  private listen(): void {
    bus.on('run:start', (e) => {
      this.el.classList.remove('is-low', 'is-ended', 'is-down', 'is-source-low');
      // 시계 대신 판 이름('트라이얼')은 끝나지 않는 판만 (2026-11-14: 스테이지 체험판은 시계·진행 바 그대로)
      const endless = GameData.stages.find((s) => s.id === e.stageId && s.endless);
      this.test = !!endless;
      this.endlessLabel = endless?.name ?? '';
      this.el.classList.toggle('is-test', this.test);
      this.setNight(0, e.durationSec);
      this.combo.classList.add('is-empty');
      this.score.textContent = '0';
      // 런의 밤: '밤 n', ★빛 레벨·✦별가루
      const night = e.night !== undefined;
      this.nightLabel.textContent = night ? `밤 ${e.night}` : '밤';
      this.level.hidden = !night;
      this.dust.hidden = !night;
      this.levelValue.textContent = String(e.level ?? 1);
      this.dustValue.textContent = String(e.dust ?? 0);
    });
    bus.on('night:tick', (e) => this.setNight(e.t, e.durationSec));
    // 빛 레벨·별가루는 밤 도중에도 바뀐다 (2026-11-23)
    bus.on('growth:change', (e) => {
      this.levelValue.textContent = String(e.level);
      if (e.ups > 0) replay(this.level, 'is-bump');
    });
    bus.on('dust:change', (e) => {
      this.dustValue.textContent = String(e.dust);
      replay(this.dust, 'is-bump');
    });
    bus.on('item:slots', (e) => this.setSlots(e.slots));
    bus.on('night:phase', (e) => (this.el.dataset.phase = e.phase));
    bus.on('score:change', (e) => (this.score.textContent = formatScore(e.score)));
    bus.on('combo:change', (e) => this.setCombo(e.combo, e.reason, e.windowSec));
    bus.on('player:vitals', (e) => this.setVitals(e.hp, e.maxHp, e.hearts, e.maxHearts));
    bus.on('player:hurt', () => replay(this.edge, 'is-hit'));
    bus.on('player:down', () => {
      this.el.classList.add('is-down');
      replay(this.heartsBox, 'is-lost');
    });
    bus.on('player:respawn', () => this.el.classList.remove('is-down'));
    bus.on('lp:change', (e) => this.setMeter(this.lp, (e.value - e.min) / (e.max - e.min), e.value));
    bus.on('central:change', (e) => {
      // 막대 = HP, 색 단계·'낮음' 잔불 맥박 = 광도(HP 비례 0~100)
      const light = (e.hp / e.maxHp) * 100;
      this.setMeter(this.source, e.hp / e.maxHp, light);
      this.el.classList.toggle('is-source-low', bandOf(light, G.lightLevels.bands) === 0);
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
    this.clock.textContent = this.test ? this.endlessLabel : formatTime(t);
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

  private setVitals(hp: number, maxHp: number, hearts: number, maxHearts: number): void {
    // 하트 4칸(완전 승리·여분 하트)이면 하트를 조금 작게 — 하트 상자 폭은 그대로
    this.heartsBox.classList.toggle('is-four', maxHearts >= 4);
    this.hearts.forEach((el, i) => {
      el.classList.toggle('is-empty', i >= hearts);
      el.style.display = i >= maxHearts ? 'none' : '';
    });
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
