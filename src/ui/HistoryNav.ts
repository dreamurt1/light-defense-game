// 뒤로가기·앞으로가기 (2026-11-13 라이언): 휴대폰 뒤로 버튼·제스처, 브라우저의 뒤로·앞으로를 앱 안의 단계 이동으로.
//  - 메뉴 화면(홈·선택·지난 밤들·상점)은 하나씩 방문 기록이 되어 뒤로·앞으로 오간다.
//    예: 게임하기 → 선택, 뒤로 → 홈, 앞으로 → 다시 선택
//  - **게임 화면은 기록에 넣지 않는다 → 앞으로가기로 게임에 들어갈 수 없다**(라이언). 게임 중(판·일시정지)에는
//    뒤로·앞으로 모두 아무 일도 하지 않는다(기록만 제자리로 되돌림)
//  - 결과 화면(판이 끝난 뒤): 뒤로 → 판에 들어오기 전 화면, 앞으로 → 다음 기록 화면(게임이 아닌 메뉴)
//  - 이야기·설정·테스트 고르기 창이 열려 있으면 뒤로가기는 창만 닫는다
//  - 맨 처음 기록(바탕)까지 오면 "한 번 더 누르면 나가요" → 그다음 뒤로가기는 브라우저 그대로(나감)
//  - 화면 안의 ← 버튼처럼 바로 앞 화면으로 돌아가면 기록을 새로 쌓지 않고 되짚는다(앞으로가기가 살아 있게)
// 첫 기록은 첫 입력 뒤에 쌓는다 — 입력 없이 쌓은 기록은 크롬이 뒤로가기에서 건너뛴다(기록 가로채기 방지).
import { bus, type ScreenId } from '../core/events';
import { h } from './dom';
import type { Router } from './Router';
import { closeStory } from './Story';
import { closeTestSheet } from './TestSheet';

/** 기록 한 칸 = 메뉴 화면 하나. 'exit' = 바탕(여기서 뒤로가면 사이트를 나감) */
type Step = Exclude<ScreenId, 'play'> | 'exit';
interface NavState {
  ld: 'nav';
  i: number;
  s: Step;
}

/** 나가기 안내가 보이는 시간 (ms, 제안) */
const HINT_MS = 2200;

export function installHistoryNav(router: Router, root: HTMLElement): void {
  const steps: Step[] = ['exit'];
  let pos = 0;
  /** 우리가 부른 history.go의 popstate 수 (사용자 조작이 아니므로 그냥 위치만 맞춘다) */
  let quiet = 0;
  /** popstate로 화면을 옮기는 중: 그 이동은 기록을 다시 쌓지 않는다 */
  let applying = false;
  let activated = false;
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

  const stateAt = (i: number): NavState => ({ ld: 'nav', i, s: steps[i] });
  /** 지금 메뉴 화면 (게임 중이면 판에 들어오기 전 화면) */
  const menuScreen = (): Step => {
    const s = router.screen;
    return !s || s === 'play' ? (router.cameFrom as Step) : s;
  };
  const push = (s: Step): void => {
    steps.length = pos + 1;
    steps.push(s);
    pos++;
    history.pushState(stateAt(pos), '');
  };
  /** 기록 위치를 옮긴다 (그 popstate는 조용히) */
  const shift = (delta: number): void => {
    if (!delta) return;
    quiet++;
    history.go(delta);
  };
  const show = (to: Step): void => {
    if (to === 'exit') return;
    applying = true;
    closeStory();
    bus.emit('ui:navigate', { to });
    applying = false;
  };
  const closeOverlay = (): boolean => {
    if (closeStory() || closeTestSheet()) return true;
    if (!settingsOpen) return false;
    bus.emit('ui:close-settings');
    return true;
  };

  // 지금 기록을 바탕으로 (새로고침 뒤에도 바탕부터 다시)
  history.replaceState(stateAt(0), '');

  // 첫 입력 뒤 첫 기록. 터치는 손을 뗄 때(pointerup) 사용자 입력으로 인정되므로 그때 쌓는다
  const arm = (): void => {
    activated = true;
    if (pos !== 0) return;
    push(menuScreen());
    hint.hidden = true;
  };
  addEventListener('pointerup', arm, true);
  addEventListener('keydown', arm, true);

  // 앱이 화면을 옮김(버튼) → 기록에 반영
  bus.on('ui:screen', ({ to }) => {
    if (applying || !activated || to === 'play' || pos === 0) return;
    if (steps[pos] === to) return;
    if (pos >= 2 && steps[pos - 1] === to) {
      pos--;
      shift(-1);
      return;
    }
    push(to);
  });

  // 사용자가 뒤로·앞으로를 누름
  addEventListener('popstate', (e) => {
    const st = e.state as NavState | null;
    if (st?.ld !== 'nav') return;
    if (quiet > 0) {
      quiet--;
      pos = st.i;
      return;
    }
    const i = st.i;
    const dir = Math.sign(i - pos);
    if (!dir) return;
    if (dir < 0 && closeOverlay()) {
      shift(pos - i);
      return;
    }
    if (router.screen === 'play') {
      // 게임 중: 아무 일도 하지 않는다 (라이언: 게임 중 제외)
      if (!runEnded) {
        shift(pos - i);
        return;
      }
      // 결과 화면에서 뒤로 → 판에 들어오기 전 화면 (기록은 그 화면 칸 그대로)
      if (dir < 0) {
        shift(pos - i);
        show(menuScreen());
        return;
      }
    }
    pos = i;
    const to = steps[i] ?? st.s;
    if (to === 'exit') {
      showHint();
      return;
    }
    hint.hidden = true;
    show(to);
  });
}
