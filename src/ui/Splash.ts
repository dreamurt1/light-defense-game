// 스플래시: index.html에 미리 그려 둔 #splash(스크립트가 오기 전부터 보임)에 불러오기 진행을 채우고,
// 그림을 다 불러오면 부드럽게 사라진다. 너무 빨리 지나가 깜빡이지 않게 최소 시간만큼은 보여 준다(제안: 기획서에 없음).
import { bus } from '../core/events';

/** 페이지를 연 뒤 스플래시를 보여 주는 최소 시간 */
const MIN_MS = 1200;
const FADE_MS = 600;

export function runSplash(): void {
  const el = document.getElementById('splash');
  if (!el) return;
  const fill = el.querySelector<HTMLElement>('.splash__fill');
  // 개발 중 자동 확인(?autoplay·?screen)은 기다리지 않는다
  const quick = import.meta.env.DEV && /[?&](autoplay|screen)=/.test(location.search);

  bus.on('ui:load-progress', ({ value }) => fill?.style.setProperty('--p', String(Math.max(0.04, value))));
  bus.on('ui:assets-ready', () => {
    fill?.style.setProperty('--p', '1');
    // performance.now()는 페이지를 연 순간부터 잰다: 스크립트가 늦게 와도 최소 시간에 그만큼 포함된다
    const wait = quick ? 0 : Math.max(0, MIN_MS - performance.now());
    window.setTimeout(() => {
      el.classList.add('is-done');
      window.setTimeout(() => el.remove(), FADE_MS + 50);
    }, wait);
  });
}
