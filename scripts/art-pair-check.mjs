// 2-C 그림 점검 두 가지 (2026-11-24, 기획 지시서 order-2c-prep-26-1124.md 3절 2번) — scripts/art-check.mjs --kind pair|sleep 가 부른다.
//   두 모습 실루엣 맞춤:  node scripts/art-check.mjs --kind pair --dir <빛을 잃은 모습 폴더> --dir2 <제 모습 폴더> [--a frog_lost_walk_ --b frog_walk_]
//     같은 칸(파일 이름 끝 _090_right_f01 등)끼리 몸 상자 높이·발끝(맨 아래 줄)·가운데 x가 ±8px 안인지 (구출 순간 제자리 교체가 튀지 않게)
//     박쥐: --a bat_fly_ --b bat_true_fly_ (같은 폴더면 --dir2 생략)
//   잠든 모습 축척:        node scripts/art-check.mjs --kind sleep --dir <Sleep_Pack 폴더>
//     <id>_sleep.png를 그 캐릭터의 옆모습 대기 그림(reference/<Id>_8_Direction_Pack/<Id>_Idle_8D_Pack/<id>_idle_090_right.png)과 견준다:
//     축척 = √(몸 넓이 비) 가 1 ± 0.10 안(머리 크기 대신 — 누운 몸에서 머리만 떼어 재기 어려워 넓이로), 바닥 y 496, 가운데 x 256.
//     X 눈·zzz·글자는 숫자로 못 잡는다 → 확인용 그림(_pair-check.png / _sleep-check.png)을 반드시 눈으로 본다.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { openPage } from './lib/chrome.mjs';

const arg = (k, d = null) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const kind = arg('kind');
const dir = arg('dir');
const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const url = (p) => 'data:image/png;base64,' + readFileSync(p).toString('base64');

/** 헤드리스 캔버스로 몸 상자·넓이 재기 + 확인용 그림 */
async function measure(items, title, outPng) {
  const W = 1500, cols = 6, H = 60 + Math.ceil(items.length / cols) * 230;
  const page = await openPage({ width: W, height: Math.min(H, 4000), scale: 1 });
  try {
    const res = await page.evaluate(`(async () => {
      const I = ${JSON.stringify(items)};
      const cv = document.createElement('canvas'); cv.width = ${W}; cv.height = ${Math.min(H, 4000)}; document.body.append(cv); const G = cv.getContext('2d');
      G.fillStyle = '#1B1F3B'; G.fillRect(0, 0, cv.width, cv.height); G.fillStyle = '#F6F1E7'; G.font = 'bold 14px sans-serif'; G.fillText(${JSON.stringify(title)}, 10, 22); G.font = '11px sans-serif';
      const out = [];
      for (const [k, it] of I.entries()) {
        const im = new Image(); im.src = it.url; await im.decode();
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, im.width, im.height).data; let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, area = 0;
        for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) if (d[(y * im.width + x) * 4 + 3] > 24) { area++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        out.push({ name: it.name, w: im.width, h: im.height, top: y0, bottom: y1, height: y1 - y0 + 1, cx: Math.round((x0 + x1) / 2), area });
        const X = 10 + (k % ${cols}) * 245, Y = 34 + Math.floor(k / ${cols}) * 230;
        G.fillStyle = '#2A2F5A'; G.fillRect(X, Y, 200, 200); G.drawImage(im, X, Y, 200, 200);
        G.strokeStyle = 'rgba(255,200,87,.6)'; G.beginPath(); G.moveTo(X, Y + 496 * 200 / 512); G.lineTo(X + 200, Y + 496 * 200 / 512); G.stroke();
        G.fillStyle = '#F6F1E7'; G.fillText(it.name, X, Y + 214);
      }
      return { out, png: cv.toDataURL('image/png') };
    })()`);
    writeFileSync(outPng, Buffer.from(res.png.split(',')[1], 'base64'));
    return res.out;
  } finally {
    page.close();
  }
}

