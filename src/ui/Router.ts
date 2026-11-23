// 화면 이동: 홈 → 선택 → 플레이 → 결과 → (다시 한 번: 선택 / 홈으로: 홈), 홈 → 지난 밤들·상점·설정.
// 메뉴 화면은 DOM 그림 배경(assets/backgrounds/home.webp)이라 씬을 돌리지 않고, 플레이 중에만 PlayScene이 돈다.
// 화면 상태는 #ui[data-screen]으로 CSS가 보여 준다.
// 2026-11-14 라이언: 홈 '테스트' = 고르기 창(ui/TestSheet) — 각 스테이지 실제 체험판 · 트라이얼(stageId 'trial', 고정된 적 연습장). test=true. 처음 하는 유저의 '게임하기'는
// 이야기 → 튜토리얼(stageId 'tutorial')로 바로 들어온다(HomeScreen). 선택 화면으로 갈 때 튜토리얼·연습장 스테이지가
// 남아 있으면 아직 안 깬 가장 앞 스테이지로 되돌린다.
// 2026-11-23 밤 나들이 v3: 정식 판 = 런(stageId 'night' + RunState.run, core/runFlow.ts가 만듦), 이긴 밤 뒤에는 아침 화면('morning', 씬을 멈춤).
// 테스트 '밤 n 체험' = stageId 'night' + 그 밤만 담은 런(test, 남지 않음). 새로고침하면 체험판·튜토리얼은 그 판을 다시, 런은 홈의 '이어서 하기'로.
// <html data-screen>도 함께 바꾼다: 당겨서 새로고침(ui/PullRefresh.ts)이 판 밖에서만 움직이게 (2026-11-13).
import type Phaser from 'phaser';
import { bus, type ScreenId } from '../core/events';
import { NIGHT_STAGE, RunState } from '../core/RunState';
import { makeSeed } from '../core/rng';
import { GameData, type CharacterId } from '../data';
import { newRunData } from '../systems/nightRun';

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
    // 테스트 판·튜토리얼 판에서 새로고침하면 그 판을 처음부터 다시 (2026-11-18 라이언), 아니면 홈(개발 주소 옵션)
    bus.on('ui:assets-ready', () => {
      const again = reloadedRun();
      if (again?.test) this.play(true, again.stageId, again.characterId ?? undefined, again.night, again.mapId);
      else if (again) {
        RunState.stageId = again.stageId;
        this.play(false);
      } else this.go(initialScreen());
    });
    bus.on('ui:navigate', (e) => {
      if (e.to === 'select' && isSpecialStage(RunState.stageId)) RunState.stageId = NIGHT_STAGE;
      this.go(e.to);
    });
    bus.on('ui:start-run', () => this.play(false));
    bus.on('ui:start-test', (e) => this.play(true, e.stageId, e.characterId, e.night, e.mapId));
  }

  private play(test: boolean, stageId?: string, characterId?: CharacterId, night?: number, mapId?: string | null): void {
    RunState.test = test;
    // 트라이얼에서 고른 등불지기는 그 테스트 판에서만 (일시정지의 '다시 하기'는 씬만 다시 시작하므로 그대로 이어짐)
    RunState.trialCharacterId = test ? (characterId ?? null) : null;
    if (test) {
      RunState.stageId = stageId ?? 'trial';
      RunState.testMapId = mapId ?? null;
      // 밤 n 체험: 그 밤만 담은 런 (진행·지난 밤들에 남지 않음)
      RunState.run = RunState.stageId === NIGHT_STAGE ? { ...newRunData(makeSeed(), RunState.keeperId, GameData.game.stage.hearts), night: Math.max(1, night ?? 1) } : null;
    } else {
      // 정식 판은 트라이얼로 들어가지 않는다 (튜토리얼은 정식 시작이므로 그대로). 런이 없으면 새 런 (core/runFlow.ts가 보통 만들어 둔다)
      if (RunState.stageId === 'trial') RunState.stageId = NIGHT_STAGE;
      if (RunState.stageId === NIGHT_STAGE && !RunState.run) RunState.run = newRunData(makeSeed(), RunState.characterId, GameData.game.stage.hearts);
    }
    // 새로고침으로 다시 할 판: 테스트 판(트라이얼·체험)과 튜토리얼 판 (런은 저장으로 홈의 '이어서 하기')
    rememberRun(test || RunState.stageId === 'tutorial' ? { stageId: RunState.stageId, characterId: characterId ?? null, test, night: RunState.run?.night, mapId: RunState.testMapId } : null);
    this.go('play');
  }

  go(to: ScreenId): void {
    const scenes = this.game.scene;
    // 판에 들어오기 전 화면 (아침 화면에서 다음 밤으로 가도 그대로 — 결과에서 뒤로가기는 메뉴 화면으로)
    if (to === 'play' && this.current !== 'play' && this.current !== 'morning') this.from = this.current ?? 'home';
    if (to === 'play') {
      RunState.newRun();
      if (scenes.isActive('Play')) scenes.stop('Play');
      scenes.start('Play');
    } else {
      if (scenes.isActive('Play') || scenes.isPaused('Play')) scenes.stop('Play');
      rememberRun(null); // 판을 떠나면 새로고침해도 홈부터
    }
    this.current = to;
    this.root.dataset.screen = to;
    document.documentElement.dataset.screen = to;
    this.views[to]?.show?.();
    bus.emit('ui:screen', { to });
  }

  get screen(): ScreenId | null {
    return this.current;
  }

  get cameFrom(): ScreenId {
    return this.from;
  }
}

