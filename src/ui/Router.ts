// 화면 이동: 홈 → 선택 → 플레이 → 결과 → (다시 한 번: 선택 / 홈으로: 홈), 홈 → 지난 밤들·상점·설정.
// 메뉴 화면은 DOM 그림 배경(assets/backgrounds/home.webp)이라 씬을 돌리지 않고, 플레이 중에만 PlayScene이 돈다.
// 화면 상태는 #ui[data-screen]으로 CSS가 보여 준다.
// 2026-11-13 컨셉 시연판: 홈 '테스트' = 연습장(stageId 'practice', test=true). 처음 하는 유저의 '게임하기'는
// 이야기 → 튜토리얼(stageId 'tutorial')로 바로 들어온다(HomeScreen). 선택 화면으로 갈 때 튜토리얼·연습장 스테이지가
// 남아 있으면 아직 안 깬 가장 앞 스테이지로 되돌린다.
// <html data-screen>도 함께 바꾼다: 당겨서 새로고침(ui/PullRefresh.ts)이 판 밖에서만 움직이게 (2026-11-13).
import type Phaser from 'phaser';
import { bus, type ScreenId } from '../core/events';
import { Progress } from '../core/Progress';
import { RunState } from '../core/RunState';

interface ScreenView {
  show?(): void;
}

export class Router {
  private current: ScreenId | null = null;
  /** 판에 들어오기 전 화면 (결과 화면에서 뒤로가기 → 여기로, 2026-11-13) */
  private from: ScreenId = 'home';

  constructor(
    private readonly game: Phaser.Game,
    private readonly root: HTMLElement,
    private readonly views: Partial<Record<ScreenId, ScreenView>>,
  ) {
    bus.on('ui:assets-ready', () => this.go(initialScreen()));
    bus.on('ui:navigate', (e) => {
      if (e.to === 'select' && isSpecialStage(RunState.stageId)) RunState.stageId = Progress.nextStage;
      this.go(e.to);
    });
    bus.on('ui:start-run', () => this.play(false));
    bus.on('ui:start-test', () => this.play(true));
  }

  private play(test: boolean): void {
    RunState.test = test;
    if (test) RunState.stageId = 'practice';
    else if (RunState.stageId === 'practice') RunState.stageId = Progress.nextStage;
    this.go('play');
  }

  go(to: ScreenId): void {
    const scenes = this.game.scene;
    if (to === 'play' && this.current !== 'play') this.from = this.current ?? 'home';
    if (to === 'play') {
      RunState.newRun();
      if (scenes.isActive('Play')) scenes.stop('Play');
      scenes.start('Play');
    } else if (scenes.isActive('Play') || scenes.isPaused('Play')) {
      scenes.stop('Play');
    }
    this.current = to;
    this.root.dataset.screen = to;
    document.documentElement.dataset.screen = to;
    this.views[to]?.show?.();
  }

  get screen(): ScreenId | null {
    return this.current;
  }

  get cameFrom(): ScreenId {
    return this.from;
  }
}

function isSpecialStage(id: string): boolean {
  return id === 'tutorial' || id === 'practice';
}

/** 개발 중 `?screen=select` 같은 주소로 바로 열기 (빌드에는 영향 없음: 없으면 홈) */
function initialScreen(): ScreenId {
  if (!import.meta.env.DEV) return 'home';
  const s = new URLSearchParams(location.search).get('screen');
  return s === 'select' || s === 'shop' || s === 'ranking' || s === 'play' ? s : new URLSearchParams(location.search).has('autoplay') ? 'play' : 'home';
}