let bad = 0;
if (kind === 'pair') {
  const dir2 = arg('dir2', dir);
  const a = arg('a', ''), b = arg('b', '');
  const tail = (f, pre) => (f.startsWith(pre) ? f.slice(pre.length) : null);
  const fa = readdirSync(dir).filter((f) => f.endsWith('.png') && (!a || f.startsWith(a)));
  const pairs = [];
  for (const f of fa) {
    const t = a ? tail(f, a) : f.replace(/^.*?_(lost_)?(walk|fly)_/, '');
    const match = readdirSync(dir2).find((g) => g.endsWith('.png') && g !== f && (b ? g === b + t : g.endsWith(t) && !g.includes('_lost_')));
    if (match) pairs.push([f, match]);
  }
  const items = pairs.flatMap(([f, g]) => [{ name: f, url: url(join(dir, f)) }, { name: g, url: url(join(dir2, g)) }]);
  const m = await measure(items, '두 모습 실루엣 맞춤 (같은 칸끼리 — 높이·발끝·가운데 ±8px)', join(dir, '_pair-check.png'));
  for (let i = 0; i < m.length; i += 2) {
    const [p, q] = [m[i], m[i + 1]];
    const dh = p.height - q.height, db = p.bottom - q.bottom, dc = p.cx - q.cx;
    const ok = Math.abs(dh) <= 8 && Math.abs(db) <= 8 && Math.abs(dc) <= 8;
    if (!ok) bad++;
    console.log(`${ok ? '✓' : '✗'} ${p.name} ↔ ${q.name}: 높이 ${p.height}/${q.height}(${dh}) · 발끝 ${p.bottom}/${q.bottom}(${db}) · 가운데 ${p.cx}/${q.cx}(${dc})`);
  }
  if (!pairs.length) console.log('짝이 없음 — --a/--b 접두사를 확인');
} else if (kind === 'sleep') {
  const items = [];
  for (const id of ['lumi', 'tori', 'doto']) {
    const sp = join(dir, `${id}_sleep.png`);
    const Cap = id[0].toUpperCase() + id.slice(1);
    const ip = join(ROOT, `reference/${Cap}_8_Direction_Pack/${Cap}_Idle_8D_Pack/${id}_idle_090_right.png`);
    if (!existsSync(sp)) { console.log(`- ${id}_sleep.png 없음`); continue; }
    if (!existsSync(ip)) { console.log(`- ${id} 대기 그림 없음: ${ip}`); continue; }
    items.push({ name: `${id}_sleep.png`, url: url(sp) }, { name: `(대기) ${id}_idle_090_right.png`, url: url(ip) });
  }
  const m = await measure(items, '잠든 모습 — 축척(넓이) · 바닥 y 496 · 가운데 x 256 · X 눈·zzz·글자는 눈으로', join(dir, '_sleep-check.png'));
  for (let i = 0; i < m.length; i += 2) {
    const [s, idle] = [m[i], m[i + 1]];
    const k = Math.sqrt(s.area / idle.area);
    const ok = Math.abs(k - 1) <= 0.1 && Math.abs(s.bottom - 495.5) <= 2 && Math.abs(s.cx - 256) <= 12 && s.w === 512 && s.h === 512;
    if (!ok) bad++;
    console.log(`${ok ? '✓' : '✗'} ${s.name}: 캔버스 ${s.w}×${s.h} · 축척(√넓이 비) ${k.toFixed(3)} (1 ± 0.10) · 바닥 ${s.bottom} · 가운데 ${s.cx}`);
  }
} else {
  console.error('사용: --kind pair --dir <폴더> [--dir2 <폴더>] [--a 접두사 --b 접두사] | --kind sleep --dir <Sleep_Pack>');
  process.exit(1);
}
console.log(bad ? `\n어긋남 ${bad}개 — 확인용 그림을 보고 판단` : '\n모두 통과 — 확인용 그림도 눈으로 볼 것(X 눈·zzz·글자)');
process.exit(bad ? 2 : 0);
