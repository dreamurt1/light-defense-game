// 휴대폰 기본 전체 화면 (2026-11-20 라이언: 폰으로 접속하면 기본으로 전체 화면).
// 브라우저는 사용자의 손길(탭) 직후에만 전체 화면을 허락하므로, 페이지를 연 뒤 첫 탭에서 한 번 들어간다.
// 설정 '전체 화면' 스위치로 끄면 다음부터 자동으로 들어가지 않는다(phoneFullscreen). 스스로 나가면(좌우 스와이프 등) 그 방문 동안은 다시 끌어들이지 않는다.
// 전체 화면을 나가는 방법 안내('위에서 아래로 드래그…')는 크롬이 직접 띄우는 문구라 웹 페이지가 바꿀 수 없다.
import { loadSettings, saveSettings } from '../core/Settings';
import { isTouchDevice } from './layout';

/** 첫 탭에서 자동으로 들어갈지 (순수 판단) */
export function autoFullscreenWanted(o: { coarse: boolean; pref: boolean; supported: boolean; active: boolean; tried: boolean }): boolean {
  return o.coarse && o.pref && o.supported && !o.active && !o.tried;
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
  const onGesture = (e: Event): void => {
    const ua = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation;
    // 손길로 인정되기 전이면 다음 이벤트를 기다린다 (확인 수단이 없는 브라우저는 click에서)
    if (ua ? !ua.isActive : e.type !== 'click') return;
    const want = autoFullscreenWanted({
      coarse: isTouchDevice(),
      pref: loadSettings().phoneFullscreen,
      supported: document.fullscreenEnabled === true,
      active: document.fullscreenElement !== null,
      tried,
    });
    tried = true;
    for (const t of GESTURES) removeEventListener(t, onGesture, true);
    if (want) enter();
  };
  // 잡는 단계(capture)라 그 탭이 누른 버튼도 그대로 눌린다
  for (const t of GESTURES) addEventListener(t, onGesture, true);
}
