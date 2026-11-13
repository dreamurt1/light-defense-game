// 설정 (기획서 SettingsOverlay): 배경음악·효과음·진동, 닉네임, 조작 설명 1장. 홈의 ⚙와 일시정지에서 연다.
// 2026-11-06 가로 화면: '가로 화면'(PC만 — 휴대폰은 기기 방향), '전체 화면'(브라우저가 허락할 때만, 아이폰 사파리는 없음).
// 가로에서는 왼쪽(소리·닉네임) / 오른쪽(조작·화면) 두 열.
// 2026-11-13 컨셉 시연판: 소리·진동 토글이 실제로 연결됨(audio/Sound.ts가 onSettingsChange로 받음), '스틱 좌우 바꾸기',
// '이야기 다시 보기'(ui/Story.ts), '처음부터 다시'(진행 저장 지우기, 한 번 더 눌러 확인).
import { bus } from '../core/events';
import { Progress } from '../core/Progress';
import { RunState } from '../core/RunState';
import { NICKNAME_MAX, cleanNickname, loadSettings, saveSettings, type SettingsData } from '../core/Settings';
import { h } from './dom';
import { openStory } from './Story';
import { isTouchDevice, refreshLayout } from './layout';

type Toggle = 'bgm' | 'sfx' | 'vibration';

const TOGGLES: { id: Toggle; label: string }[] = [
  { id: 'bgm', label: '배경음악' },
  { id: 'sfx', label: '효과음' },
  { id: 'vibration', label: '진동' },
];

/** 두 스틱 조작 그림: 왼쪽 이동 스틱, 오른쪽 빛 스틱과 퍼지는 부채꼴 */
const controlArt = `
<svg viewBox="0 0 120 64" aria-hidden="true">
  <circle cx="22" cy="42" r="16" fill="#14152E" stroke="#F6F1E7" stroke-opacity=".6" stroke-width="2"/>
  <circle cx="16" cy="37" r="7" fill="#F6F1E7"/>
  <path d="M84 30 L108 8 A32 32 0 0 1 116 30 Z" fill="#FFC857" opacity=".55"/>
  <circle cx="84" cy="42" r="17" fill="#14152E" stroke="#FFC857" stroke-width="2"/>
  <circle cx="91" cy="35" r="8" fill="#FFC857"/>
</svg>`;

export class SettingsSheet {
  readonly el: HTMLElement;
  private data: SettingsData = loadSettings();
  private readonly switches: Record<Toggle, HTMLButtonElement>;
  /** PC 화면 방향: 켜짐 = 가로(창을 꽉 채움) */
  private readonly landscape: HTMLButtonElement;
  private readonly fullscreen: HTMLButtonElement;
  private readonly swapSticks: HTMLButtonElement;
  private readonly resetButton: HTMLButtonElement;
  private resetTimer: number | null = null;
  /** 조작 설명 첫 줄 (스틱 좌우에 따라 바뀜) */
  private readonly helpLine = h('span', {}, '왼쪽으로 걷고, 오른쪽으로 겨눠요');
  private readonly nickname: HTMLInputElement;
  private readonly panel: HTMLElement;

