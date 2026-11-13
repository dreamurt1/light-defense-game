// 두 스틱 (브롤스타즈식, 2026-11-04 라이언 지시): 왼쪽 아래 이동, 오른쪽 아래 빛.
//  - 이동: 손잡이를 미는 방향과 세기로 걷는다 → input:move
//  - 빛: 끌면 범위가 보이고(input:aim) 놓으면 발사(input:fire). 짧게 탭하면 자동 조준, 끌었다 가운데로 되돌려 놓으면 취소
// 손가락 두 개를 함께 쓰도록 스틱마다 pointerId를 붙잡는다. 게임과는 이벤트로만 주고받는다.
// 설정 '스틱 좌우 바꾸기'(2026-11-13)를 켜면 .sticks--swapped 하나로 이동 스틱이 오른쪽, 빛 스틱이 왼쪽에 온다(sticks.css).
import { bus } from '../core/events';
import { loadSettings, onSettingsChange } from '../core/Settings';
import { characterById, GameData } from '../data';
import { AimStick } from '../systems/aimStick';
import { stickVector } from '../systems/movement';
import { h, svg } from './dom';
import { starIcon } from './icons';

const DEADZONE = GameData.game.controls.deadzone;
/** 손잡이가 움직일 수 있는 거리 = 바닥 원 반지름 × 이 비율 */
const KNOB_TRAVEL = 0.62;

interface StickParts {
  el: HTMLElement;
  base: HTMLElement;
  knob: HTMLElement;
}

interface StickHandlers {
  start?(): void;
  move(dx: number, dy: number): void;
  end(): void;
}

/**
 * 원판 무늬 (LUMI 시트 '조작 UI'를 벡터로 다시 그림): 이동 = 상하좌우 작은 세모, 빛 = 십자 눈금 + 안쪽 고리
 */
const DECO: Record<'move' | 'light', string> = {
  move: `<svg class="stick__deco" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="40" fill="none" stroke="#D9CCFF" stroke-opacity=".22" stroke-width="1.5"/>
    <g fill="#E3D9FF" fill-opacity=".8">
      <path d="M50 6 l6 8 h-12 z"/><path d="M50 94 l6 -8 h-12 z"/><path d="M6 50 l8 6 v-12 z"/><path d="M94 50 l-8 6 v-12 z"/>
    </g>
  </svg>`,
  light: `<svg class="stick__deco" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="34" fill="none" stroke="#FFE3A0" stroke-opacity=".35" stroke-width="1.5"/>
    <g stroke="#FFE3A0" stroke-opacity=".75" stroke-width="2.5" stroke-linecap="round">
      <path d="M50 5 v9"/><path d="M50 86 v9"/><path d="M5 50 h9"/><path d="M86 50 h9"/>
    </g>
  </svg>`,
};

function stick(kind: 'move' | 'light', label: string, knobContent?: Node): StickParts {
  const knob = h('span', { class: 'stick__knob' }, knobContent ?? '');
  const base = h('span', { class: 'stick__base' }, svg(DECO[kind]), knob);
  const el = h('div', { class: `stick stick--${kind}`, 'aria-label': label }, base);
  return { el, base, knob };
}

export class Sticks {
  readonly el: HTMLElement;
  private readonly light: StickParts;
  private readonly aim = new AimStick(DEADZONE);
  private readonly releases: (() => void)[] = [];

  constructor() {
    const move = stick('move', '이동');
    this.light = stick('light', '빛', svg(starIcon));
    this.el = h('div', { class: 'sticks' }, move.el, this.light.el);
    const swap = (on: boolean) => this.el.classList.toggle('sticks--swapped', on);
    swap(loadSettings().sticksSwapped);
    onSettingsChange((d) => {
      // 바뀌는 순간 잡고 있던 손가락은 놓은 것으로 (손잡이가 엉뚱한 쪽에 남지 않게)
      if (this.el.classList.contains('sticks--swapped') !== d.sticksSwapped) this.releaseAll();
      swap(d.sticksSwapped);
    });

    this.bind(move, {
      move: (dx, dy) => bus.emit('input:move', stickVector(dx, dy, DEADZONE)),
      end: () => bus.emit('input:move', { x: 0, y: 0 }),
    });

    this.bind(this.light, {
      start: () => this.aim.down(),
      move: (dx, dy) => {
        const was = this.aim.active;
        const now = this.aim.move(dx, dy);
        if (now || was) bus.emit('input:aim', { active: now, angle: this.aim.direction, power: this.aim.power });
        this.light.el.classList.toggle('is-aiming', now);
        this.light.el.classList.toggle('is-cancel', this.aim.cancelling);
      },
      end: () => {
        const r = this.aim.up();
        bus.emit('input:aim', { active: false, angle: this.aim.direction, power: this.aim.power });
        this.light.el.classList.remove('is-aiming', 'is-cancel');
        if (r?.kind === 'fire') bus.emit('input:fire', { angle: r.angle, power: r.power });
        else if (r?.kind === 'auto') bus.emit('input:fire', { angle: null });
      },
    });

    // 빛 대기: 쏜 뒤 대기 시간 동안 빛 스틱 테두리가 차오른다
    bus.on('light:cast', (e) => {
      const sec = GameData.game.light.cooldownSec * characterById(e.characterId).lightCooldownMultiplier;
      this.light.el.style.setProperty('--cool', `${sec}s`);
      this.light.el.classList.remove('is-cooling');
      void this.light.el.offsetWidth;
      this.light.el.classList.add('is-cooling');
    });
    bus.on('light:ready', () => this.light.el.classList.remove('is-cooling'));
    // 판이 바뀌거나 끝나면 잡고 있던 손가락을 놓은 것으로
    bus.on('run:start', () => this.releaseAll());
    bus.on('game:over', () => this.releaseAll());
    bus.on('game:clear', () => this.releaseAll());
  }

  private releaseAll(): void {
    this.releases.forEach((r) => r());
    this.light.el.classList.remove('is-cooling');
  }

  private bind(parts: StickParts, on: StickHandlers): void {
    let drag: { id: number; cx: number; cy: number; r: number } | null = null;

    const reset = () => {
      parts.knob.style.transform = '';
      parts.el.classList.remove('is-active');
    };
    const finish = (e?: PointerEvent) => {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      drag = null;
      reset();
      on.end();
    };
    const update = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      let dx = (e.clientX - drag.cx) / drag.r;
      let dy = (e.clientY - drag.cy) / drag.r;
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        dx /= len;
        dy /= len;
      }
      parts.knob.style.transform = `translate(${dx * drag.r * KNOB_TRAVEL}px, ${dy * drag.r * KNOB_TRAVEL}px)`;
      on.move(dx, dy);
    };

    parts.el.addEventListener('pointerdown', (e) => {
      if (drag) return;
      e.preventDefault();
      const rect = parts.base.getBoundingClientRect();
      drag = { id: e.pointerId, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, r: rect.width / 2 };
      parts.el.setPointerCapture(e.pointerId);
      parts.el.classList.add('is-active');
      on.start?.();
      update(e);
    });
    parts.el.addEventListener('pointermove', update);
    parts.el.addEventListener('pointerup', finish);
    parts.el.addEventListener('pointercancel', finish);
    parts.el.addEventListener('lostpointercapture', finish);
    this.releases.push(() => finish());
  }
}
