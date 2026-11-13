// 게임 바이블 스킬 갱신 (2026-11-06 라이언 지시: 스킬·기획서에 반영할 내용은 즉시 갱신하고 알린다).
// 고치는 원본은 docs/skill/light-defense-game/ 이다. 이 스크립트는
//   1) src/data/*.json(밸런스 원본)을 스킬의 assets/data/로 복사하고
//   2) 이 컴퓨터의 동기화 사본(~/.claude/skills/synced/*/light-defense-game)을 같은 내용으로 바꾸고
//   3) claude.ai에 올릴 docs/skill/light-defense-game.zip 을 만든다.
// claude.ai의 원본은 라이언이 zip을 올려야 바뀐다(올리지 않으면 다음 동기화 때 이 컴퓨터 사본이 옛 내용으로 돌아갈 수 있다).
// 사용: npm run doc:skill
import { copyFileSync, cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKILL = join(root, 'docs', 'skill', 'light-defense-game');
const ZIP = join(root, 'docs', 'skill', 'light-defense-game.zip');
const SYNCED_ROOT = join(homedir(), '.claude', 'skills', 'synced');

// 1) 밸런스 원본 복사
const dataDir = join(root, 'src', 'data');
const json = readdirSync(dataDir).filter((f) => f.endsWith('.json'));
for (const f of json) copyFileSync(join(dataDir, f), join(SKILL, 'assets', 'data', f));
console.log(`데이터 ${json.length}개 → assets/data (${json.join(', ')})`);

// 2) 이 컴퓨터의 동기화 사본
const targets = existsSync(SYNCED_ROOT)
  ? readdirSync(SYNCED_ROOT)
      .map((d) => join(SYNCED_ROOT, d, 'light-defense-game'))
      .filter((p) => existsSync(join(p, 'SKILL.md')))
  : [];
if (!targets.length) console.log('이 컴퓨터에 동기화된 light-defense-game 스킬이 없어 건너뜀');
for (const t of targets) {
  rmSync(t, { recursive: true, force: true });
  cpSync(SKILL, t, { recursive: true });
  console.log(`동기화 사본 갱신 → ${t}`);
}

// 3) claude.ai 업로드용 zip (폴더째: light-defense-game/SKILL.md …)
// 2026-11-13: Windows PowerShell 5.1의 Compress-Archive는 zip 안 경로를 역슬래시(\)로 적어 claude.ai가
// "Zip file contains path with invalid characters"로 거절한다 → Node만으로 슬래시(/)·UTF-8 이름의 zip을 직접 만든다.
rmSync(ZIP, { force: true });
writeFileSync(ZIP, makeZip(SKILL, 'light-defense-game'));
if (!existsSync(ZIP)) {
  console.error('zip을 만들지 못했습니다');
  process.exit(1);
}
console.log(`claude.ai 업로드용 → ${ZIP}`);

/** 폴더를 prefix/… 경로의 zip(deflate)으로. 경로 구분은 항상 '/' */
function makeZip(dir, prefix) {
  const files = [];
  const walk = (abs, rel) => {
    for (const e of readdirSync(abs, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const a = join(abs, e.name);
      const r = `${rel}/${e.name}`;
      if (e.isDirectory()) walk(a, r);
      else files.push({ name: r, data: readFileSync(a) });
    }
  };
  walk(dir, prefix);
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8');
    const packed = deflateRawSync(f.data);
    const crc = crc32(f.data);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(20, 4);
    head.writeUInt16LE(0x0800, 6); // UTF-8 이름
    head.writeUInt16LE(8, 8); // deflate
    head.writeUInt32LE(0, 10); // 시각 (없음)
    head.writeUInt32LE(crc, 14);
    head.writeUInt32LE(packed.length, 18);
    head.writeUInt32LE(f.data.length, 22);
    head.writeUInt16LE(name.length, 26);
    head.writeUInt16LE(0, 28);
    locals.push(head, name, packed);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0x0800, 8);
    cen.writeUInt16LE(8, 10);
    cen.writeUInt32LE(0, 12);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(packed.length, 20);
    cen.writeUInt32LE(f.data.length, 24);
    cen.writeUInt16LE(name.length, 28);
    cen.writeUInt32LE(offset, 42);
    centrals.push(cen, name);
    offset += head.length + name.length + packed.length;
  }
  const cenSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cenSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}
