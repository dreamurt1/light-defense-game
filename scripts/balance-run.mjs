// 밸런스 측정 (2026-11-23 밤 나들이 v3, NIGHT_RUN.md 8절): 헤드리스 창 여러 개에서 자동 런(?autoplay=run)을 실력 × seed마다 끝까지 돌려
// 실력별 평균 밤 수·점수·길을 표로. dev 서버(5173)가 켜져 있어야 한다. 목표: 실력 0.5 → 평균 밤 5~8, 1.0 → 밤 10~12.
//   node scripts/balance-run.mjs [--skills 0.25,0.5,1] [--seeds 1,2,3,4] [--speed 8] [--par 6] [--cap 15] [--out file.json] [--char lumi]
// 밤 수 = 아침을 맞은 밤 수(런 요약 nights). 상한(cap)까지 가면 '집으로'로 끝난다.
import { openPage, sleep } from './lib/chrome.mjs';
import { writeFileSync } from 'node:fs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const skills = arg('skills', '0.25,0.5,1').split(',').map(Number);
const seeds = arg('seeds', '1,2,3,4').split(',').map(Number);
const speed = Number(arg('speed', '8'));
const par = Number(arg('par', '6'));
const cap = Number(arg('cap', '15'));
const out = arg('out', '');
const ch = arg('char', 'lumi');
const base = arg('base', 'http://localhost:5173');

const jobs = skills.flatMap((skill) => seeds.map((seed) => ({ skill, seed })));
const results = [];
const started = Date.now();

async function runOne({ skill, seed }) {
  const page = await openPage({ width: 640, height: 360, scale: 1 });
  try {
    await page.navigate(`${base}/?autoplay=run&skill=${skill}&seed=${seed}&speed=${speed}&cap=${cap}&char=${ch}`);
    // 한 밤 100초 ÷ 배율 + 여유, 상한 밤까지
    const limit = Date.now() + ((cap + 1) * 100 * 1000) / Math.max(1, speed * 0.6) + 60000;
    let log = null;
    while (Date.now() < limit) {
      await sleep(3000);
      log = JSON.parse((await page.evaluate('JSON.stringify(window.__runLog ?? null)')) ?? 'null');
      if (log?.done) break;
    }
    const errs = page.logs.filter((l) => l.startsWith('ERROR') || l.startsWith('EXCEPTION'));
    const r = { skill, seed, done: !!log?.done, summary: log?.summary ?? null, nights: log?.nights ?? [], wallSec: log?.wallSec ?? null, errors: errs.slice(0, 3) };
    results.push(r);
    const s = r.summary;
    console.log(
      `실력 ${skill} seed ${seed}: ${r.done ? `밤 ${s.nights} (마지막 밤 ${s.lastNight}, ${s.reason}) · 점수 ${s.score} · 길 ${s.path}` : `끝나지 않음 (기록 ${r.nights.length}밤)`} · ${r.wallSec ?? '?'}초 · 오류 ${errs.length}`,
    );
  } finally {
    page.close();
  }
}

// par개씩 동시에
const queue = [...jobs];
await Promise.all(
  Array.from({ length: Math.min(par, queue.length) }, async () => {
    while (queue.length) await runOne(queue.shift());
  }),
);

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
console.log('\n| 실력 | 런 수 | 평균 밤 | 최소~최대 | 평균 점수 | 길(지키는·넓히는·중립) | 끝난 까닭 |');
console.log('|---|---|---|---|---|---|---|');
for (const skill of skills) {
  const rs = results.filter((r) => r.skill === skill && r.done);
  const n = rs.map((r) => r.summary.nights);
  const paths = ['keep', 'expand', 'mixed'].map((p) => rs.filter((r) => r.summary.path === p).length).join('·');
  const reasons = Object.entries(rs.reduce((m, r) => ((m[r.summary.reason] = (m[r.summary.reason] ?? 0) + 1), m), {}))
    .map(([k, v]) => `${k} ${v}`)
    .join(', ');
  console.log(`| ${skill} | ${rs.length} | ${mean(n).toFixed(1)} | ${Math.min(...n)}~${Math.max(...n)} | ${Math.round(mean(rs.map((r) => r.summary.score)))} | ${paths} | ${reasons} |`);
}
console.log(`\n걸린 시간 ${Math.round((Date.now() - started) / 1000)}초 · 빨리 감기 ×${speed} · 동시 ${par}창`);
if (out) writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), speed, cap, results }, null, 2));
