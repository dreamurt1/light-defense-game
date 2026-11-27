// 받은 ChatGPT 그림 점검 (스킬 ld-art-intake). 창 없는 크롬으로 PNG를 재고, 경고 목록과 확인용 한 장을 만든다.
//
// 사용:
//   node scripts/art-check.mjs --dir <PNG 폴더> [--char tori|doto|lumi] [--view 000_front] [--kind walk|idle|bg] [--out <png>] [--old-ribbon]
// 토리 귀 규칙(2026-11-27 라이언 확정 — 스프라이트도 교체): 어느 방향이든 리본(민트 #9ED9B5 계열 무게중심)이 화면 왼쪽(x < 256). 옛 팩(리본 = 접힌 귀)을 볼 때만 --old-ribbon
//   2-C(2026-11-24): --kind pair --dir <빛을 잃은 모습> --dir2 <제 모습> · --kind sleep --dir <Sleep_Pack> (scripts/art-pair-check.mjs)
//   예) 걷기 4장: --dir C:/tmp/x/000_front --char tori --view 000_front --kind walk
//       대기 8장: --dir C:/tmp/x/Doto_Idle_8D_Pack --char doto --kind idle
// 걷기는 같은 방향의 팩 대기 그림(reference/<Char>_8_Direction_Pack/<Char>_Idle_8D_Pack/<char>_idle_<view>.png)과 견준다.
// 경고 기준(브리프·의뢰서): 캔버스 512 · 발끝 495~496 · f01 = 대기 그림 · 뜨는 높이 ≤ 8 · 눈/머리 높이 ±6 · 귀 끝 ±15 ·
//   눈 색이 대기와 비슷 · **눈 덩이 수가 대기보다 많지 않음(눈 겹침)** · 토리 리본은 방향별 맞는 쪽 · 가장자리 흰 줄 없음 · 떨어진 조각 없음.
// 숫자만 믿지 말 것 — 확인용 그림의 얼굴 확대 줄을 반드시 눈으로 본다(2026-11-18 앞모습 눈 겹침을 수치가 놓쳤다).
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { openPage, sleep } from './lib/chrome.mjs';

const arg = (k, d = null) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
// 2026-11-24 2-C: 두 모습 실루엣 맞춤(--kind pair)·잠든 모습 축척(--kind sleep)은 따로 (scripts/art-pair-check.mjs)
if (['pair', 'sleep'].includes(process.argv[process.argv.indexOf('--kind') + 1] ?? '')) {
  await import('./art-pair-check.mjs');
  await new Promise(() => {}); // art-pair-check가 끝나며 process.exit
}
const dir = arg('dir');
const char = arg('char');
const view = arg('view');
const kind = arg('kind', view ? 'walk' : 'idle');
const out = arg('out', join(dir ?? '.', '_art-check.png'));
if (!dir) {
  console.error('사용: node scripts/art-check.mjs --dir <PNG 폴더> [--char tori] [--view 000_front] [--kind walk|idle|bg] [--out x.png]');
  process.exit(1);
}
const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const Cap = char ? char[0].toUpperCase() + char.slice(1) : '';
const idlePath = char && view ? join(ROOT, `reference/${Cap}_8_Direction_Pack/${Cap}_Idle_8D_Pack/${char}_idle_${view}.png`) : null;
// 가로로 이은 원본(strip)·밑줄로 시작하는 파일은 빼고 한 장씩만
const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.png') && !f.startsWith('_') && !/strip/i.test(f)).sort();
const items = [];
if (idlePath && existsSync(idlePath)) items.push({ name: `(대기) ${basename(idlePath)}`, ref: true, url: 'data:image/png;base64,' + readFileSync(idlePath).toString('base64') });
for (const f of files) items.push({ name: f, url: 'data:image/png;base64,' + readFileSync(join(dir, f)).toString('base64') });
if (!items.length) {
  console.error('PNG가 없습니다:', dir);
  process.exit(1);
}

// 옛 기준(--old-ribbon, 2026-11-27 전 스프라이트): 토리 리본(= 토리 자신의 왼쪽 귀)이 화면에 보이는 쪽: 'R' = 가운데보다 오른쪽, 'L' = 왼쪽, null = 가운데 근처(옆모습)
const OLD_RIBBON = process.argv.includes('--old-ribbon');
const RIBBON_SIDE = { '000_front': 'R', '045_front_right': 'R', '090_right': null, '135_back_right': 'L', '180_back': 'L', '225_back_left': 'L', '270_left': null, '315_front_left': 'R' };

