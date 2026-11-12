// 루미 시트 자르기: reference/LUMI-sprites 시트를 잘라 프레임·파츠·표정·VFX를 art-src/lumi/(초상은 art-src/characters/)에
// 투명 PNG로 쓰고, 확인용 한 장을 sketches/lumi-frames.png로 남긴다. 자르는 위치는 src/art/lumiSheet.ts.
// 창 없는 크롬과 임시 Vite 서버를 스스로 띄웠다가 닫는다.   사용: npm run art:lumi  (그다음 npm run art:import)
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage, sleep } from './lib/chrome.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const artSrc = join(root, 'art-src');
const port = 5181;

const vite = spawn(`npx vite --port ${port} --strictPort`, { cwd: root, shell: true, stdio: 'ignore' });
const stopVite = () => {
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(vite.pid), '/T', '/F'], { stdio: 'ignore' });
  else vite.kill();
};

try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`http://localhost:${port}/lumi.html`)).ok) break;
    } catch {}
    await sleep(500);
  }
  const page = await openPage({ width: 1200, height: 900, scale: 1 });
  try {
    // npm run art:lumi -- --debug 이면 배경을 지운 줄 전체도 art-src/lumi/debug/에 남긴다
    await page.navigate(`http://localhost:${port}/lumi.html${process.argv.includes('--debug') ? '?debug' : ''}`);
    let ready = false;
    for (let i = 0; i < 160 && !ready; i++) {
      await sleep(250);
      ready = (await page.evaluate('window.__lumiReady === true')) === true;
    }
    if (!ready) throw new Error(`lumi page not ready\n${page.logs.join('\n')}`);

    const files = await page.evaluate('window.__lumiFiles');
    const contactUrl = await page.evaluate('window.__lumiContact');
    const errors = await page.evaluate('window.__lumiErrors');

    // 시트에서 나온 결과만 다시 만든다 (art-src의 다른 그림은 그대로)
    rmSync(join(artSrc, 'lumi'), { recursive: true, force: true });
    for (const f of files) {
      const file = join(artSrc, f.path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, Buffer.from(f.dataUrl.split(',')[1], 'base64'));
    }
    if (contactUrl) writeFileSync(join(root, 'sketches', 'lumi-frames.png'), Buffer.from(contactUrl.split(',')[1], 'base64'));

    const count = {};
    for (const f of files) {
      const k = f.path.split('/').slice(0, 2).join('/');
      count[k] = (count[k] ?? 0) + 1;
    }
    console.log(`잘라 낸 그림 ${files.length}장`, count);
    console.log('확인용: sketches/lumi-frames.png');
    if (errors.length) console.log(`문제:\n  ${errors.join('\n  ')}`);
    if (page.logs.length) console.log(page.logs.join('\n'));
  } finally {
    page.close();
  }
} finally {
  stopVite();
}
