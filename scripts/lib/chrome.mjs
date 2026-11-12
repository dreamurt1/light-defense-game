// 창 없는(헤드리스) 크롬을 DevTools 프로토콜로 다루는 작은 도구. 의존성 없음(Node 내장 WebSocket).
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// phone: 휴대폰 흉내(터치 → pointer: coarse, 모바일 화면, 가로·세로 방향) — 휴대폰 가로 화면 확인용 (2026-11-06)
export async function openPage({ width = 390, height = 844, scale = 2, phone = false } = {}) {
  const port = 9300 + Math.floor(Math.random() * 500);
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${mkdtempSync(join(tmpdir(), 'ld-chrome-'))}`,
      '--no-first-run',
      '--hide-scrollbars',
      '--autoplay-policy=no-user-gesture-required',
      `--window-size=${width},${height}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  let wsUrl = null;
  for (let i = 0; i < 50 && !wsUrl; i++) {
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