const W = 1400;
const cols = Math.min(items.length, 6);
const H = 40 + Math.ceil(items.length / cols) * 470;
const page = await openPage({ width: W, height: Math.min(H, 4000), scale: 1 });
const res = await page.evaluate(`(async () => {
  const I = ${JSON.stringify(items)}, cols = ${cols};
  const load = async (s) => { const i = new Image(); i.src = s; await i.decode(); return i; };
  const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  document.body.style.cssText = 'margin:0;background:#14152E';
  const cv = document.createElement('canvas'); cv.width = ${W}; cv.height = ${Math.min(H, 4000)}; document.body.append(cv); const G = cv.getContext('2d');
  G.fillStyle = '#14152E'; G.fillRect(0, 0, cv.width, cv.height);
  const out = []; let refData = null;
  for (const [k, it] of I.entries()) {
    const im = await load(it.url); const w = im.width, h = im.height;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, w, h).data; const A = (x, y) => d[(y * w + x) * 4 + 3];
    if (it.ref) refData = d;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, opaque = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (A(x, y) > 24) { opaque++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    // 가장자리 줄 밝기(흰 테두리)
    const colLum = (x) => { let s = 0; for (let y = 0; y < h; y++) { const q = (y * w + x) * 4; s += (d[q] + d[q + 1] + d[q + 2]) / 3 * (d[q + 3] / 255); } return s / h; };
    const edges = { left: Math.round(colLum(0)), right: Math.round(colLum(w - 1)) };
    // 떨어진 조각: 알파 > 40 연결 요소 중 큰 덩이에서 떨어진 작은 것
    const lab = new Int32Array(w * h); const comps = []; let nl = 0;
    for (let p = 0; p < w * h; p++) { if (lab[p] || d[p * 4 + 3] <= 40) continue; nl++; const st = [p]; lab[p] = nl; let n = 0; while (st.length) { const q = st.pop(); n++; const x = q % w;
      for (const r of [q - 1, q + 1, q - w, q + w]) { if (r < 0 || r >= w * h || Math.abs((r % w) - x) > 1) continue; if (!lab[r] && d[r * 4 + 3] > 40) { lab[r] = nl; st.push(r); } } } comps.push(n); }
    comps.sort((a, b) => b - a);
    const stray = comps.slice(1).filter((n) => n > 30).length;
    // 리본(민트), 눈(파랑·보라, 위 70%), 눈동자 덩이(아주 짙은 남보라) 개수
    let mx = 0, my = 0, mn = 0, er = 0, eg = 0, eb = 0, ey = 0, en = 0;
    const pupil = new Uint8Array(w * h);
    for (let y = 0; y < Math.round(h * 0.75); y++) for (let x = 0; x < w; x++) { const q = (y * w + x) * 4, R = d[q], Gc = d[q + 1], B = d[q + 2]; if (d[q + 3] < 200) continue;
      if (Gc > R + 25 && Gc > B + 5) { mx += x; my += y; mn++; }
      if (B > R + 25 && B > Gc + 25) { er += R; eg += Gc; eb += B; ey += y; en++; if (B < 140 && R < 90) pupil[y * w + x] = 1; } }
    // 눈동자 덩이: 짙은 픽셀 연결 요소 중 넓이가 큰 것
    const pl = new Int32Array(w * h); let blobs = 0; const minBlob = Math.max(40, (w * h) / 6000);
    for (let p = 0; p < w * h; p++) { if (!pupil[p] || pl[p]) continue; const st = [p]; pl[p] = 1; let n = 0; while (st.length) { const q = st.pop(); n++; const x = q % w;
      for (const r of [q - 1, q + 1, q - w, q + w]) { if (r < 0 || r >= w * h || Math.abs((r % w) - x) > 1) continue; if (pupil[r] && !pl[r]) { pl[r] = 1; st.push(r); } } } if (n >= minBlob) blobs++; }
    let same = null; if (refData && !it.ref && refData.length === d.length) { let diff = 0; for (let i = 0; i < d.length; i++) if (d[i] !== refData[i]) { diff++; if (diff > 0) break; } same = diff === 0; }
    out.push({ name: it.name, ref: !!it.ref, size: w + 'x' + h, bbox: [x0, y0, x1, y1], top: y0, bottom: y1, lift: 495 - y1, opaque, edges, stray,
      ribbon: mn > 50 ? [Math.round(mx / mn), Math.round(my / mn)] : null, eye: en > 150 ? { y: Math.round(ey / en), color: hex([er / en, eg / en, eb / en]), rgb: [er / en, eg / en, eb / en], pupils: blobs } : null, sameAsRef: same });
    // 확인용 그림: 전체 + 위쪽 얼굴 3배 확대
    const col = k % cols, row = Math.floor(k / cols), X = 10 + col * 230, Y = 30 + row * 470;
    G.fillStyle = it.ref ? '#3A3F78' : '#232750'; G.fillRect(X, Y, 220, 220); G.drawImage(im, X, Y, 220, 220);
    const K = 220 / h; G.strokeStyle = '#FFC857'; G.beginPath(); G.moveTo(X, Y + 496 * K); G.lineTo(X + 220, Y + 496 * K); G.stroke();
    G.fillStyle = '#F6F1E7'; G.font = '600 12px sans-serif'; G.fillText(it.name.slice(0, 34), X, Y + 236);
    const fy = out[k].eye ? Math.max(0, out[k].eye.y - Math.round(w * 0.12)) : Math.round(h * 0.25); G.imageSmoothingEnabled = false;
    G.fillStyle = '#232750'; G.fillRect(X, Y + 244, 220, 200); G.drawImage(im, Math.round(w * 0.3), fy, Math.round(w * 0.4), Math.round(w * 0.36), X, Y + 244, 220, 200); G.imageSmoothingEnabled = true;
  }
  G.fillStyle = '#FFC857'; G.font = '700 14px sans-serif'; G.fillText('위: 전체(노란 줄 = 바닥 496) · 아래: 얼굴 확대 — 눈이 겹치거나 두 겹이면 안 됨, 반드시 눈으로 볼 것', 10, 20);
  return out;
})()`);
await sleep(200);
writeFileSync(out, await page.screenshot());
page.close();

