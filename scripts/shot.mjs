// 헤드리스 크롬(창 없음)으로 페이지를 열고 실제 시간 동안 기다린 뒤 스크린샷을 찍는다.
// node scripts/shot.mjs <url> <out.png> <waitMs> [width] [height] [scale] [phone]   (phone = 휴대폰 흉내: 터치·모바일·방향)
// SHOT_EVAL="js 식" 으로 찍기 직전 값을 하나 더 볼 수 있다 (디버깅용)
import { writeFileSync } from 'node:fs';
import { openPage, sleep } from './lib/chrome.mjs';

const [url, out, waitMs = '5000', width = '390', height = '844', scale = '2', device = ''] = process.argv.slice(2);

const page = await openPage({ width: Number(width), height: Number(height), scale: Number(scale), phone: device === 'phone' });
try {
  await page.navigate(url);
  await sleep(Number(waitMs));
  const state = await page.evaluate(
    `(() => { const s = window.__game?.scene.getScene('Play'); return s && s.clock ? JSON.stringify({ t: +s.clock.t.toFixed(1), score: s.score.total, combo: s.combo.combo, maxCombo: s.combo.maxCombo, hp: Math.round(s.vitals.hp), hearts: s.vitals.hearts, lp: Math.round(s.lp.value), central: Math.ceil(s.sources.central.state.hp), stations: s.sources.stations.map((x) => x.state.mode === 'on' ? Math.ceil(x.state.hp) : x.state.mode), lit: s.sources.litCount + '/' + s.sources.stations.length, rescued: s.rescued, retreated: s.retreated, fps: Math.round(window.__game.loop.actualFps) }) : 'no play scene' })()`,
  );
  if (process.env.SHOT_EVAL) console.log('eval', JSON.stringify(await page.evaluate(process.env.SHOT_EVAL)));
  writeFileSync(out, await page.screenshot());
  console.log('state', state);
  console.log(page.logs.length ? page.logs.join('\n') : 'no console errors');
} finally {
  page.close();
}
