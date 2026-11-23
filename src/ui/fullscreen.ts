// 휴대폰 전체 화면 (2026-11-20 라이언: 폰으로 접속하면 바로 전체 화면 + 해제 안내).
// - 홈 화면 앱(PWA, public/manifest.webmanifest의 display: fullscreen)으로 열면 탭 없이 처음부터 전체 화면 — 여기서 할 일 없음.
// - 브라우저 주소로 열면: 브라우저는 사용자의 손길(탭) 직후에만 전체 화면을 허락하므로 페이지를 연 뒤 첫 탭에서 한 번 들어간다.
//   설정 '전체 화면' 스위치로 끄면 다음부터 자동으로 들어가지 않는다(phoneFullscreen). 스스로 나가면(좌우 스와이프 등) 그 방문 동안은 다시 끌어들이지 않는다.
// - 안내 두 가지(2026-11-21 라이언): 접속하면 '화면을 한 번 누르면…', 들어가면 해제 안내 — 둘 다 2.5초, 세로 화면에서는 홈 '게임하기' 바로 위.
//   (안내가 사라진 뒤에도 첫 탭은 그대로 전체 화면으로 바꾼다.) 크롬이 위쪽에 띄우는 '위에서 아래로 드래그…'는 브라우저 문구라 바꿀 수 없다.
import { bus } from '../core/events';
import { loadSettings, saveSettings } from '../core/Settings';
import { h } from './dom';
import { isTouchDevice } from './layout';
import { whenSplashGone } from './Splash';

/** 브라우저로 접속했을 때 첫 탭을 기다리며 띄우는 안내 (2026-11-20 라이언) */
export const TAP_HINT = '화면을 한 번 누르면 전체 화면으로 바뀌어요';
/** 해제 안내 (2026-11-21 라이언: 옆에서 밀기 또는 위 설정의 '전체 화면' 스위치) */
export const EXIT_HINT = '옆에서 밀거나 상단 환경설정에서 전체 화면을 풀어요';
/** 두 안내가 떠 있는 시간 (2026-11-21 라이언) */
export const HINT_MS = 2500;
/** '게임하기'와 안내 사이 여백 · 화면 가장자리 여백 (px) */
const GAP = 10;
const EDGE = 8;

/** 첫 탭에서 자동으로 들어갈지 (순수 판단) */
export function autoFullscreenWanted(o: { coarse: boolean; pref: boolean; supported: boolean; active: boolean; tried: boolean; app?: boolean }): boolean {
  return o.coarse && o.pref && o.supported && !o.active && !o.tried && !o.app;
}

/** 안내의 가운데 x: '게임하기' 가운데에 두되 화면 밖으로 나가지 않게 (순수 계산) */
export function hintCenterX(buttonCenter: number, hintWidth: number, viewWidth: number, edge = EDGE): number {
  const half = hintWidth / 2;
  return Math.min(Math.max(buttonCenter, half + edge), viewWidth - half - edge);
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

/** 세로 화면에서 안내를 홈 '게임하기' 바로 위(가운데 맞춤)에 둔다(2026-11-21 라이언: 세로 기준).
 *  가로이거나 '게임하기'가 보이지 않으면(판 중 등) 원래 자리 — 접속 안내 = 화면 아래 가운데, 해제 안내 = 가운데 */
function placeAboveStart(el: HTMLElement): void {
  // 2026-11-23: 저장된 런이 있으면 '밤 나들이 시작' 위에 '이어서 하기'가 있다 → 보이는 버튼 중 맨 위 것의 위에
  const cont = document.querySelector<HTMLElement>('.home__continue');
  const start = cont && !cont.hidden && !cont.closest('[hidden]') ? cont : document.querySelector<HTMLElement>('.home__start');
  const r = start?.getBoundingClientRect();
  const root = document.documentElement;
  const visible = !!r && r.width > 0 && r.height > 0 && root.dataset.screen === 'home' && root.dataset.layout !== 'landscape';
  el.classList.toggle('is-anchored', visible);
  if (!visible || !r) return;
  const x = hintCenterX(r.left + r.width / 2, el.offsetWidth, innerWidth);
  el.style.setProperty('--hint-x', `${Math.round(x)}px`);
  el.style.setProperty('--hint-y', `${Math.round(r.top - GAP)}px`);
}

/** 설정·테스트·이야기 같은 창이 열려 있나 — 열려 있으면 안내를 띄우지 않는다(창 위에 겹쳐 보임, 2026-11-21 라이언) */
function sheetOpen(): boolean {
  return [...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')].some((d) => !d.hidden && d.offsetParent !== null);
}

/** 안내 하나를 잠깐 보여 준다 (보이는 동안 화면 크기가 바뀌면 — 회전·전체 화면 — 자리를 다시 잰다, 아무 데나 누르면 바로 사라진다) */
function makeHint(text: string, extraClass = ''): { show(): void; hide(): void } {
  const el = h('div', { class: `fs-hint ${extraClass}`.trim(), role: 'status', 'aria-live': 'polite' }, text);
  document.body.append(el);
  let timer = 0;
  const replace = (): void => {
    if (el.classList.contains('is-on')) placeAboveStart(el);
  };
  addEventListener('resize', replace);
  // 떠 있는 동안 아무 데나 누르면 사라진다 (그 탭이 연 창 위에 남지 않게)
  addEventListener(
    'click',
    () => {
      if (!el.classList.contains('is-on')) return;
      window.clearTimeout(timer);
      el.classList.remove('is-on');
    },
    true,
  );
  return {
    show() {
      if (sheetOpen()) return;
      placeAboveStart(el);
      el.classList.add('is-on');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => el.classList.remove('is-on'), HINT_MS);
      // 전체 화면이 되며 화면이 커지는 동안 '게임하기'가 움직인다 → 조금 뒤 한 번 더
      window.setTimeout(replace, 300);
    },
    hide() {
      window.clearTimeout(timer);
      el.classList.remove('is-on');
    },
  };
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

  // 접속 안내: 스플래시가 사라진 뒤, 그 탭이 전체 화면으로 바꿀 때만, 메뉴 화면에서만(판으로 바로 열렸으면 띄우지 않음) — 2.5초
  const tapHint = makeHint(TAP_HINT, 'fs-hint--tap');
  whenSplashGone(() => {
    if (wanted() && document.documentElement.dataset.screen !== 'play') tapHint.show();
  });
  bus.on('run:start', () => tapHint.hide());

  const onGesture = (e: Event): void => {
    const ua = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation;
    // 손길로 인정되기 전이면 다음 이벤트를 기다린다 (확인 수단이 없는 브라우저는 click에서)
    if (ua ? !ua.isActive : e.type !== 'click') return;
    const want = wanted();
    tried = true;
    tapHint.hide();
    for (const t of GESTURES) removeEventListener(t, onGesture, true);
    if (want) enter();
  };
  // 잡는 단계(capture)라 그 탭이 누른 버튼도 그대로 눌린다
  for (const t of GESTURES) addEventListener(t, onGesture, true);

  // 해제 안내: 휴대폰에서 전체 화면에 들어갈 때마다, 같은 자리('게임하기' 위)에 2.5초
  const exitHint = makeHint(EXIT_HINT);
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement !== null && isTouchDevice()) exitHint.show();
    else exitHint.hide();
  });
}
