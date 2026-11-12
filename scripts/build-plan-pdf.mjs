// 기획서 개정판 만들기. docs/plan/revisions.html을 창 없는 크롬으로 A4 PDF로 만들어
// reference/라이트_디펜스_게임개발기획서(가칭)_개정판.pdf 로 쓴다. 원본 PDF(2026-10-28)·XMind PDF는 손대지 않는다.
// 2026-11-12: 새 기획(XMind 1112)으로 본문 전체를 다시 썼으므로 옛 원본 9쪽은 더 붙이지 않는다(원본 파일은 reference/에 그대로).
// 외부에 보여 줄 파일이라 라이언이 고치라고 할 때만 돌린다(CLAUDE.md 0절).   사용: npm run doc:plan
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { openPage, sleep } from './lib/chrome.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(root, 'docs', 'plan', 'revisions.html');
const OUT = join(root, 'reference', '라이트_디펜스_게임개발기획서(가칭)_개정판.pdf');

const page = await openPage({ width: 900, height: 1200, scale: 1 });
let revisions;
try {
  await page.navigate(pathToFileURL(SOURCE).href);
  // 글꼴이 다 불러와진 뒤에 찍는다
  for (let i = 0; i < 40; i++) {
    if ((await page.evaluate('document.fonts.status')) === 'loaded') break;
    await sleep(100);
  }
  const res = await page.send('Page.printToPDF', {
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate:
      '<div style="width:100%;font-size:7.5pt;color:#8a8fa8;text-align:center;font-family:Malgun Gothic,sans-serif">라이트 디펜스 게임 개발 기획서 · 2026-11-12 개정판 <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  });
  if (!res.result?.data) throw new Error(`printToPDF 실패: ${JSON.stringify(res.error ?? res)}`);
  revisions = Buffer.from(res.result.data, 'base64');
} finally {
  page.close();
}

const out = await PDFDocument.create();
const front = await PDFDocument.load(revisions);
for (const p of await out.copyPages(front, front.getPageIndices())) out.addPage(p);
out.setTitle('라이트 디펜스 게임 개발 기획서 (2026-11-12 개정판)');
out.setSubject('새 기획(XMind 1112) 기준. 2026-10-28 기획서와 이전 개정 사항을 대체한다');
writeFileSync(OUT, await out.save());
console.log(`개정판 ${front.getPageCount()}쪽 → ${OUT}`);
