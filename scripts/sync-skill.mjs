// 게임 바이블 스킬 갱신 (2026-11-06 라이언 지시: 스킬·기획서에 반영할 내용은 즉시 갱신하고 알린다).
// 고치는 원본은 docs/skill/light-defense-game/ 이다. 이 스크립트는
//   1) src/data/*.json(밸런스 원본)을 스킬의 assets/data/로 복사하고
//   2) 이 컴퓨터의 동기화 사본(~/.claude/skills/synced/*/light-defense-game)을 같은 내용으로 바꾸고
//   3) claude.ai에 올릴 docs/skill/light-defense-game.zip 을 만든다.
// claude.ai의 원본은 라이언이 zip을 올려야 바뀐다(올리지 않으면 다음 동기화 때 이 컴퓨터 사본이 옛 내용으로 돌아갈 수 있다).
// 사용: npm run doc:skill
import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
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
rmSync(ZIP, { force: true });
const zipped =
  process.platform === 'win32'
    ? spawnSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${SKILL}' -DestinationPath '${ZIP}' -Force`], { stdio: 'inherit' })
    : spawnSync('zip', ['-r', '-q', ZIP, 'light-defense-game'], { cwd: dirname(SKILL), stdio: 'inherit' });
if (zipped.status !== 0 || !existsSync(ZIP)) {
  console.error('zip을 만들지 못했습니다');
  process.exit(1);
}
console.log(`claude.ai 업로드용 → ${ZIP}`);