  constructor() {
    RunState.nickname = this.data.nickname;
    this.switches = {} as Record<Toggle, HTMLButtonElement>;
    const rows = TOGGLES.map(({ id, label }) => {
      const sw = h('button', { class: 'switch', type: 'button', role: 'switch', 'aria-label': label }, h('span', { class: 'switch__knob' }));
      sw.addEventListener('click', () => {
        this.data[id] = !this.data[id];
        this.persist();
      });
      this.switches[id] = sw;
      return h('div', { class: 'settings__row' }, h('span', {}, label), sw);
    });

    this.nickname = h('input', {
      class: 'settings__input',
      type: 'text',
      maxlength: NICKNAME_MAX,
      autocomplete: 'off',
      'aria-label': '닉네임',
    });
    this.nickname.addEventListener('change', () => {
      this.data.nickname = cleanNickname(this.nickname.value);
      this.nickname.value = this.data.nickname;
      RunState.nickname = this.data.nickname;
      this.persist();
    });

    const sw = (label: string) => h('button', { class: 'switch', type: 'button', role: 'switch', 'aria-label': label }, h('span', { class: 'switch__knob' }));
    this.landscape = sw('가로 화면');
    this.landscape.addEventListener('click', () => {
      this.data.orientation = this.data.orientation === 'landscape' ? 'portrait' : 'landscape';
      this.persist();
      refreshLayout();
    });
    this.fullscreen = sw('전체 화면');
    this.fullscreen.addEventListener('click', () => {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen().catch(() => undefined);
    });
    document.addEventListener('fullscreenchange', () => this.render());
    this.swapSticks = sw('스틱 좌우 바꾸기');
    this.swapSticks.addEventListener('click', () => {
      this.data.sticksSwapped = !this.data.sticksSwapped;
      this.persist();
    });

    const storyButton = h('button', { class: 'pill pill--secondary', type: 'button' }, '이야기 다시 보기');
    storyButton.addEventListener('click', () => {
      this.toggle(false);
      openStory();
    });
    // 처음부터 다시: 실수로 지우지 않게 3초 안에 한 번 더 눌러야 지운다
    this.resetButton = h('button', { class: 'pill pill--secondary', type: 'button' }, '처음부터 다시');
    this.resetButton.addEventListener('click', () => {
      if (this.resetTimer === null) {
        this.resetButton.textContent = '한 번 더 누르면 지워져요';
        this.resetButton.classList.add('is-confirm');
        this.resetTimer = window.setTimeout(() => this.disarmReset(), 3000);
        return;
      }
      this.disarmReset();
      Progress.reset();
      this.resetButton.textContent = '처음부터 다시 시작해요';
      window.setTimeout(() => this.disarmReset(), 1600);
    });
    const screenRows = [
      // 휴대폰은 기기를 돌리면 바뀌므로 PC에서만
      h('div', { class: 'settings__row' }, h('span', {}, '스틱 좌우 바꾸기'), this.swapSticks),
      isTouchDevice() ? null : h('div', { class: 'settings__row' }, h('span', {}, '가로 화면'), this.landscape),
      document.fullscreenEnabled ? h('div', { class: 'settings__row' }, h('span', {}, '전체 화면'), this.fullscreen) : null,
    ].filter((r): r is HTMLDivElement => r !== null);

    const close = h('button', { class: 'pill pill--primary', type: 'button' }, '닫기');
    close.addEventListener('click', () => this.toggle(false));

    const art = document.createElement('span');
    art.className = 'settings__art';
    art.innerHTML = controlArt;

    this.panel = h(
      'div',
      { class: 'sheet__panel', tabindex: -1 },
      h('h2', { class: 'sheet__title', id: 'settings-title' }, '설정'),
      h(
        'div',
        { class: 'settings__cols' },
        h(
          'div',
          { class: 'settings__col' },
          ...rows,
          h('label', { class: 'settings__label' }, '닉네임', this.nickname),
          h('div', { class: 'settings__buttons' }, storyButton, this.resetButton),
        ),
        h(
          'div',
          { class: 'settings__col' },
          h('div', { class: 'settings__label' }, '조작', h('div', { class: 'settings__help' }, art, h('span', { class: 'settings__help-text' }, this.helpLine, h('small', {}, 'PC는 WASD로 걷고, 마우스를 끌었다 놓아 빛을 보내요')))),
          ...screenRows,
        ),
      ),
      h('div', { class: 'sheet__actions sheet__actions--single' }, close),
    );
    this.el = h('section', { class: 'sheet sheet--settings', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'settings-title' }, this.panel);
    this.el.hidden = true;
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.toggle(false);
    });

    bus.on('ui:open-settings', () => this.toggle(true));
    // ESC: 열려 있으면 설정만 닫는다
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || this.el.hidden) return;
      // 게임(PlayScene)의 ESC 일시정지가 이 키를 다시 쓰지 않게 표시한다
      e.preventDefault();
      this.toggle(false);
    });
    bus.on('ui:navigate', () => this.toggle(false));
    this.render();
  }

  private persist(): void {
    saveSettings(this.data);
    this.render();
  }

  private render(): void {
    for (const { id } of TOGGLES) this.switches[id].setAttribute('aria-checked', String(this.data[id]));
    this.landscape.setAttribute('aria-checked', String(this.data.orientation === 'landscape'));
    this.swapSticks.setAttribute('aria-checked', String(this.data.sticksSwapped));
    this.helpLine.textContent = this.data.sticksSwapped ? '오른쪽으로 걷고, 왼쪽으로 겨눠요' : '왼쪽으로 걷고, 오른쪽으로 겨눠요';
    this.fullscreen.setAttribute('aria-checked', String(document.fullscreenElement !== null));
    this.nickname.value = this.data.nickname;
  }

  private disarmReset(): void {
    if (this.resetTimer !== null) window.clearTimeout(this.resetTimer);
    this.resetTimer = null;
    this.resetButton.textContent = '처음부터 다시';
    this.resetButton.classList.remove('is-confirm');
  }

  private toggle(open: boolean): void {
    const was = !this.el.hidden;
    this.el.hidden = !open;
    if (was !== open) bus.emit('ui:settings', { open });
    if (!open) this.disarmReset();
    if (open) {
      this.render();
      this.panel.focus({ preventScroll: true });
    }
  }
}
