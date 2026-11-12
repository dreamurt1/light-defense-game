// 에셋 내보내기: src/art/registry.ts의 모든 시트를 스프라이트 시트(PNG, 배경은 WebP)로, UI 아이콘을 SVG로 public/assets/에 쓴다.
// art-src/<분류>/에 생성 그림이 있으면 그 그림을 다듬어 쓰고(docs/art-order.md), 없으면 코드 그림을 쓴다.
// 창 없는 크롬과 임시 Vite 서버를 스스로 띄웠다가 닫는다.   사용: npm run assets  (= npm run art:import)
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage, sleep } from './lib/chrome.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'assets');
const port = 5179;

const vite = spawn(`npx vite --port ${port} --strictPort`, { cwd: root, shell: true, stdio: 'ignore' });
const stopVite = () => {
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(vite.pid), '/T', '/F'], { stdio: 'ignore' });
  else vite.kill();
};

try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`http://localhost:${port}/assets.html`)).ok) break;
    } catch {}
    await sleep(500);
  }

  const page = await openPage({ width: 1400, height: 900, scale: 1 });
  try {
    await page.navigate(`http://localhost:${port}/assets.html`);
    let ready = false;
    for (let i = 0; i < 120 && !ready; i++) {
      await sleep(250);
      ready = (await page.evaluate('window.__assetsReady === true')) === true;
    }
    if (!ready) throw new Error(`asset page not ready\n${page.logs.join('\n')}`);

    const sheets = await page.evaluate('window.__assetSheets');
    const ui = await page.evaluate('window.__uiIcons');
    const errors = await page.evaluate('window.__assetErrors');
    const vectors = await page.evaluate('window.__vectors');

    rmSync(outDir, { recursive: true, force: true });
    for (const s of sheets) {
      const file = join(outDir, s.file);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, Buffer.from(s.dataUrl.split(',')[1], 'base64'));
    }
    mkdirSync(join(outDir, 'ui'), { recursive: true });
    for (const [name, markup] of Object.entries(ui)) writeFileSync(join(outDir, 'ui', `${name}.svg`), markup + '\n');
    // 공격 범위 표시 벡터 (src/art/vectors.ts): 게임이 load.svg로 불러온다
    for (const [name, markup] of Object.entries(vectors)) writeFileSync(join(outDir, 'ui', `${name}.svg`), markup + '\n');

    const manifest = {
      version: 1,
      generatedAt: new Date().toISOString(),
      sheets: sheets.map(({ dataUrl: _d, ...rest }) => rest),
      ui: [...Object.keys(ui), ...Object.keys(vectors)].map((n) => `ui/${n}.svg`),
    };
    writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

    const byCat = {};
    for (const s of sheets) byCat[s.category] = (byCat[s.category] ?? 0) + 1;
    console.log(`exported ${sheets.length} sheets`, byCat, `+ ${Object.keys(ui).length} ui icons → public/assets/`);
    const art = sheets.filter((s) => s.source === 'art');
    console.log(art.length ? `생성 그림 ${art.length}개: ${art.map((s) => `${s.key}(×${s.res})`).join(', ')}` : '생성 그림 없음 (모두 코드 그림)');
    if (errors.length) console.log(`그림을 쓰지 못한 시트 (코드 그림으로 대신함):\n  ${errors.join('\n  ')}`);
    if (page.logs.length) console.log(page.logs.join('\n'));
  } finally {
    page.close();
  }
} finally {
  stopVite();
}
