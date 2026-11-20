// 홈 화면 앱 아이콘 만들기 (2026-11-20 휴대폰 '접속하자마자 전체 화면' — 홈 화면 앱(PWA)으로 열면 탭 없이 바로 전체 화면).
// 스플래시의 별 등불(index.html과 같은 그림)을 남색 바탕 가운데에. 창 없는 크롬 캔버스로 그려 public/icons/에 쓴다.
// 사용: node scripts/app-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage } from './lib/chrome.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'icons');

// index.html 스플래시의 등불과 같은 그림 (viewBox 96×132)
const LANTERN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 132">
  <defs><radialGradient id="g" cx="50%" cy="60%" r="60%"><stop offset="0" stop-color="#FFF4D2"/><stop offset=".55" stop-color="#FFC857"/><stop offset="1" stop-color="#E08A2E"/></radialGradient></defs>
  <path d="M48 6a10 10 0 0 0-10 10v6h20v-6A10 10 0 0 0 48 6Z" fill="none" stroke="#9A6B34" stroke-width="4"/>
  <path d="M26 28h44l-6 10H32Z" fill="#9A6B34"/>
  <rect x="30" y="38" width="36" height="66" rx="10" fill="url(#g)" stroke="#5A3E26" stroke-width="4"/>
  <path d="M48 40v62M31 70h34" stroke="#5A3E26" stroke-width="3" opacity=".55"/>
  <path d="M48 58c7 9 9 15 9 20a9 9 0 0 1-18 0c0-5 2-11 9-20Z" fill="#FFF1C9"/>
  <path d="M48 68c3 4 4 7 4 10a4 4 0 0 1-8 0c0-3 1-6 4-10Z" fill="#FF8C5A"/>
  <path d="M24 104h48l-4 12H28Z" fill="#9A6B34"/>
  <rect x="22" y="116" width="52" height="8" rx="3" fill="#5A3E26"/>
</svg>`;

/** name, 크기, 등불이 차지하는 높이 비율(maskable은 안전 구역 80% 안), 둥근 모서리 */
const ICONS = [
  { file: 'icon-192.png', size: 192, fill: 0.72, radius: 0.22 },
  { file: 'icon-512.png', size: 512, fill: 0.72, radius: 0.22 },
  { file: 'icon-maskable-512.png', size: 512, fill: 0.56, radius: 0 },
  { file: 'apple-touch-icon.png', size: 180, fill: 0.7, radius: 0 },
];

const page = await openPage({ width: 600, height: 600, scale: 1 });
try {
  mkdirSync(out, { recursive: true });
  for (const icon of ICONS) {
    const dataUrl = await page.evaluate(`(async () => {
      const S = ${icon.size}, c = document.createElement('canvas'); c.width = S; c.height = S; const g = c.getContext('2d');
      const r = ${icon.radius} * S;
      g.beginPath(); g.roundRect(0, 0, S, S, r); g.clip();
      // 남색 밤 + 가운데 호박빛 번짐
      const bg = g.createLinearGradient(0, 0, 0, S); bg.addColorStop(0, '#2A2F5A'); bg.addColorStop(1, '#120F24'); g.fillStyle = bg; g.fillRect(0, 0, S, S);
      const glow = g.createRadialGradient(S / 2, S * 0.56, 0, S / 2, S * 0.56, S * 0.46); glow.addColorStop(0, 'rgba(255,200,87,0.55)'); glow.addColorStop(1, 'rgba(255,200,87,0)'); g.fillStyle = glow; g.fillRect(0, 0, S, S);
      const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(${JSON.stringify(LANTERN)}); await img.decode();
      const h = S * ${icon.fill}, w = h * 96 / 132;
      g.drawImage(img, (S - w) / 2, (S - h) / 2 + S * 0.01, w, h);
      return c.toDataURL('image/png');
    })()`);
    writeFileSync(join(out, icon.file), Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log('public/icons/' + icon.file);
  }
} finally {
  page.close();
}
