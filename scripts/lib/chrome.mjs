// 창 없는(헤드리스) 크롬을 DevTools 프로토콜로 다루는 작은 도구. 의존성 없음(Node 내장 WebSocket).
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// phone: 휴대폰 흉내(터치 → pointer: coarse, 모바일 화면, 가로·세로 방향) — 휴대폰 가로 화면 확인용 (2026-11-06)
export async function openPage({ width = 390, height = 844, scale = 2, phone = false } = {}) {
  // 2026-11-24: 디버그 포트를 9300~9799에서 무작위로 고르면 여러 창을 한꺼번에 열 때 같은 포트가 걸려
  // 두 작업이 한 창을 함께 몰았다(밸런스 측정에서 두 seed가 같은 런·같은 점수, 다섯 창 화면이 겹쳐 찍힘).
  // → 포트 0(크롬이 빈 포트를 고름) + 프로필 폴더의 DevToolsActivePort 첫 줄에서 실제 포트를 읽는다
  const profile = mkdtempSync(join(tmpdir(), 'ld-chrome-'));
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      // LD_NO_WEBGL=1 (2026-11-25): 이 PC의 그래픽 드라이버가 멈춰 WebGL 만들기가 영영 돌아오지 않을 때 — 그래픽 없이 캔버스 렌더러로(메뉴·판 규칙 점검용, 빛 층은 그리지 않음)
      ...(process.env.LD_NO_WEBGL ? ['--disable-gpu', '--disable-accelerated-2d-canvas'] : []),
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--hide-scrollbars',
      '--autoplay-policy=no-user-gesture-required',
      `--window-size=${width},${height}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  let port = 0;
  const portFile = join(profile, 'DevToolsActivePort');
  // 창을 여러 개 동시에 켜면(밸런스 측정 9창) 10초를 넘길 때가 있다 → 30초까지 (2026-11-24)
  for (let i = 0; i < 300 && !port; i++) {
    try {
      if (existsSync(portFile)) port = Number(readFileSync(portFile, 'utf8').split(/\r?\n/)[0]) || 0;
    } catch {}
    if (!port) await sleep(100);
  }
  let wsUrl = null;
  for (let i = 0; i < 100 && !wsUrl && port; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      wsUrl = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl ?? null;
    } catch {}
    if (!wsUrl) await sleep(200);
  }
  if (!wsUrl) {
    chrome.kill();
    throw new Error('headless chrome did not start');
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  const logs = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      logs.push('EXCEPTION ' + (msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text));
    } else if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
      logs.push(msg.params.type.toUpperCase() + ' ' + msg.params.args.map((a) => a.value ?? a.description).join(' '));
    }
  });
  const send = (method, params = {}) =>
    new Promise((r) => {
      const n = ++id;
      pending.set(n, r);
      ws.send(JSON.stringify({ id: n, method, params }));
    });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: scale,
    mobile: phone || width < 600,
    ...(phone ? { screenOrientation: width > height ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 } } : {}),
  });
  if (phone) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  if (process.env.LD_NO_WEBGL) {
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, o) { return /webgl/.test(t) ? null : g.call(this, t, o); }; })();`,
    });
  }
  // 창이 없어도 rAF가 정상 속도로 돌게 포커스를 준다
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return res.result?.result?.value;
  };

  return {
    send,
    evaluate,
    logs,
    navigate: (url) => send('Page.navigate', { url }),
    screenshot: async () => Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'),
    close: () => {
      ws.close();
      chrome.kill();
    },
  };
}
