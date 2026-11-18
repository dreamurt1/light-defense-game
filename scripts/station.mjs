// ChatGPT 의뢰 묶음을 바탕화면 전달 폴더(station)에 옮긴다 (스킬 ld-chatgpt-order).
//
// 사용: node scripts/station.mjs --from hand-offs/chatgpt-<주제>-YY-MMDD-HHMM [--add 파일1,파일2,...] [--readme 안내.txt]
//   - --from 폴더의 파일(README.md 제외 — 라이언용 안내는 --readme로)을 station/<같은 이름>/에 복사
//   - --add: 함께 올릴 다른 파일(기준 사실서·컨셉 그림·팩 zip 등)
//   - --readme: '읽어보세요(올리지 않음).txt'로 복사(올릴 순서·메시지·확인할 것)
//   - 올릴 파일이 10개를 넘으면 경고(ChatGPT 한 번 올리기 한도)
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

const STATION = 'C:/Users/user/Desktop/file_station_for_ryan';
const arg = (k, d = null) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const from = arg('from');
if (!from || !existsSync(from)) {
  console.error('사용: node scripts/station.mjs --from hand-offs/chatgpt-<주제>-YY-MMDD-HHMM [--add a,b] [--readme 안내.txt]');
  process.exit(1);
}
const dest = join(STATION, basename(from));
mkdirSync(dest, { recursive: true });
const files = readdirSync(from)
  .filter((f) => f !== 'README.md' && statSync(join(from, f)).isFile())
  .map((f) => join(from, f));
for (const f of (arg('add', '') || '').split(',').filter(Boolean)) files.push(f);
for (const f of files) {
  if (!existsSync(f)) {
    console.error('없음:', f);
    process.exit(1);
  }
  copyFileSync(f, join(dest, basename(f)));
}
const readme = arg('readme');
if (readme) copyFileSync(readme, join(dest, '읽어보세요(올리지 않음).txt'));
console.log(`station: ${dest}`);
for (const f of readdirSync(dest)) console.log(`  ${f}  ${statSync(join(dest, f)).size}B`);
const upload = readdirSync(dest).filter((f) => !f.startsWith('읽어보세요') && f !== 'received');
console.log(upload.length > 10 ? `경고: 올릴 파일 ${upload.length}개 — 10개를 넘음, 안내 txt에 순서를 적을 것` : `올릴 파일 ${upload.length}개`);
