// 처음 쓸 때 끊김 재기 (2026-11-27 기기별 렉 점검): 가만히 선 판에서 HUD·판 신호를 2초 간격으로 하나씩 보내고, 각 신호 뒤 1.2초 안 가장 긴 프레임 간격(ms).
// 첫 '콤보 ×5'의 그라데이션 SVG가 200~250ms 멈추던 것을 이걸로 찾음(ui/swoosh.ts). dev 서버 필요.
//   node scripts/first-use-hitch.mjs [폭] [높이] [배율] [신호,…]   신호: growth combo toast dust pline burst pulse (+ 끄기 nofilter noshadow nostroke noswoosh nostars notext ascii w700)
import { openPage, sleep } from './lib/chrome.mjs';

const [w = '1440', h = '900', dpr = '2', order = 'growth,combo,toast,dust,growth,combo'] = process.argv.slice(2);
const page = await openPage({ width: Number(w), height: Number(h), scale: Number(dpr), phone: Number(w) < 1000 });
const EV = {
  growth: `bus.emit('growth:change', { level: 2 + (window.__n = (window.__n || 0) + 1), xp: 0, need: 30, ups: 1 })`,
  combo: `bus.emit('combo:change', { combo: 5 * (window.__c = (window.__c || 0) + 1), reason: 'gain', windowSec: 3 })`,
  toast: `bus.emit('station:out', {})`,
  dust: `bus.emit('dust:change', { dust: 7 })`,
  pline: `bus.emit('witch:spawn', { form: 'calm' })`,
  burst: `(() => { const b = document.querySelector('.combo-burst'); document.querySelector('.combo-burst__text').textContent = '콤보 ×5'; b.classList.remove('is-on'); void b.offsetWidth; b.classList.add('is-on'); })()`,
  nofilter: `(() => { const s = document.createElement('style'); s.textContent = '.combo-burst__swoosh, .combo-burst__star { filter: none !important; }'; document.head.append(s); })()`,
  noshadow: `(() => { const s = document.createElement('style'); s.textContent = '.combo-burst__text { text-shadow: none !important; }'; document.head.append(s); })()`,
  nostroke: `(() => { const s = document.createElement('style'); s.textContent = '.combo-burst__text { -webkit-text-stroke: 0 !important; }'; document.head.append(s); })()`,
  ascii: `(() => { const s = document.createElement('style'); s.textContent = '.combo-burst__text { font-family: Arial !important; }'; document.head.append(s); })()`,
  w700: `(() => { const s = document.createElement('style'); s.textContent = '.combo-burst__text { font-weight: 700 !important; }'; document.head.append(s); })()`,
  noswoosh: `(() => { const s = document.createElement('style'); s.textContent = '.combo-burst > svg { display: none !important; }'; document.head.append(s); })()`,
  nostars: `(() => { const s = document.createElement('style'); s.textContent = '.combo-burst__star { display: none !important; }'; document.head.append(s); })()`,
  notext: `(() => { const s = document.createElement('style'); s.textContent = '.combo-burst__text { display: none !important; }'; document.head.append(s); })()`,
  pulse: `window.__game.scene.getScene('Play').stage.pulse()`,
};
try {
  await page.navigate(`http://localhost:5173/?autoplay=300&night=1&map=A1&seed=7&idle&lite=off`);
  for (let i = 0; i < 80; i++) {
    await sleep(250);
    const t = await page.evaluate(`window.__game?.scene.getScene('Play')?.clock?.t ?? -1`);
    if (t > 6) break;
  }
  await page.evaluate(`(() => { window.__g = []; let last = performance.now(); const tick = (t) => { window.__g.push([t, t - last]); last = t; requestAnimationFrame(tick); }; requestAnimationFrame(tick); })()`);
  await sleep(1500);
  const base = await page.evaluate(`Math.max(...window.__g.map((x) => x[1]))`);
  const out = [`기준(아무 신호 없음 1.5초) 최대 ${base.toFixed(0)}ms`];
  for (const k of order.split(',')) {
    const t0 = await page.evaluate(`(async () => { const { bus } = await import('/src/core/events.ts'); const t = performance.now(); ${EV[k]}; return t; })()`);
    await sleep(2000);
    const max = await page.evaluate(`Math.max(...window.__g.filter((x) => x[0] > ${t0} && x[0] < ${t0} + 1200).map((x) => x[1]))`);
    out.push(`${k}: 최대 ${max.toFixed(0)}ms`);
  }
  console.log(`${w}x${h}`, out.join(' · '));
} finally {
  page.close();
}
process.exit(0);
