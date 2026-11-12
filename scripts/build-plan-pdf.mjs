// 기획서 개정판 만들기 (2026-11-06 라이언 지시: 스킬·기획서에 반영할 내용은 즉시 갱신하고 알린다).
// docs/plan/revisions.html(개정 사항)을 창 없는 크롬으로 A4 PDF로 만들고, 원본 기획서 9쪽 앞에 붙여
// reference/라이트_디펜스_게임개발기획서(가칭)_개정판.pdf 로 쓴다. 원본 PDF는 손대지 않는다.   사용: npm run doc:plan
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { openPage, sleep } from './lib/chrome.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(root, 'docs', 'plan', 'revisions.html');
const ORIGINAL = join(root, 'reference', '라이트_디펜스_게임개발기획서(가칭).pdf');
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
      '<div style="width:100%;font-size:7.5pt;color:#8a8fa8;text-align:center;font-family:Malgun Gothic,sans-serif">라이트 디펜스 게임 개발 기획서 · 개정 사항 <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  });
  if (!res.result?.data) throw new Error(`printToPDF 실패: ${JSON.stringify(res.error ?? res)}`);
  revisions = Buffer.from(res.result.data, 'base64');
} finally {
  page.close();
}

const out = await PDFDocument.create();
const front = await PDFDocument.load(revisions);
const original = await PDFDocument.load(readFileSync(ORIGINAL));
for (const p of await out.copyPages(front, front.getPageIndices())) out.addPage(p);
for (const p of await out.copyPages(original, original.getPageIndices())) out.addPage(p);
out.setTitle('라이트 디펜스 게임 개발 기획서 (개정판)');
out.setSubject('앞쪽 개정 사항이 뒤의 2026-10-28 본문보다 우선한다');
writeFileSync(OUT, await out.save());
console.log(`개정 사항 ${front.getPageCount()}쪽 + 원본 ${original.getPageCount()}쪽 → ${OUT}`);
