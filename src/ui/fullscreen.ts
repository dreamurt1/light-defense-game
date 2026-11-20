// 휴대폰 전체 화면 (2026-11-20 라이언: 폰으로 접속하면 바로 전체 화면 + 해제 안내).
// - 홈 화면 앱(PWA, public/manifest.webmanifest의 display: fullscreen)으로 열면 탭 없이 처음부터 전체 화면 — 여기서 할 일 없음.
// - 브라우저 주소로 열면: 브라우저는 사용자의 손길(탭) 직후에만 전체 화면을 허락하므로 페이지를 연 뒤 첫 탭에서 한 번 들어간다.
//   설정 '전체 화면' 스위치로 끄면 다음부터 자동으로 들어가지 않는다(phoneFullscreen). 스스로 나가면(좌우 스와이프 등) 그 방문 동안은 다시 끌어들이지 않는다.
// - 들어가면 게임의 해제 안내를 잠깐 띄운다(옆 가장자리에서 밀기 — 라이언 확인). 크롬이 위쪽에 띄우는 '위에서 아래로 드래그…'는 브라우저 문구라 바꿀 수 없다.
import { bus } from '../core/events';
import { loadSettings, saveSettings } from '../core/Settings';
import { h } from './dom';
import { isTouchDevice } from './layout';
import { whenSplashGone } from './Splash';

/** 브라우저로 접속했을 때 첫 탭 전까지 띄우는 안내 (2026-11-20 라이언) */
export const TAP_HINT = '화면을 한 번 누르면 전체 화면으로 바뀌어요';
/** 해제 안내 (라이언 확인: 좌우 가장자리에서 밀면 풀림) */
export const EXIT_HINT = '옆 가장자리에서 밀면 전체 화면이 풀려요';
const HINT_MS = 3200;

/** 첫 탭에서 자동으로 들어갈지 (순수 판단) */
export function autoFullscreenWanted(o: { coarse: boolean; pref: boolean; supported: boolean; active: boolean; tried: boolean; app?: boolean }): boolean {
  return o.coarse && o.pref && o.supported && !o.active && !o.tried && !o.app;
}

/** 홈 화면 앱으로 열림(이미 전체 화면·독립 창) */
export function isAppMode(): boolean {
  return matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches;
}

function enter(): void {
  const root = document.documentElement as HTMLElement & { requestFullscreen(o?: FullscreenOptions): Promise<void> };
  void root.requestFullscreen({ navigationUI: 'hide' }).catch(() => undefined);
}

/** 설정 스위치: 지금 상태를 바꾸고, 휴대폰이면 다음 방문의 기본값으로도 기억한다 */
export function toggleFullscreen(): void {
  const on = document.fullscreenElement === null;
  if (on) enter();
  else void document.exitFullscreen().catch(() => undefined);
  if (isTouchDevice()) saveSettings({ ...loadSettings(), phoneFullscreen: on });
}

/** 첫 탭을 기다리는 이벤트. 크롬은 터치를 touchend 뒤 click부터 '사용자 손길'로 인정한다(헤드리스로 확인) — 인정되는 첫 순간에 들어간다 */
const GESTURES = ['pointerup', 'touchend', 'click'] as const;

export function installAutoFullscreen(): void {
  let tried = false;
  const wanted = (): boolean =>
    autoFullscreenWanted({
      coarse: isTouchDevice(),
      pref: loadSettings().phoneFullscreen,
      supported: document.fullscreenEnabled === true,
      active: document.fullscreenElement !== null,
      tried,
      app: isAppMode(),
    });

  // 첫 탭 전까지: '화면을 한 번 누르면 전체 화면으로 바뀌어요' (스플래시가 사라진 뒤, 그 탭이 전체 화면으로 바꿀 때만)
  const tapHint = h('div', { class: 'fs-hint fs-hint--tap', role: 'status', 'aria-live': 'polite' }, TAP_HINT);
  document.body.append(tapHint);
  // 메뉴 화면에서만: 판으로 바로 열렸거나(새로고침 다시 하기) 판이 시작되면 가린다 — 판 위 가운데를 덮지 않게
  whenSplashGone(() => tapHint.classList.toggle('is-on', wanted() && document.documentElement.dataset.screen !== 'play'));
  bus.on('run:start', () => tapHint.classList.remove('is-on'));

  const onGesture = (e: Event): void => {
    const ua = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation;
    // 손길로 인정되기 전이면 다음 이벤트를 기다린다 (확인 수단이 없는 브라우저는 click에서)
    if (ua ? !ua.isActive : e.type !== 'click') return;
    const want = wanted();
    tried = true;
    tapHint.classList.remove('is-on');
    for (const t of GESTURES) removeEventListener(t, onGesture, true);
    if (want) enter();
  };
  // 잡는 단계(capture)라 그 탭이 누른 버튼도 그대로 눌린다
  for (const t of GESTURES) addEventListener(t, onGesture, true);

  // 해제 안내: 휴대폰에서 전체 화면에 들어갈 때마다 잠깐 (화면 가운데 — 위쪽은 크롬 문구, 아래쪽은 버튼·스틱 자리)
  const hint = h('div', { class: 'fs-hint', role: 'status', 'aria-live': 'polite' }, EXIT_HINT);
  document.body.append(hint);
  let timer = 0;
  document.addEventListener('fullscreenchange', () => {
    const on = document.fullscreenElement !== null && isTouchDevice();
    hint.classList.toggle('is-on', on);
    window.clearTimeout(timer);
    if (on) timer = window.setTimeout(() => hint.classList.remove('is-on'), HINT_MS);
  });
}
