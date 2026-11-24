// 바닥 타일 → 게임 바닥 두 판 (2026-11-24, 바닥 연결): reference/Ground_Pack/ground-<지역>.png(384×384, 이음새 없음)를
//   art-src/backgrounds/ground-<지역>.png      (밤 판 = 어두운 마을 층 밑에 깔림)
//   art-src/backgrounds/ground-<지역>-lit.png  (빛 받은 판 = 빛 자국 안에서 보임)
// 으로 굽는다. 무늬·밝기 대비는 타일 그대로, 평균 색만 지금 마을 바닥(코드 그림 DARK·LIT 판석의 평균)에 맞춘다 —
// 빛 안팎의 밝기와 지역 색조(VillageStage THEMES의 색조·막)는 예전 그대로 두고 바닥 무늬만 받은 그림으로 바꾸기 위해.
//   out = (1 − k) × 목표색 × (L / L평균)  +  k × 원래색 × (목표밝기 / L평균)     (k = 원래 색을 남기는 몫, 픽셀마다라 이음새 그대로)
// 사용: node scripts/ground-tiles.mjs   (타일 수정본이 오면 다시 돌리고 npm run assets)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { openPage } from './lib/chrome.mjs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const THEMES = ['light', 'border', 'dark'];
/** 지금 마을 바닥 평균 (public/assets/backgrounds/village-dark·lit.webp 바닥 자리, 2026-11-24 잼) */
const TARGET = { night: [46, 42, 68], lit: [153, 95, 53] };
/** 원래 타일 색을 남기는 몫 (제안) */
const KEEP = 0.35;

const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const page = await openPage({ width: 200, height: 200, scale: 1 });
mkdirSync(`${ROOT}/art-src/backgrounds`, { recursive: true });
const report = [];
for (const t of THEMES) {
  const url = 'data:image/png;base64,' + readFileSync(`${ROOT}/reference/Ground_Pack/ground-${t}.png`).toString('base64');
  for (const [kind, target] of Object.entries(TARGET)) {
    const res = await page.evaluate(`(async () => {
      const im = new Image(); im.src = ${JSON.stringify(url)}; await im.decode();
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      const img = g.getImageData(0, 0, c.width, c.height); const d = img.data;
      const L = (i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      let sum = 0; for (let i = 0; i < d.length; i += 4) sum += L(i);
      const Lm = sum / (d.length / 4);
      const T = ${JSON.stringify(target)}; const Lt = ${lum(target)}; const k = ${KEEP};
      let R = 0, G = 0, B = 0;
      for (let i = 0; i < d.length; i += 4) {
        const s = L(i) / Lm;
        for (let ch = 0; ch < 3; ch++) d[i + ch] = Math.max(0, Math.min(255, Math.round((1 - k) * T[ch] * s + k * d[i + ch] * (Lt / Lm))));
        d[i + 3] = 255; R += d[i]; G += d[i + 1]; B += d[i + 2];
      }
      g.putImageData(img, 0, 0);
      const n = d.length / 4;
      return { png: c.toDataURL('image/png').split(',')[1], mean: [R / n, G / n, B / n].map(Math.round), size: c.width + 'x' + c.height };
    })()`);
    const file = `${ROOT}/art-src/backgrounds/ground-${t}${kind === 'lit' ? '-lit' : ''}.png`;
    writeFileSync(file, Buffer.from(res.png, 'base64'));
    report.push(`${t.padEnd(6)} ${kind.padEnd(5)} ${res.size} 평균 ${res.mean.join(',')} (목표 ${target.join(',')}) → ${file.replace(ROOT + '/', '')}`);
  }
}
page.close();
console.log(report.join('\n'));
