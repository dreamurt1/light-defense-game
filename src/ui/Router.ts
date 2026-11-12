// 화면 이동: 홈 → 선택 → 플레이 → 결과 → (다시 한 번: 선택 / 홈으로: 홈), 홈 → 지난 밤들·상점·설정.
// 메뉴 화면은 DOM 그림 배경(assets/backgrounds/home.webp)이라 씬을 돌리지 않고, 플레이 중에만 PlayScene이 돈다.
// 화면 상태는 #ui[data-screen]으로 CSS가 보여 준다.
import type Phaser from 'phaser';
import { bus, type ScreenId } from '../core/events';
import { RunState } from '../core/RunState';

interface ScreenView {
  show?(): void;
}

export class Router {
  private current: ScreenId | null = null;

  constructor(
    private readonly game: Phaser.Game,
    private readonly root: HTMLElement,
    private readonly views: Partial<Record<ScreenId, ScreenView>>,
  ) {
    bus.on('ui:assets-ready', () => this.go(initialScreen()));
    bus.on('ui:navigate', (e) => this.go(e.to));
    bus.on('ui:start-run', () => this.play(false));
    bus.on('ui:start-test', () => this.play(true));
  }

  private play(test: boolean): void {
    RunState.test = test;
    this.go('play');
  }

  go(to: ScreenId): void {
    const scenes = this.game.scene;
    if (to === 'play') {
      RunState.newRun();
      if (scenes.isActive('Play')) scenes.stop('Play');
      scenes.start('Play');
    } else if (scenes.isActive('Play') || scenes.isPaused('Play')) {
      scenes.stop('Play');
    }
    this.current = to;
    this.root.dataset.screen = to;
    this.views[to]?.show?.();
  }

  get screen(): ScreenId | null {
    return this.current;
  }
}

/** 개발 중 `?screen=select` 같은 주소로 바로 열기 (빌드에는 영향 없음: 없으면 홈) */
function initialScreen(): ScreenId {
  if (!import.meta.env.DEV) return 'home';
  const s = new URLSearchParams(location.search).get('screen');
  return s === 'select' || s === 'shop' || s === 'ranking' || s === 'play' ? s : new URLSearchParams(location.search).has('autoplay') ? 'play' : 'home';
}
