// 판이 멈추지 않게 지키기 + 휴대폰에서 직접 보는 점검 화면 (2026-11-20 라이언: 휴대폰에서 판 멈춤·렉).
// - 그래픽 문맥 잃음: 휴대폰은 메모리가 모자라면 WebGL을 빼앗는다. Phaser가 돌려받으면 그대로 이어지고,
//   3초 안에 못 돌려받으면 화면이 멎은 채로 남으므로 안내 후 새로고침한다(테스트 판은 새로고침하면 같은 판을 다시).
// - ?debug: 화면 왼쪽 위에 실제 초당 갱신 수·화면 주기·한 프레임 일한 시간·캔버스 크기·잡은 오류를 띄운다(휴대폰에서 찍어 보내기용).
import Phaser from 'phaser';
import { loggedErrors, onErrorsChange, reportError, clearErrors } from '../core/errorLog';
import { isLite } from '../core/perfGuard';
import { h } from './dom';

const RESTORE_WAIT_MS = 3000;
const RELOAD_LINE = '화면을 다시 불러올게요';

export function installContextGuard(game: Phaser.Game): void {
  const r = game.renderer;
  if (!r || r.type !== Phaser.WEBGL) return;
  let timer = 0;
  r.on('losewebgl', () => {
    reportError(new Error('WebGL context lost'), 'gpu');
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const note = h('div', { class: 'fs-hint is-on', role: 'status' }, RELOAD_LINE);
      document.body.append(note);
      window.setTimeout(() => location.reload(), 1200);
    }, RESTORE_WAIT_MS);
  });
  r.on('restorewebgl', () => window.clearTimeout(timer));
}

export function installDebugOverlay(game: Phaser.Game): void {
  const params = new URLSearchParams(location.search);
  if (!params.has('debug')) return;
  if (params.get('debug') === 'clear') clearErrors();
  const box = h('pre', { class: 'debug-overlay', 'aria-hidden': 'true' });
  document.body.append(box);

  let steps = 0;
  let workSum = 0;
  let workMax = 0;
  let stepStart = 0;
  let rafs = 0;
  let since = performance.now();
  game.events.on(Phaser.Core.Events.PRE_STEP, () => (stepStart = performance.now()));
  game.events.on(Phaser.Core.Events.POST_RENDER, () => {
    const d = performance.now() - stepStart;
    steps++;
    workSum += d;
    workMax = Math.max(workMax, d);
  });
  const raf = (): void => {
    rafs++;
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);

  const errLine = (): string => {
    const list = loggedErrors();
    const last = list[list.length - 1];
    return `오류 ${list.reduce((n, e) => n + e.count, 0)}${last ? `\n${last.where}: ${last.message}`.slice(0, 160) : ''}`;
  };
  let errText = errLine();
  onErrorsChange(() => (errText = errLine()));

  // 기기 GPU 이름 (2026-11-24 태블릿 렉 진단 — 브라우저가 알려 줄 때만)
  let gpu = '';
  try {
    const ctx = (game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl;
    const ext = ctx?.getExtension('WEBGL_debug_renderer_info');
    if (ctx && ext) gpu = String(ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL)).slice(0, 60);
  } catch {
    // 모르면 빼고
  }
  window.setInterval(() => {
    const now = performance.now();
    const sec = (now - since) / 1000;
    const gl = game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas';
    box.textContent =
      `게임 ${Math.round(steps / sec)}/초 · 화면 ${Math.round(rafs / sec)}Hz\n` +
      `한 프레임 평균 ${(workSum / Math.max(1, steps)).toFixed(1)}ms · 최대 ${workMax.toFixed(0)}ms\n` +
      `캔버스 ${game.scale.width}×${game.scale.height} · 배율 ${devicePixelRatio.toFixed(2)} · ${gl}\n` +
      `화면 ${screen.width}×${screen.height} · 가벼운 모드 ${isLite() ? '켬(초당 30 · 빛 층 ½)' : '끔'}\n` +
      (gpu ? `GPU ${gpu}\n` : '') +
      errText;
    steps = 0;
    workSum = 0;
    workMax = 0;
    rafs = 0;
    since = now;
  }, 1000);
}
