// 격자 맵 검사 (2026-11-23 밤 나들이 v3, NIGHT_RUN.md 7-3절): npm run check:maps
// 맵마다: 33×19 · 광장 7×7이 C · 모든 걷는 칸이 광장에서 4방향으로 이어짐 · 등불 자리 L 정확히 4개·도달·광장 가운데에서 4~8칸(가로·세로 중 큰 값)
// · 장애물 덩어리 크기가 사전에 있음 · 강이 있으면 다리 · 가장자리 칸(0·18행, 0·32열)에 덩어리 장애물 없음. 실패하면 어느 칸인지 출력.
// 로직은 src/systems/grid.ts 하나(테스트 tests/maps.test.ts와 같음) — node가 타입만 지우고 바로 읽는다.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkMap, farFloorCells, friendSpotCells, lampCells, plazaDist } from '../src/systems/grid.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dict = JSON.parse(readFileSync(join(root, 'src/data/obstacles.json'), 'utf8'));
const dir = join(root, 'src/data/maps');
const nights = JSON.parse(readFileSync(join(root, 'src/data/nights.json'), 'utf8'));
// 구간마다 등불 거리(2026-11-24 A = 4~6칸) — 맵의 band로
const lampDistOf = (band) => nights.bands.find((b) => b.id === band)?.lampDist ?? dict.lampDist;
let bad = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  const map = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  const errs = checkMap(map, dict, lampDistOf(map.band));
  if (errs.length === 0) {
    const lamps = lampCells(map, dict).map((c) => `(${c.col},${c.row}) ${plazaDist(c, dict)}칸`).join(' ');
    const far = farFloorCells(map, dict).map((c) => `(${c.col},${c.row})`).join(' ');
    const friend = friendSpotCells(map, dict, nights.rescue.spotDist).length;
    console.log(`통과 ${map.id} ${map.name} — 등불 자리 ${lamps} · 먼 바닥 ${far} · 친구 자리 후보 ${friend}칸`);
  } else {
    bad++;
    console.log(`실패 ${map.id} ${map.name}`);
    for (const e of errs) console.log(`  - ${e}`);
  }
}
if (bad) process.exit(1);