// 경고
const warn = [];
const ref = res.find((r) => r.ref);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
for (const r of res) {
  if (r.ref) continue;
  const tag = r.name;
  if (kind !== 'bg' && r.size !== '512x512') warn.push(`${tag}: 캔버스 ${r.size} (512×512이어야 함 — 맞춰 넣어야 함)`);
  if (kind === 'bg' && (r.edges.left > 120 || r.edges.right > 120)) warn.push(`${tag}: 가장자리 밝은 줄(왼 ${r.edges.left}·오른 ${r.edges.right}) — 잘라 낼 것`);
  if (r.stray) warn.push(`${tag}: 떨어진 조각 ${r.stray}개`);
  if (kind !== 'bg') {
    const f01 = /f01/.test(tag);
    if (f01 && r.sameAsRef === false) warn.push(`${tag}: f01이 대기 그림과 다름`);
    if (!f01 && r.lift > 8) warn.push(`${tag}: 발이 ${r.lift}px 뜸(목표 약 6)`);
    if (r.lift < 6 && (r.bottom < 494 || r.bottom > 496)) warn.push(`${tag}: 발끝 ${r.bottom}줄(495~496이어야 함)`);
    if (ref) {
      const dTop = r.top - ref.top;
      if (Math.abs(dTop) > 15) warn.push(`${tag}: 귀 끝 ${dTop > 0 ? '+' : ''}${dTop}px(±15)`);
      if (r.eye && ref.eye) {
        const dEye = r.eye.y - ref.eye.y + Math.max(0, r.lift);
        if (Math.abs(dEye) > 6) warn.push(`${tag}: 눈 높이 ${dEye > 0 ? '+' : ''}${dEye}px(±6)`);
        if (dist(r.eye.rgb, ref.eye.rgb) > 25) warn.push(`${tag}: 눈 색 ${r.eye.color} ≠ 대기 ${ref.eye.color}`);
        if (r.eye.pupils > ref.eye.pupils) warn.push(`${tag}: 눈동자 덩이 ${r.eye.pupils}개 > 대기 ${ref.eye.pupils}개 — 눈 겹침 의심`);
      } else if (r.ribbon && ref.ribbon) {
        const dHead = r.ribbon[1] - ref.ribbon[1] + Math.max(0, r.lift);
        if (Math.abs(dHead) > 10) warn.push(`${tag}: 머리(리본) 높이 ${dHead > 0 ? '+' : ''}${dHead}px`);
      }
    }
    if (char === 'tori' && OLD_RIBBON && view && RIBBON_SIDE[view] && r.ribbon) {
      const side = r.ribbon[0] > 256 ? 'R' : 'L';
      if (side !== RIBBON_SIDE[view]) warn.push(`${tag}: 리본이 ${side === 'R' ? '오른' : '왼'}쪽 — ${view}에서는 ${RIBBON_SIDE[view] === 'R' ? '보는 쪽 오른쪽' : '보는 쪽 왼쪽'}(옛 기준)`);
    }
    // 토리 귀 규칙(화면 기준): 어느 방향이든 리본이 화면 왼쪽 — 리본을 못 찾아도 경고(리본이 빠진 그림)
    if (char === 'tori' && !OLD_RIBBON) {
      if (!r.ribbon) warn.push(`${tag}: 민트 리본을 찾지 못함(토리 귀 규칙 — 화면 왼쪽 선 귀에 리본)`);
      else if (r.ribbon[0] >= 256) warn.push(`${tag}: 리본 무게중심 x ${r.ribbon[0]} — 화면 왼쪽(256 미만)이어야 함(토리 귀 규칙: 리본이 화면 오른쪽이면 틀림)`);
    }
  }
}
console.log(JSON.stringify(res.map(({ rgb, ...r }) => ({ ...r, eye: r.eye ? { y: r.eye.y, color: r.eye.color, pupils: r.eye.pupils } : null })), null, 0).replace(/},\{"name/g, '},\n{"name'));
console.log(`\n확인용 그림: ${out}`);
console.log(warn.length ? `경고 ${warn.length}건:\n- ${warn.join('\n- ')}` : '경고 없음 (그래도 확인용 그림의 얼굴 확대를 눈으로 볼 것)');
