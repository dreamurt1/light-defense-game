// 뒤로가기 (2026-11-13 라이언): 휴대폰의 뒤로 버튼·뒤로 제스처, 브라우저 뒤로가기를 누르면 게임(사이트)에서 나가 버리던 것을
// 앱 안의 '앞 단계'로. 예: '게임하기' 뒤 선택 화면에서 뒤로 → 홈. **게임 중(판이 도는 동안·일시정지)에는 아무 일도 하지 않는다.**
//  - 이야기 카드 → 닫기(판을 시작하지 않음) · 설정 → 닫기 · 선택·지난 밤들·상점 → 홈
//  - 결과 화면(판이 끝난 뒤) → 판에 들어오기 전 화면(선택 또는 홈)
//  - 홈 → "한 번 더 누르면 나가요" 안내, 그다음 뒤로가기는 브라우저 그대로(나감)
// 방식: 방문 기록에 '보초' 한 칸을 올려 두고, 뒤로가기로 그 칸이 빠지면(popstate) 앱 안에서 한 단계 되돌린 뒤 보초를 다시 올린다.
// 보초는 첫 입력(누름·키) 뒤에 올린다 — 입력 없이 쌓은 기록은 크롬이 뒤로가기에서 건너뛰어(기록 가로채기 방지) 소용이 없다.
import { bus } from '../core/events';
import { h } from './dom';
import type { Router } from './Router';
import { closeStory } from './Story';

const GUARD = { ld: 'guard' } as const;
const BASE = { ld: 'base' } as const;
/** 홈에서 나가기 안내가 보이는 시간 (ms, 제안) */
const HINT_MS = 2200;

export function installBackNav(router: Router, root: HTMLElement): void {
  let guarded = false;
  let settingsOpen = false;
  let runEnded = false;
  bus.on('ui:settings', (e) => (settingsOpen = e.open));
  bus.on('game:over', () => (runEnded = true));
  bus.on('game:clear', () => (runEnded = true));
  bus.on('run:start', () => (runEnded = false));
  bus.on('ui:navigate', () => (runEnded = false));

  const hint = h('div', { class: 'back-hint', role: 'status', 'aria-live': 'polite' }, '한 번 더 누르면 나가요');
  hint.hidden = true;
  root.append(hint);
  let hintTimer = 0;
  const showHint = (): void => {
    hint.hidden = false;
    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => (hint.hidden = true), HINT_MS);
  };

  const arm = (): void => {
    if (guarded) return;
    history.pushState(GUARD, '');
    guarded = true;
    hint.hidden = true;
  };

  /** 앱 안에서 한 단계 되돌렸으면 true, 홈이라 나가도 되면 false */
  const back = (): boolean => {
    if (closeStory()) return true;
    if (settingsOpen) {
      bus.emit('ui:close-settings');
      return true;
    }
    const screen = router.screen;
    if (screen === 'play') {
      if (runEnded) bus.emit('ui:navigate', { to: router.cameFrom });
      return true; // 게임 중에는 아무 일도 하지 않는다 (라이언: 게임 중 제외)
    }
    if (screen === 'select' || screen === 'shop' || screen === 'ranking') {
      bus.emit('ui:navigate', { to: 'home' });
      return true;
    }
    return false;
  };

  // 보초 칸에서 새로고침했으면 기록은 [바탕, 보초] 그대로다: 다시 쌓지 않는다
  if ((history.state as { ld?: string } | null)?.ld === GUARD.ld) guarded = true;
  else history.replaceState(BASE, '');
  addEventListener('pointerdown', arm, true);
  addEventListener('keydown', arm, true);
  addEventListener('popstate', (e) => {
    // 앞으로 가기로 보초 칸에 다시 올라온 경우
    if ((e.state as { ld?: string } | null)?.ld === GUARD.ld) {
      guarded = true;
      return;
    }
    guarded = false;
    if (back()) arm();
    else showHint();
  });
}
