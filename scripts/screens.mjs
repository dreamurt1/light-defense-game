// 여러 화면 크기로 한 번에 찍고(창 없는 크롬) 겹침을 숫자로 잰다 (스킬 ld-screen-check).
// dev 서버(npm run dev, 5173)가 켜져 있어야 한다.
//
// 사용:
//   node scripts/screens.mjs [--screen home|select|shop|ranking|trial] [--char lumi|tori|doto] [--sizes required|all]
//                            [--overlap ".a|.b,.c|.d"] [--out sketches/x/screens.png]
//   --overlap: 겹치면 안 되는 두 무리를 '|'로, 여러 쌍은 ','로. 각 무리는 CSS 선택자(여러 요소면 모두).
//   예) node scripts/screens.mjs --screen home --overlap ".home-badge,.home__start|.home__title"
// 크기: required = 라이언 지정 4종(PC 풀 화면·PC 세로·모바일 세로·모바일 가로), all = + 태블릿 세로·4:3·16:10·16:9 작은 폰.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { openPage, sleep } from './lib/chrome.mjs';

const arg = (k, d = null) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const screen = arg('screen', 'home');
const char = arg('char', 'lumi');
const sizesKey = arg('sizes', 'required');
const overlap = (arg('overlap', '') || '')
  .split(',')
  .filter(Boolean)
  .map((p) => p.split('|'));
const out = arg('out', `sketches/screens-${screen}.png`);
const BASE = arg('url', 'http://localhost:5173/');

const REQUIRED = [
  ['PC 풀 화면 1920×1080', 1920, 1080, 1, false, null],
  ['PC 세로 화면 (설정)', 1920, 1080, 1, false, 'portrait'],
  ['모바일 세로 390×844', 390, 844, 2, true, null],
  ['모바일 가로 844×390', 844, 390, 2, true, null],
];
const EXTRA = [
  ['태블릿 세로 820×1180', 820, 1180, 1, true, null],
  ['태블릿 가로 4:3 1180×820', 1180, 820, 1, true, null],
  ['PC 16:10 1440×900', 1440, 900, 1, false, null],
  ['작은 폰 16:9 360×640', 360, 640, 2, true, null],
];
const sizes = sizesKey === 'all' ? [...REQUIRED, ...EXTRA] : REQUIRED;

const shots = [];
let problems = 0;
for (const [name, w, h, scale, phone, orient] of sizes) {
  const page = await openPage({ width: w, height: h, scale, phone });
  await page.navigate(BASE);
  if (orient) {
    await page.evaluate(`localStorage.setItem('ld.settings.v1', JSON.stringify({ orientation: '${orient}' }))`);
    await page.navigate(BASE);
  }
  await sleep(5000);
  // 화면 열기
  await page.evaluate(`(async () => {
    const r = await import('/src/core/RunState.ts'); r.RunState.characterId = '${char}';
    const e = await import('/src/core/events.ts');
    if ('${screen}' === 'trial') { e.bus.emit('ui:start-test', { stageId: 'trial', characterId: '${char}' }); return; }
    if ('${screen}' !== 'home') { e.bus.emit('ui:navigate', { to: '${screen}' }); return; }
    e.bus.emit('ui:navigate', { to: 'shop' }); await new Promise((x) => setTimeout(x, 100)); e.bus.emit('ui:navigate', { to: 'home' });
  })()`);
  await sleep(screen === 'trial' ? 3500 : 1200);
  const info = JSON.parse(
    await page.evaluate(`JSON.stringify((() => {
      const P = ${JSON.stringify(overlap)};
      const boxes = (sel) => [...document.querySelectorAll(sel)].filter((e) => e.offsetParent || getComputedStyle(e).position === 'fixed').map((e) => e.getBoundingClientRect()).filter((r) => r.width && r.height);
      const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      const res = P.map(([a, b]) => { const A = boxes(a), B = boxes(b); let n = 0; for (const x of A) for (const y of B) if (x !== y && hit(x, y)) n++; return { pair: a + ' | ' + b, a: A.length, b: B.length, overlaps: n }; });
      return { layout: document.documentElement.dataset.layout, screen: document.documentElement.dataset.screen, overlaps: res };
    })())`),
  );
  const bad = info.overlaps.filter((o) => o.overlaps > 0);
  problems += bad.length + page.logs.length;
  console.log(`${name}: ${info.layout}/${info.screen}`, bad.length ? `겹침 ${JSON.stringify(bad)}` : '겹침 없음', page.logs.length ? `콘솔 ${page.logs.length}: ${page.logs.slice(0, 2).join(' / ')}` : '');
  shots.push({ name, w, h, png: (await page.screenshot()).toString('base64') });
  page.close();
}
const sheet = await openPage({ width: 1800, height: sizes.length > 4 ? 1060 : 560, scale: 1 });
await sheet.evaluate(`(async () => { const S = ${JSON.stringify(shots)}; document.body.style.cssText = 'margin:0;background:#111;color:#eee;font:13px sans-serif;display:flex;gap:10px;padding:8px;align-items:flex-start;flex-wrap:wrap;width:1784px';
  for (const s of S) { const k = Math.min(470 / s.h, 560 / s.w); const d = document.createElement('div'); const im = new Image(); im.src = 'data:image/png;base64,' + s.png; await im.decode(); im.style.cssText = 'display:block;width:' + Math.round(s.w * k) + 'px;height:' + Math.round(s.h * k) + 'px'; const t = document.createElement('div'); t.textContent = s.name; d.append(im, t); document.body.append(d); } })()`);
await sleep(300);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, await sheet.screenshot());
sheet.close();
console.log(`\n모음: ${out}`, problems ? `| 문제 ${problems}건` : '| 문제 없음');
process.exit(problems ? 2 : 0);
