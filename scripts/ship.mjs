// 마무리·배포 (스킬 ld-ship): 타입 → 테스트 → 빌드 → (스킬 zip) → 커밋·푸시 → (배포 → 라이브 대조) → 윈도우 알림.
//
// 사용: node scripts/ship.mjs --msg <커밋 메시지 파일> [--paths a,b,c] [--deploy] [--notify "알림 문장"] [--skip-tests]
//   --msg   : 커밋 메시지 파일(제목 + 본문 + 저장소 규칙의 Co-Authored-By·Claude-Session 줄). 없으면 커밋하지 않는다.
//   --paths : git add 할 경로들(없으면 이미 담긴 것만 커밋). 진행 중인 다른 작업이 섞이지 않게 경로를 꼭 준다.
//   --deploy: Firebase Hosting 배포 후, 이번 커밋에서 바뀐 public/ 파일이 라이브와 같은지 md5로 대조.
// 스킬 원본(docs/skill)이나 src/data가 바뀌었으면 doc:skill을 돌리고 "zip 다시 올리기 필요"를 출력한다.
// 폰 알림은 도구(PushNotification)라서 이 스크립트 밖에서 따로 보낸다.
import { execSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

const arg = (k, d = null) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const has = (k) => process.argv.includes(`--${k}`);
const sh = (cmd, opts = {}) => execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts });
const step = (title, cmd) => {
  process.stdout.write(`· ${title} … `);
  const r = spawnSync(cmd, { shell: true, encoding: 'utf8' });
  if (r.status !== 0) {
    console.log('실패');
    console.log((r.stdout || '').slice(-3000), (r.stderr || '').slice(-3000));
    process.exit(1);
  }
  const tail = (r.stdout || '').trim().split('\n').filter(Boolean).slice(-1)[0] ?? '';
  console.log(`통과 ${tail.replace(/\x1b\[[0-9;]*m/g, '').slice(0, 80)}`);
};

if (!has('skip-tests')) {
  step('타입', 'npx tsc --noEmit');
  step('테스트', 'npx vitest run');
}
step('빌드', 'npm run build');

const paths = (arg('paths', '') || '').split(',').filter(Boolean);
if (paths.length) sh(`git add -A -- ${paths.map((p) => `"${p}"`).join(' ')}`);
const staged = sh('git diff --cached --name-only').split('\n').filter(Boolean);
let zipNotice = false;
if (staged.some((f) => f.startsWith('docs/skill/light-defense-game/') || f.startsWith('src/data/'))) {
  step('스킬 zip', 'npm run doc:skill');
  sh('git add -A -- docs/skill');
  zipNotice = true;
}

const msg = arg('msg');
let committed = false;
if (msg && existsSync(msg) && sh('git diff --cached --name-only').trim()) {
  sh(`git -c user.email=dreamurt1@users.noreply.github.com commit -q -F "${msg}"`);
  sh('git push -q');
  committed = true;
  console.log(`· 커밋·푸시: ${sh('git log --oneline -1').trim()}`);
} else console.log('· 커밋 없음(메시지 파일이 없거나 담긴 변경이 없음)');

if (has('deploy')) {
  step('배포', 'npx firebase deploy --only hosting');
  const changed = (committed ? sh('git diff --name-only HEAD~1 HEAD') : '').split('\n').filter((f) => f.startsWith('public/') && existsSync(f));
  for (const f of changed.slice(0, 12)) {
    const local = createHash('md5').update(readFileSync(f)).digest('hex');
    const url = `https://light-defense-game.web.app/${f.replace(/^public\//, '')}`;
    const buf = Buffer.from(await (await fetch(url, { cache: 'no-store' })).arrayBuffer());
    const live = createHash('md5').update(buf).digest('hex');
    console.log(`  라이브 ${local === live ? '같음' : '다름!'}  ${f}`);
  }
}
const note = arg('notify');
if (note) spawnSync('powershell', ['-NoProfile', '-File', 'scripts/notify.ps1', note], { stdio: 'ignore' });
if (zipNotice) console.log('\n※ zip 다시 올리기 필요 (docs/skill/light-defense-game.zip → claude.ai)');
console.log(sh('git status -sb').split('\n')[0]);