/**
 * 새로고침으로 다시 할 판 기억 (2026-11-18 라이언: 트라이얼·튜토리얼 판에서 새로고침하면 그 판을 다시 플레이).
 * 탭마다의 sessionStorage에 두고, 페이지가 '새로고침'으로 열렸을 때만 이어 간다(주소를 새로 열면 홈부터).
 * 저장소를 못 쓰면(사생활 보호 모드 등) 그냥 홈부터.
 */
const RUN_KEY = 'ld.replayRun.v1';
interface RunMemo {
  stageId: string;
  characterId: CharacterId | null;
  /** 테스트 판(진행·지난 밤들에 남지 않음)인가 — 아니면 홈 '튜토리얼'로 연 판 */
  test: boolean;
  /** 밤 n 체험의 밤·맵 */
  night?: number;
  mapId?: string | null;
}

function rememberRun(memo: RunMemo | null): void {
  try {
    if (memo) sessionStorage.setItem(RUN_KEY, JSON.stringify(memo));
    else sessionStorage.removeItem(RUN_KEY);
  } catch {
    // 저장소를 못 쓰면 새로고침 뒤 홈부터
  }
}

function reloadedRun(): RunMemo | null {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav?.type !== 'reload') return null;
    const raw = sessionStorage.getItem(RUN_KEY);
    const memo = raw ? (JSON.parse(raw) as Partial<RunMemo>) : null;
    return typeof memo?.stageId === 'string' ? { stageId: memo.stageId, characterId: memo.characterId ?? null, test: memo.test !== false, night: typeof memo.night === 'number' ? memo.night : undefined, mapId: typeof memo.mapId === 'string' ? memo.mapId : null } : null;
  } catch {
    return null;
  }
}

function isSpecialStage(id: string): boolean {
  return id === 'tutorial' || id === 'trial';
}

/** 개발 중 `?screen=select` 같은 주소로 바로 열기 (빌드에는 영향 없음: 없으면 홈) */
function initialScreen(): ScreenId {
  if (!import.meta.env.DEV) return 'home';
  const s = new URLSearchParams(location.search).get('screen');
  return s === 'select' || s === 'shop' || s === 'ranking' || s === 'play' ? s : new URLSearchParams(location.search).has('autoplay') ? 'play' : 'home';
}
