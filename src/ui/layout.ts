// 화면 방식 적용 (2026-11-06 라이언 지시: 가로 화면 — PC 꽉 찬 화면 + 휴대폰 가로).
// <html data-layout="portrait|landscape">을 정하고(CSS가 상자·HUD·메뉴 배치를 바꾼다), 창 크기·기기 방향·설정이
// 바뀌면 게임의 논리 크기를 맞춘다(Scale.FIT 그대로, 주 카메라는 Phaser가 새 크기로 맞춤). 판정은 core/layout.ts.
// 2026-11-19 휴대폰 방향 고정: 설정 '화면 방향'이 세로·가로면 브라우저에 방향 잠금을 부탁하고(안드로이드 전체 화면에서만 됨),
// 안 되면 기기가 다른 방향일 때 <html data-turn="portrait|landscape"> → 돌려 달라는 안내(ui/TurnHint.ts)가 화면을 덮는다.
import type Phaser from 'phaser';
import { bus } from '../core/events';
import { pickLayout, turnHint, viewSize, type Layout } from '../core/layout';
import { loadSettings } from '../core/Settings';
import { GameData } from '../data';
import { zoomFor } from '../core/renderZoom';
import { savedLite } from '../core/perfGuard';

const VP = GameData.game.viewport;
const RULES = { portrait: { width: VP.width, height: VP.height }, landscape: VP.landscape };

/** 휴대폰·태블릿처럼 손가락이 주 입력이면 기기 방향을 따른다 */
export const isTouchDevice = (): boolean => matchMedia('(pointer: coarse)').matches;

export function currentLayout(): Layout {
  return pickLayout({ coarse: isTouchDevice(), width: innerWidth, height: innerHeight, pref: loadSettings().orientation });
}

/** 지금 화면에 맞는 게임 크기 = 논리 크기(짧은 변 540) × PC 선명도 배율 (2026-11-27, core/renderZoom.ts) */
export function currentView(): { width: number; height: number } {
  const layout = currentLayout();
  const v = viewSize(layout, innerWidth, innerHeight, RULES);
  // 화면 상자(.stage)의 짧은 변(CSS px): 가로 = 높이 min(창 높이, 창 폭 × 540/720), 세로 = 폭 min(창 폭, 창 높이 × 9/16) — style.css .stage
  const shortCss = layout === 'landscape' ? Math.min(innerHeight, (innerWidth * 540) / 720) : Math.min(innerWidth, (innerHeight * 9) / 16);
  const z = zoomFor({ coarse: isTouchDevice(), lite: savedLite(), shortCss, dpr: devicePixelRatio || 1 });
  return { width: Math.round(v.width * z), height: Math.round(v.height * z) };
}

/** <html data-layout>을 지금 방식으로 (스크립트가 돌자마자 한 번, 그 뒤 바뀔 때마다) */
export function applyLayout(): Layout {
  const layout = currentLayout();
  const root = document.documentElement;
  root.dataset.layout = layout;
  const turn = turnHint({ coarse: isTouchDevice(), width: innerWidth, height: innerHeight, lock: loadSettings().phoneOrientation });
  if (turn) root.dataset.turn = turn;
  else delete root.dataset.turn;
  return layout;
}

type Lockable = ScreenOrientation & { lock?: (o: string) => Promise<void>; unlock?: () => void };

/** 휴대폰 방향 고정을 브라우저에 부탁한다 (설정을 바꿀 때·전체 화면이 될 때). 막히면 조용히 넘어가고 안내가 대신한다 */
export function lockOrientation(): void {
  if (!isTouchDevice()) return;
  const so = screen.orientation as Lockable | undefined;
  const lock = loadSettings().phoneOrientation;
  try {
    if (lock === 'auto') so?.unlock?.();
    else void so?.lock?.(lock)?.catch(() => undefined);
  } catch {
    // 잠금이 없는 브라우저(아이폰 사파리 등)
  }
}

let refresh: () => void = applyLayout;

/** 설정에서 PC 화면 방향을 바꿨을 때 바로 적용 */
export function refreshLayout(): void {
  refresh();
}

/** 휴대폰은 방향을 바꾼 뒤에도 창 크기가 조금 늦게 확정된다: 그 뒤에 한 번 더 맞춘다 (ms) */
const SETTLE_MS = [120, 400];

export function watchLayout(game: Phaser.Game): void {
  let layout = applyLayout();
  const sync = () => {
    const next = applyLayout();
    const view = currentView();
    const scale = game.scale;
    // 2026-11-12 휴대폰 회전 시 화면이 작아지던 문제: data-layout이 바뀌면 상자(#game의 부모) 크기도 바뀌는데,
    // Phaser는 자기 차례(다음 폴링)에야 다시 잰다. 그 전에 새 비율로 맞추면 옛 상자 폭에 갇혀 작게 굳으므로 지금 다시 잰다.
    scale.getParentBounds();
    const size = scale.gameSize;
    if (size.width !== view.width || size.height !== view.height) scale.setGameSize(view.width, view.height);
    else scale.refresh();
    if (next !== layout) {
      layout = next;
      bus.emit('ui:layout', { layout });
    }
  };
  let timers: number[] = [];
  refresh = () => {
    sync();
    timers.forEach((t) => clearTimeout(t));
    timers = SETTLE_MS.map((ms) => window.setTimeout(sync, ms));
  };
  addEventListener('resize', refresh);
  screen.orientation?.addEventListener('change', refresh);
  document.addEventListener('fullscreenchange', lockOrientation);
  lockOrientation();
  visualViewport?.addEventListener('resize', refresh);
}
