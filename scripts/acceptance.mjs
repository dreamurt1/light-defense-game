// 완료 기준(docs/design/ACCEPTANCE_CRITERIA.md) 헤드리스 점검 (2026-11-19). 창 없는 크롬으로 실제 게임을 돌려 확인한다.
// 단위 테스트(npx vitest run)로 확인하는 항목은 여기서 다시 하지 않는다 — 문서의 각 항목 옆에 근거를 적어 둔다.
// dev 서버(npm run dev, 5173)가 켜져 있어야 한다.
//
// 사용: node scripts/acceptance.mjs [--skip-long] [--out <결과 json>]
//   --skip-long: 한 판 끝까지(약 2분) 도는 F 항목을 건너뛴다.
// 2026-11-23 밤 나들이 v3: 옛 1~4스테이지 대신 밤 런(&night=n)·격자 맵 A1(&map=A1 = 테스트 판), I절 '런' 항목
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { openPage, sleep } from './lib/chrome.mjs';

const BASE = process.env.LD_BASE ?? 'http://localhost:5173/'; // 다른 포트의 dev 서버면 LD_BASE=http://localhost:5174/
const LIVE = 'https://light-defense-game.web.app/';
const skipLong = process.argv.includes('--skip-long');
const outIdx = process.argv.indexOf('--out');
const out = outIdx > 0 ? process.argv[outIdx + 1] : null;

const results = [];
const record = (id, ok, detail) => {
  results.push({ id, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${id} — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
};
const SC = "window.__game.scene.getScene('Play')";
const errorsOf = (page) => page.logs.filter((l) => /^(EXCEPTION|ERROR)/.test(l));
/** 사방 두 칸(192)이 트인 자리 — 격자 맵 A1의 16열 4행 칸 중심 (이동 점검용, 2026-11-23) */
const SPOT = { x: 1584, y: 432 };
/** 점검용 판: 밤 1 · 맵 A1 · seed 고정 (맵을 고르면 테스트 판 — 기록에 남지 않음) */
const NIGHT1 = 'night=1&map=A1&seed=7';
const place = `s.keeper.pos.x = ${SPOT.x}; s.keeper.pos.y = ${SPOT.y};`;
const wait = 'const wait = (ms) => new Promise((r) => setTimeout(r, ms));';

/** 판 하나 (자동 조작 없이 서 있음) + 이벤트 기록 */
async function playPage(q = NIGHT1, opts = {}) {
  const page = await openPage({ width: 960, height: 540, scale: 1, ...opts });
  await page.navigate(`${BASE}?autoplay=300&${q}&idle`);
  await sleep(4500);
  await page.evaluate(`(async () => { const { bus } = await import('/src/core/events.ts'); window.__bus = bus;
    window.__ev = { cast: 0, last: null, returned: [] };
    bus.on('light:cast', (e) => { window.__ev.cast++; window.__ev.last = e; });
    bus.on('enemy:returned', (e) => window.__ev.returned.push(e.kind)); })()`);
  return page;
}
/** 새 적은 마을 구석에서 나오게 하고, 있던 적도 계속 구석으로 (점검을 방해하지 않게 — 화면 위아래 가장자리는 사거리 안이라 바로 겨눠짐) */
const keepEnemiesAway = `(() => { const s = ${SC}; const f = s.field; const away = (e) => { e.x = 80; e.y = 80; if (e.base) { e.base.x = 80; e.base.y = 80; } }; if (!f.__create) { f.__create = f.create.bind(f); f.create = (id, x, y) => (window.__allowSpawn ? f.__create(id, x, y) : f.__create(id, 80, 80)); }
  clearInterval(window.__away); window.__away = setInterval(() => { for (const e of f.enemies) if (!e.__keep) away(e); }, 100); for (const e of f.enemies) away(e); })()`;

// ── A2 콘솔 오류: 메뉴 화면 넷 + 밤 2 20초 (동시에)
{
  const qs = ['?screen=home', '?screen=select', '?screen=shop', '?screen=ranking', '?autoplay=20&night=2&seed=7'];
  const errs = (
    await Promise.all(
      qs.map(async (q) => {
        const page = await openPage({ width: 960, height: 540, scale: 1 });
        await page.navigate(BASE + q);
        await sleep(q.includes('autoplay') ? 20000 : 3500);
        const e = errorsOf(page).map((x) => `${q} ${x}`);
        page.close();
        return e;
      }),
    )
  ).flat();
  record('A2 콘솔 오류', errs.length === 0, errs.length ? errs.slice(0, 5) : '홈·선택·상점·지난 밤들·밤 2 20초 — 오류 0');
}

// ── A4 가로·세로 화면에서 버튼이 잘리지 않음: 라이언 지정 4종 × 화면 다섯(홈·선택·상점·지난 밤들·판 HUD)
{
  const sizes = [
    ['PC 풀 화면', 1920, 1080, false, 'landscape'],
    ['PC 세로', 1920, 1080, false, 'portrait'],
    ['모바일 세로', 390, 844, true, 'landscape'],
    ['모바일 가로', 844, 390, true, 'landscape'],
  ];
  const screens = ['?screen=home', '?screen=select', '?screen=shop', '?screen=ranking', `?autoplay=300&${NIGHT1}&idle`];
  const clipped = [];
  await Promise.all(
    sizes.map(async ([name, w, h, phone, orient]) => {
      for (const q of screens) {
        const page = await openPage({ width: w, height: h, scale: 1, phone });
        await page.navigate(BASE + '?screen=home');
        await sleep(800);
        await page.evaluate(`localStorage.setItem('ld.settings.v1', JSON.stringify({ orientation: '${orient}' }))`);
        await page.navigate(BASE + q);
        await sleep(q.includes('autoplay') ? 5000 : 3000);
        const bad = await page.evaluate(`(() => {
          const scrolls = (el) => { for (let a = el.parentElement; a; a = a.parentElement) { const s = getComputedStyle(a); if (/(auto|scroll)/.test(s.overflowY + s.overflowX) && (a.scrollHeight > a.clientHeight + 1 || a.scrollWidth > a.clientWidth + 1)) return true; } return false; };
          return [...document.querySelectorAll('button, .pill, a[href]')].filter((el) => { const r = el.getBoundingClientRect(); const st = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && el.closest('[hidden]') === null && !scrolls(el); })
            .map((el) => ({ el, r: el.getBoundingClientRect() }))
            .filter(({ r }) => r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1)
            .map(({ el, r }) => (el.getAttribute('aria-label') || el.textContent.trim()).slice(0, 20) + ' ' + [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)].join(','));
        })()`);
        for (const b of bad) clipped.push(`${name} ${q} ${b}`);
        page.close();
      }
    }),
  );
  record('A4 4종 화면에서 버튼 잘림 없음', clipped.length === 0, clipped.length ? clipped.slice(0, 8) : '4종 × 화면 5 — 화면 밖으로 나간 버튼 0');
}

// ── 판 하나로 A3·A5·B·C·E5
{
  const page = await playPage();
  const size = () => page.evaluate(`({ layout: document.documentElement.dataset.layout, w: window.__game.scale.gameSize.width, h: window.__game.scale.gameSize.height })`);
  // A3 창 크기 변경
  const before = await size();
  await page.send('Emulation.setDeviceMetricsOverride', { width: 540, height: 960, deviceScaleFactor: 1, mobile: false });
  await sleep(1200);
  const tall = await size();
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 540, deviceScaleFactor: 1, mobile: false });
  await sleep(1200);
  const wide = await size();
  await page.send('Emulation.setDeviceMetricsOverride', { width: 960, height: 540, deviceScaleFactor: 1, mobile: false });
  await sleep(1200);
  // 창 모양이 바뀌면 일시정지되므로 다시 이어 간다
  await page.evaluate(`(() => { const s = ${SC}; if (s.paused) window.__bus.emit('ui:pause-toggle'); })()`);
  await sleep(400);
  record('A3 창 크기 변경', before.layout === 'landscape' && tall.layout === 'portrait' && tall.w === 540 && tall.h === 960 && wide.w > before.w, { before, tall, wide });

  // A5 터치 제스처: 페이지가 끌려 스크롤·당겨서 새로고침되지 않게
  const css = await page.evaluate(`({ html: getComputedStyle(document.documentElement).overscrollBehaviorY, body: getComputedStyle(document.body).overscrollBehaviorY,
    stage: getComputedStyle(document.querySelector('.stage')).touchAction, canvas: getComputedStyle(document.querySelector('canvas')).touchAction,
    pullInPlay: document.querySelector('.pull-refresh') ? getComputedStyle(document.querySelector('.pull-refresh')).display : 'none' })`);
  record('A5 터치 제스처 막음', css.html === 'none' && css.body === 'none' && css.stage === 'none', css);

  await page.evaluate(keepEnemiesAway);
  // B1 왼쪽 스틱 360°: 8방향으로 0.6초씩
  const dirs = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const r = await page.evaluate(`(async () => { ${wait} const s = ${SC}; ${place} await wait(60); const x0 = s.keeper.pos.x, y0 = s.keeper.pos.y;
      window.__bus.emit('input:move', { x: ${Math.cos(a)}, y: ${Math.sin(a)} }); await wait(600); window.__bus.emit('input:move', { x: 0, y: 0 }); await wait(60);
      return { dx: s.keeper.pos.x - x0, dy: s.keeper.pos.y - y0 }; })()`);
    const got = Math.atan2(r.dy, r.dx);
    const err = Math.abs(((got - a + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    dirs.push({ deg: i * 45, got: Math.round((got * 180) / Math.PI), dist: Math.round(Math.hypot(r.dx, r.dy)), err: +((err * 180) / Math.PI).toFixed(1) });
  }
  record('B1 왼쪽 스틱 360° 이동', dirs.every((d) => d.err < 6 && d.dist > 70), dirs);

  // B2 PC 키보드(D) · 마우스 끌어 놓기
  await page.evaluate(`(() => { const s = ${SC}; ${place} })()`);
  const x0 = await page.evaluate(`${SC}.keeper.pos.x`);
  const key = (type) => page.send('Input.dispatchKeyEvent', { type, key: 'd', code: 'KeyD', windowsVirtualKeyCode: 68, nativeVirtualKeyCode: 68 });
  await key('keyDown');
  await sleep(400);
  await key('keyUp');
  await sleep(100);
  const keyDx = Math.round((await page.evaluate(`${SC}.keeper.pos.x`)) - x0);
  // 마우스: 루미 위에서 눌러 오른쪽 아래로 끌었다 놓기 → 끄는 동안 조준 원뿔, 놓으면 그쪽으로 빛
  await page.evaluate(`(() => { const s = ${SC}; ${place} })()`);
  await sleep(300);
  const at = await page.evaluate(`(() => { const s = ${SC}; const cam = s.cameras.main; const r = document.querySelector('canvas').getBoundingClientRect(); const k = r.width / window.__game.scale.gameSize.width;
    return { x: r.left + (s.keeper.pos.x - cam.worldView.x) * cam.zoom * k, y: r.top + (s.keeper.pos.y - cam.worldView.y) * cam.zoom * k }; })()`);
  const cast0 = await page.evaluate('window.__ev.cast');
  const mouse = (type, x, y) => page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
  await mouse('mousePressed', at.x, at.y);
  for (let i = 1; i <= 6; i++) {
    await mouse('mouseMoved', at.x + i * 30, at.y + i * 15);
    await sleep(30);
  }
  await sleep(150);
  const guide = await page.evaluate(`(() => { const g = ${SC}.aimGuide; return { cone: !!g.cone?.visible, range: Math.round(g.drawn.range) }; })()`);
  await mouse('mouseReleased', at.x + 180, at.y + 90);
  await sleep(300);
  const mouseCast = await page.evaluate(`({ casts: window.__ev.cast - ${cast0}, angle: window.__ev.last ? Math.round(window.__ev.last.angle * 180 / Math.PI) : null, range: window.__ev.last ? Math.round(window.__ev.last.range) : null })`);
  record('B2 PC 키보드·마우스', keyDx > 60 && mouseCast.casts === 1, { keyD: `${keyDx}px 오른쪽`, mouse: mouseCast });
  record('B3 끄는 동안 방향·반경 표시', guide.cone && guide.range > 0, guide);
  record('B4 놓으면 발사(끈 방향)', mouseCast.casts === 1 && Math.abs(mouseCast.angle - 27) < 8, `${mouseCast.angle}° (끈 방향 약 27°)`);

  // B5 이동 중 발사
  const moving = await page.evaluate(`(async () => { ${wait} const s = ${SC}; ${place} await wait(450); const c0 = window.__ev.cast;
    window.__bus.emit('input:move', { x: 1, y: 0 }); await wait(200); const xa = s.keeper.pos.x;
    window.__bus.emit('input:fire', { angle: -Math.PI / 2, power: 1 }); await wait(200); const xb = s.keeper.pos.x;
    window.__bus.emit('input:move', { x: 0, y: 0 }); return { casts: window.__ev.cast - c0, keptMoving: Math.round(xb - xa) }; })()`);
  record('B5 이동 중 발사', moving.casts === 1 && moving.keptMoving > 20, moving);

  // B6 반자동: 대상이 없으면 쏘지 않음 (누르고 있기 1.5초 + 짧은 탭)
  const noTarget = await page.evaluate(`(async () => { ${wait} const s = ${SC}; ${place} await wait(500); const c0 = window.__ev.cast;
    window.__bus.emit('input:auto', { active: true }); await wait(1500); window.__bus.emit('input:auto', { active: false });
    window.__bus.emit('input:fire', { angle: null }); await wait(300); return { casts: window.__ev.cast - c0 }; })()`);
  record('B6 반자동 — 대상 없으면 안 쏨', noTarget.casts === 0, noTarget);

  // B7 프레임이 달라도 같은 빠르기·대기 시간: 그대로 vs 30fps로 묶기 (PlayScene MAX_DT = 1/20초: 20fps 아래로 떨어지면 한 프레임에 너무 멀리 가지 않게 일부러 느려짐)
  // 게임의 상한은 '제한 간격 × LIMIT_SLACK'부터 돌린다(src/core/frameLimit.ts, 2026-11-20 120Hz 바로잡기) → 30fps로 묶으려면 간격을 그만큼 늘린다
  const LIMIT_SLACK = 0.6;
  const measure = (limit) =>
    page.evaluate(`(async () => { ${wait} const g = window.__game; const s = ${SC};
      g.loop.fpsLimit = ${limit}; g.loop.hasFpsLimit = ${limit} > 0; g.loop._limitRate = ${limit} > 0 ? 1000 / ${limit} / ${LIMIT_SLACK} : 0; g.loop.sleep(); g.loop.wake(true); await wait(1200);
      let frames = 0; const tick = () => frames++; s.events.on('postupdate', tick); await wait(1000); s.events.off('postupdate', tick);
      ${place} await wait(100); const x0 = s.keeper.pos.x; let gt = 0; const acc = (_t, d) => (gt += d);
      // 게임 시간(프레임 dt 합)으로 나눈다: 벽시계로 재면 20fps의 프레임 경계 때문에 들쭉날쭉
      // 출발 직후(가속·첫 프레임)는 빼고 걷는 중의 빠르기만
      window.__bus.emit('input:move', { x: 1, y: 0 }); await wait(250); const x1 = s.keeper.pos.x; s.events.on('update', acc); await wait(600); s.events.off('update', acc); const x2 = s.keeper.pos.x; window.__bus.emit('input:move', { x: 0, y: 0 });
      const speed = (x2 - x1) / (gt / 1000);
      await wait(500); const c0 = window.__ev.cast; const iv = setInterval(() => window.__bus.emit('input:fire', { angle: 1.2, power: 1 }), 40);
      await wait(2000); clearInterval(iv);
      return { fps: frames, speed: Math.round(speed), casts: window.__ev.cast - c0 }; })()`);
  const f60 = await measure(0);
  const f30 = await measure(30);
  await measure(0);
  record('B7 프레임과 무관', Math.abs(f60.speed - f30.speed) / f60.speed < 0.05 && Math.abs(f60.casts - f30.casts) <= 1 && f30.fps < 40, { normal: f60, limited30: f30 });

  // C1 일반 피격: HP만 줄고 LP는 그대로
  const hurt = await page.evaluate(`(() => { const s = ${SC}; s.vitals.invulnLeft = 0; const hp0 = s.vitals.hp, lp0 = s.lp.value;
    s.applyHit({ x: s.keeper.pos.x - 30, y: s.keeper.pos.y, def: { id: 'frog', behaviorParams: {} } }, { target: 'player', damage: 12, sourceDamage: 0 });
    return { hp: [hp0, s.vitals.hp], lp: [Math.round(lp0), Math.round(s.lp.value)] }; })()`);
  record('C1 피격 = HP만 줄고 LP 그대로', hurt.hp[1] < hurt.hp[0] && hurt.lp[0] === hurt.lp[1], hurt);

  // C3 하트가 남아 있으면 중앙 광원 곁에서 다시 일어남
  const down = await page.evaluate(`(async () => { ${wait} const s = ${SC}; ${place} s.vitals.invulnLeft = 0; const h0 = s.vitals.hearts;
    s.applyHit({ x: s.keeper.pos.x - 30, y: s.keeper.pos.y, def: { id: 'frog', behaviorParams: {} } }, { target: 'player', damage: 999, sourceDamage: 0 });
    await wait(2200); const c = s.sources.central.pos;
    return { hearts: [h0, s.vitals.hearts], hp: s.vitals.hp, toCentral: Math.round(Math.hypot(s.keeper.pos.x - c.x, s.keeper.pos.y - c.y)) }; })()`);
  record('C3 하트 남으면 중앙 곁에서 다시', down.hearts[1] === down.hearts[0] - 1 && down.toCentral < 260 && down.hp > 0, down);

  // E5 패시브를 맞혀도 점수·아이템 이득 없음
  const passive = await page.evaluate(`(async () => { ${wait} const s = ${SC}; ${place} await wait(900);
    window.__allowSpawn = true; const owl = s.field.spawnAt('owl', s.keeper.pos.x + 110, s.keeper.pos.y + 10); window.__allowSpawn = false; if (owl) owl.__keep = true; await wait(100);
    const score0 = s.score.total, items0 = s.items.ground.length, slots0 = JSON.stringify(s.items.inventory.slots); const r0 = window.__ev.returned.length; const gains = []; const off = window.__bus.on('score:change', (e) => gains.push(e.gained));
    window.__bus.emit('input:fire', { angle: 0, power: 1 }); await wait(900);
    off(); return { score: [score0, s.score.total], gains, returned: window.__ev.returned.slice(r0), ground: [items0, s.items.ground.length], slotsSame: JSON.stringify(s.items.inventory.slots) === slots0, owlUpset: owl ? !!(owl.upset || owl.angry || owl.mood === 'angry') : null }; })()`);
  record('E5 패시브를 맞혀도 이득 없음', passive.score[0] === passive.score[1] && passive.ground[1] <= passive.ground[0] && passive.slotsSame, passive);

  const errs = errorsOf(page);
  record('판 점검 중 콘솔 오류', errs.length === 0, errs.length ? errs.slice(0, 5) : '0');
  page.close();
}

// ── F: 한 판 끝까지 (밤 1 A1 · 밤 10 노월 — 토리·도토가 함께라 반드시 나옴, 동시에)
if (!skipLong) {
  const run = async (stage) => {
    const page = await openPage({ width: 960, height: 540, scale: 1 });
    await page.navigate(`${BASE}?autoplay=160&${stage}&lamp&skill=1`);
    await sleep(3500);
    await page.evaluate(`(async () => { const { bus } = await import('/src/core/events.ts'); window.__end = null; window.__kinds = [];
      bus.on('enemy:returned', (e) => window.__kinds.push(e.kind));
      bus.on('game:clear', (e) => (window.__end = e.result)); bus.on('game:over', (e) => (window.__end = e.result));
      // 노월 판(밤 10)은 실제 런처럼 ★9로 시작(&level=9 — 2026-11-24 다듬기 2차로 레벨이 느려져 ★1 시작이면 100초에 걸림), 중앙 광원·루미를 지켜 둔다 — 이 판은 '노월을 진정시키면 아침' 규칙만 본다
      if (${JSON.stringify(stage)}.includes('friends')) setInterval(() => { const s = window.__game.scene.getScene('Play'); if (s?.sources) { s.sources.central.state.hp = s.sources.central.state.maxHp; s.vitals.invulnLeft = 9; }
        // 2026-11-24: 자동 플레이가 노월을 겨누는 정도가 판마다 달라 100초에 걸리기도 함 → 노월이 나오면 게임의 맞히기 처리(Hits.boss)로 0.3초마다 빛을 맞힘 — '진정하면 아침' 규칙만 본다
        if (s?.boss?.active && !s.boss.entering) s.hits.boss(900000); }, 300); })()`);
    const t0 = Date.now();
    let end = null;
    while (Date.now() - t0 < 150000 && !(end = await page.evaluate('window.__end'))) await sleep(2000);
    await sleep(2500);
    // 결과 화면에는 런 요약·한 밤 두 묶음이 있어 보이는 것만 읽는다
    const sheet = await page.evaluate(`(() => { const shown = (e) => !!e && e.closest('[hidden]') === null && e.getBoundingClientRect().width > 0; const q = (s) => [...document.querySelectorAll(s)].find(shown)?.textContent?.trim() ?? null;
      const rows = [...document.querySelectorAll('.result__row')].filter(shown).map((r) => [r.querySelector('dt')?.textContent, r.querySelector('dd')?.textContent]);
      return { score: q('.result__score'), rows }; })()`);
    const kinds = await page.evaluate('window.__kinds');
    const errs = errorsOf(page);
    page.close();
    return { stage, end, sheet, kinds, errs };
  };
  const [s1, s4] = await Promise.all([run(NIGHT1), run('night=10&friends&seed=7&level=9')]);
  const e1 = s1.end;
  record('F1 타이머대로 끝남(100초)', !!e1 && e1.reason === 'time' && Math.abs(e1.survivedSec - 100) < 1, e1 ? { reason: e1.reason, sec: e1.survivedSec, outcome: e1.outcome } : '끝나지 않음');
  record('F5 노월 진정 = 아침', !!s4.end && s4.end.reason === 'boss' && s4.end.bossCalmed, s4.end ? { reason: s4.end.reason, calmed: s4.end.bossCalmed, sec: s4.end.survivedSec } : '끝나지 않음');
  const fmt = (n) => Math.round(n).toLocaleString('ko-KR');
  const rowOf = (name) => s1.sheet.rows.find((r) => r[0] === name)?.[1];
  const sheetOk = !!e1 && s1.sheet.score === fmt(e1.score) && rowOf('최대 콤보') === `×${e1.maxCombo}` && (e1.mercy > 0 ? rowOf('자비') === `${e1.mercy}번` : true);
  record('F6 결과 화면 = 실제 점수·콤보·자비', sheetOk, { result: e1 && { score: e1.score, maxCombo: e1.maxCombo, mercy: e1.mercy }, sheet: s1.sheet });
  const lost = s1.kinds.filter((k) => k === 'lost').length;
  const hostile = s1.kinds.filter((k) => k === 'hostile').length;
  record('E1·E2 구출(잃어버린 주민)·돌려보냄(호스틸)', lost > 0 && hostile > 0, { rescued: lost, retreated: hostile });
  record('F 판 중 콘솔 오류', s1.errs.length + s4.errs.length === 0, [...s1.errs, ...s4.errs].slice(0, 5));
}

// ── I: 런 (2026-11-23 밤 나들이 v3, NIGHT_RUN.md) — 두 길 제목·별가루 잔액·준비물 효력·빛 레벨 리셋은 단위 테스트(nightRun·growth·shop·stardust)
{
  const waitFor = async (page, expr, ms = 20000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (await page.evaluate(expr)) return true;
      await sleep(200);
    }
    return false;
  };
  const text = (page, sel) => page.evaluate(`(document.querySelector(${JSON.stringify(sel)})?.textContent ?? '').trim()`);
  const shown = (page, sel) => page.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && !e.closest('[hidden]') && e.getBoundingClientRect().width > 0; })()`);
  const click = (page, sel) => page.evaluate(`(document.querySelector(${JSON.stringify(sel)})?.click(), 1)`);

  // I1~I4 흐름: 밤 2(빛의 마을 끝) → 아침(새 지역 경계의 숲·저장 밤 3·하트 이어짐) → 새로고침 → 이어서 하기 (밤 3) → 밤 3 → 아침 → 집으로 → 결과 → 저장 지움
  const flow = await (async () => {
    const page = await openPage({ width: 960, height: 540, scale: 1 });
    const r = {};
    try {
      await page.navigate(`${BASE}?screen=home`);
      await sleep(800);
      await page.evaluate(`localStorage.clear(); localStorage.setItem('ld.progress.v2', JSON.stringify({ tutorialDone: true })); 1`);
      // 밤 2 정식 런을 아침 직전으로 (&preview=dawn — 서서 버팀)
      await page.navigate(`${BASE}?autoplay=9999&night=2&seed=7&idle&preview=dawn`);
      r.morning1 = await waitFor(page, `document.documentElement.dataset.screen === 'morning'`, 40000);
      await sleep(700);
      r.title1 = await text(page, '#morning-title');
      r.region = (await shown(page, '.morning__region')) ? await text(page, '.morning__region-title') : null;
      const save = await page.evaluate(`JSON.parse(localStorage.getItem('ld.run.v1') || 'null')`);
      r.saveNight = save?.night ?? null;
      r.saveHearts = save?.hearts ?? null;
      await page.navigate(BASE);
      await waitFor(page, `document.documentElement.dataset.screen === 'home'`);
      await sleep(1500);
      r.cont = (await shown(page, '.home__continue')) ? await text(page, '.home__continue') : null;
      await click(page, '.home__continue');
      r.night3 = await waitFor(page, `document.documentElement.dataset.screen === 'play'`, 10000);
      await sleep(1200);
      r.hud3 = await text(page, '.night-clock__label');
      r.hearts3 = await page.evaluate(`window.__game.scene.getScene('Play')?.vitals?.hearts ?? null`);
      // 밤 3을 아침으로: 시계를 끝 가까이 (루미는 무적)
      await page.evaluate(`(() => { const s = window.__game.scene.getScene('Play'); s.vitals.invulnLeft = 9999; s.clock.t = s.stageDef.durationSec - 1; return 1; })()`);
      r.morning2 = await waitFor(page, `document.documentElement.dataset.screen === 'morning'`, 15000);
      await sleep(600);
      // 구조 보강(2026-11-24): 아침 '지금 길' 한 줄 · 다음 밤 미리 보기 · 집으로 귀가 보너스
      r.pathNow = await text(page, '.morning__path-now');
      r.preview = await page.evaluate(`(document.querySelector('.morning__preview')?.textContent ?? '').trim()`);
      r.homeBtn = await text(page, '.morning__home');
      r.dustBefore = await page.evaluate(`JSON.parse(localStorage.getItem('ld.progress.v2') || '{}').dust ?? 0`);
      await click(page, '.morning__home');
      await sleep(900);
      r.result = await text(page, '#result-title');
      r.homeLine = await page.evaluate(`(document.querySelector('.result__home')?.textContent ?? '').trim()`);
      r.dustAfter = await page.evaluate(`JSON.parse(localStorage.getItem('ld.progress.v2') || '{}').dust ?? 0`);
      r.saveCleared = (await page.evaluate(`localStorage.getItem('ld.run.v1')`)) === null;
      r.errs = errorsOf(page).slice(0, 3);
    } finally {
      page.close();
    }
    return r;
  })();
  record('I1 아침 화면 흐름(밤 → 아침 → 다음 밤 → 집으로 → 결과)', flow.morning1 && flow.title1 === '밤 2가 밝았어요' && flow.night3 && flow.hud3 === '밤 3' && flow.morning2 && flow.result === '오늘 밤들은 여기까지', flow);
  record('I2 하트가 밤 사이에 이어짐', flow.saveHearts !== null && flow.hearts3 === flow.saveHearts, { saved: flow.saveHearts, night3: flow.hearts3 });
  record('I3 저장·이어서 하기 (런이 끝나면 지움)', flow.saveNight === 3 && flow.cont === '이어서 하기 (밤 3)' && flow.saveCleared, { saveNight: flow.saveNight, cont: flow.cont, cleared: flow.saveCleared });
  record('I4 새 지역(구간에 처음 닿는 아침)', flow.region === '경계의 숲을 발견했어요', flow.region);
  {
    const m = /^무사히 돌아왔어요 · 별가루 \+(\d+)$/.exec(flow.homeLine ?? '');
    record('I12 집으로 = 별가루 +20%(올림·최소 1)·버튼 문구·결과 한 줄(2026-11-24 구조 보강 ①)', !!m && flow.homeBtn === '집으로 (별가루 +20%)' && flow.dustAfter - flow.dustBefore === Number(m?.[1]) && Number(m?.[1]) >= 1, { homeBtn: flow.homeBtn, homeLine: flow.homeLine, dust: [flow.dustBefore, flow.dustAfter] });
    record('I14 아침 다음 밤 미리 보기(2026-11-24 구조 보강 ①)', /^다음 밤: .+ · 등불 \d+ · (적이 조금 더 거세요|오늘과 비슷해요)$/.test(flow.preview ?? ''), flow.preview);
  }
  record('I13 아침 \'지금 길\' 한 줄(2026-11-24 구조 보강 ②)', /^지금 길: (지키는 길 — 조용한 밤|넓히는 길 — 어둠이 거세져요|사이 — 아직 정하지 않았어요)$/.test(flow.pathNow ?? ''), flow.pathNow);

  // I5·I6 행렬: 밤 2, 28초에 등장 — 피해 0, 세 번 맞히면 돌려보냄(150×)
  const parade = await (async () => {
    const page = await openPage({ width: 960, height: 540, scale: 1 });
    const S = SC;
    const ev = (js) => page.evaluate(`(() => { const s = ${S}; ${js} })()`);
    const r = {};
    try {
      await page.navigate(`${BASE}?autoplay=9999&night=2&map=A1&seed=7&idle`);
      await waitFor(page, `!!${S}?.clock`, 25000);
      await sleep(1200);
      await ev(`window.__hurtBy = []; const orig = s.applyHit.bind(s); s.applyHit = (e, hit) => { if (hit.target === 'player') window.__hurtBy.push(e.def.kind); orig(e, hit); }; s.vitals.invulnLeft = 9999; s.clock.t = 26; return 1;`);
      r.appeared = await waitFor(page, `${S}.field.enemies.some((e) => e.def.kind === 'passive')`, 8000);
      await sleep(1500);
      const before = await ev('return s.score.total;');
      for (let k = 0; k < 3; k++) {
        await ev(`const t = s.field.enemies.find((e) => e.def.kind === 'passive' && e.targetable && !e.leaving && (window.__t === undefined || e.uid === window.__t)); if (!t) return 0; window.__t = t.uid;
          s.keeper.pos.x = t.x - 120; s.keeper.pos.y = t.y; s.keeper.moveTo(t.x - 120, t.y, { x: 0, y: 0 }, 0); s.light.cooldownLeft = 0; s.fire(0, 200); return 1;`);
        await sleep(700);
      }
      r.banish = await ev('return s.rules.banishCount;');
      r.gained = (await ev('return s.score.total;')) - before;
      // 패시브 곁에 10초 서 있기(피해가 있는지)
      await ev(`const t = s.field.enemies.find((e) => e.def.kind === 'passive' && e.targetable); if (t) { s.keeper.pos.x = t.x; s.keeper.pos.y = t.y + 40; } return 1;`);
      await sleep(4000);
      r.hurtBy = await page.evaluate('window.__hurtBy');
      r.errs = errorsOf(page).slice(0, 3);
    } finally {
      page.close();
    }
    return r;
  })();
  record('I5 행렬이 준 피해 0', parade.appeared && !parade.hurtBy.includes('passive'), { appeared: parade.appeared, hurtBy: parade.hurtBy });
  record('I6 세 번 맞히면 돌려보냄(150 × 배율)', parade.banish >= 1 && parade.gained >= 150 * parade.banish, { banish: parade.banish, gained: parade.gained });

  // I7 맵 3장 검사 (npm run check:maps)
  const mc = spawnSync(process.execPath, ['scripts/map-check.mjs'], { encoding: 'utf8' });
  record('I7 격자 맵 검사 통과', mc.status === 0, (mc.stdout + mc.stderr).trim().split('\n').slice(-4).join(' / '));

  // I8 빛 차단 (B1: 집 너머 막힘 · 풀숲 너머·광장은 안 막힘)
  {
    const page = await openPage({ width: 960, height: 540, scale: 1 });
    await page.navigate(`${BASE}?autoplay=9999&night=4&map=B1&seed=5&idle`);
    await waitFor(page, `!!${SC}?.grid`, 25000);
    const blk = await page.evaluate(`(() => { const g = ${SC}.grid; return { house: g.blocked({ x: 2500, y: 912 }, { x: 2950, y: 912 }), bush: g.blocked({ x: 2300, y: 1680 }, { x: 2600, y: 1680 }), plaza: g.blocked({ x: 1600, y: 1030 }, { x: 1600, y: 700 }) }; })()`);
    record('I8 빛 차단(집 너머 막힘 · 풀숲 너머 맞음)', blk.house && !blk.bush && !blk.plaza, blk);
    page.close();
  }

  // I9 구출 천장(밤 3 토리) · I10 노월 두 모습 — 빨리 감기 자동 런
  const rescue = await (async () => {
    const page = await openPage({ width: 960, height: 540, scale: 1 });
    const r = {};
    try {
      await page.navigate(`${BASE}?autoplay=run&night=3&seed=5&skill=1&speed=4&cap=3`);
      await waitFor(page, `!!${SC}?.clock`, 25000);
      r.seenAt = null;
      const end = Date.now() + 40000;
      while (Date.now() < end && r.seenAt === null) {
        r.seenAt = await page.evaluate(`(() => { const s = ${SC}; return s?.field?.enemies?.some((e) => e.def.friend) ? Math.round(s.clock.t) : null; })()`);
        await sleep(150);
      }
      await waitFor(page, 'window.__runLog?.done === true', 90000);
      r.night = await page.evaluate('window.__runLog?.nights?.[0] ?? null');
    } finally {
      page.close();
    }
    return r;
  })();
  record('I9 구출 천장(밤 3에 토리가 진행 30%에 나오고 되찾음)', rescue.seenAt !== null && Math.abs(rescue.seenAt - 30) <= 3 && !!rescue.night?.friends?.includes('tori'), { seenAt: rescue.seenAt, friends: rescue.night?.friends, outcome: rescue.night?.outcome });
  const forms = await Promise.all(
    [
      ['banish=3', 'angry', 250],
      ['mercy=3', 'calm', 150],
    ].map(async ([q, form, hp]) => {
      const page = await openPage({ width: 960, height: 540, scale: 1 });
      try {
        await page.navigate(`${BASE}?autoplay=9999&night=10&friends&${q}&seed=11&idle`);
        await waitFor(page, `${SC}?.boss?.active === true`, 30000);
        await sleep(1500);
        const got = await page.evaluate(`(() => { const b = ${SC}.boss; const bar = document.querySelector('.boss-bar'); return { form: b.form, hp: b.maxHp, tex: b.sprite?.list[1]?.texture?.key, bar: bar?.dataset.form }; })()`);
        return { want: form, ok: got.form === form && got.hp === hp && got.bar === form && got.tex === (form === 'angry' ? 'witch-angry' : 'witch'), ...got };
      } finally {
        page.close();
      }
    }),
  );
  record('I10 노월 두 모습(넓히는 길 = 분노한 노월)', forms.every((f) => f.ok), forms);
  // I11 하트로 광원 되살리기 (2026-11-24 다듬기 1차): 광원 0 + 하트 2개 이상 → 하트 −1·HP 40%·토스트, 같은 밤 두 번째 → 끝(central)
  const revive = await (async () => {
    const page = await openPage({ width: 960, height: 540, scale: 1 });
    try {
      await page.navigate(`${BASE}?autoplay=9999&night=4&map=A1&seed=5&idle`);
      await waitFor(page, `!!${SC}?.sources`, 25000);
      await sleep(1500);
      await page.evaluate(`(async () => { const { bus } = await import('/src/core/events.ts'); window.__rv = { revived: [], over: null, toasts: [] };
        bus.on('central:revived', (e) => window.__rv.revived.push(e.hearts)); bus.on('game:over', (e) => (window.__rv.over = e.result.reason));
        new MutationObserver(() => { const t = document.querySelector('.toast')?.textContent?.trim(); if (t && !window.__rv.toasts.includes(t)) window.__rv.toasts.push(t); }).observe(document.body, { subtree: true, childList: true, characterData: true }); })()`);
      const h0 = await page.evaluate(`${SC}.vitals.hearts`);
      await page.evaluate(`${SC}.sources.damage('central', 999, 'bat', false), 1`);
      await sleep(700);
      const first = await page.evaluate(`(() => { const s = ${SC}; const c = s.sources.central.state; return { hp: Math.round(c.hp), out: c.out, hearts: s.vitals.hearts, revived: window.__rv.revived.length, toast: window.__rv.toasts.some((t) => t.includes('하트 하나로 광원을 다시 밝혔어요')) }; })()`);
      await sleep(2800); // 무적 2.5초가 지나고
      await page.evaluate(`${SC}.sources.damage('central', 999, 'bat', false), 1`);
      // 오늘은 여기까지 연출(OVER_SEC 1.5초) 뒤에 game:over — 넉넉히 기다림
      await waitFor(page, 'window.__rv?.over != null', 6000);
      const second = await page.evaluate(`({ over: window.__rv.over, revived: window.__rv.revived.length })`);
      return { h0, first, second, errs: errorsOf(page) };
    } finally {
      page.close();
    }
  })();
  record(
    'I11 하트로 광원 되살리기(하트 2개 이상 → 한 번, 같은 밤 두 번째 → 끝)',
    revive.first.hp === 40 && !revive.first.out && revive.first.hearts === revive.h0 - 1 && revive.first.revived === 1 && revive.first.toast && revive.second.over === 'central' && revive.second.revived === 1 && revive.errs.length === 0,
    revive,
  );
  // I15 적 빛 게이지 · I16 위험 링 (2026-11-24 15:03 기획 세션, 라이언 확정): 게임의 맞히기 처리로 빛을 맞혀 봄
  const gauge = await (async () => {
    const page = await openPage({ width: 960, height: 540, scale: 1 });
    try {
      await page.navigate(`${BASE}?autoplay=9999&night=3&map=A1&seed=11&idle`);
      await waitFor(page, `!!${SC}?.field && !!${SC}.vitals`, 25000);
      await sleep(1500);
      const prep = `(() => { const s = ${SC}; for (const e of [...s.field.active]) e.destroy(); s.field.prune(); s.vitals.invulnLeft = 9999; window.__g = {}; const k = s.keeper.pos;
        for (const [id, dx, dy] of [['werewolf', 150, 0], ['tori-lost', -150, 0], ['owl', 0, 150], ['bat', 0, -150]]) window.__g[id] = s.field.spawnAt(id, k.x + dx, k.y + dy); return 1; })()`;
      await page.evaluate(prep);
      await sleep(300);
      await page.evaluate(`(() => { const s = ${SC}; for (const id of ['werewolf', 'tori-lost', 'owl', 'bat']) s.hits.enemy(window.__g[id]); return 1; })()`);
      await sleep(300);
      const look = (id) => `(() => { const e = window.__g['${id}']; const g = e.gauge; return { hp: e.hp, max: e.def.hp, has: !!g, visible: !!g && g.visible, fill: g ? +g.shownFill.toFixed(3) : null, belowFeet: !!g && g.bg.y > e.y }; })()`;
      const shown = {};
      for (const id of ['werewolf', 'tori-lost', 'owl', 'bat']) shown[id] = await page.evaluate(look(id));
      await sleep(1500);
      const gone = await page.evaluate(`!!window.__g.werewolf.gauge?.visible`);
      // 위험 링: 하트 1 + HP 40% → 켜짐, HP 60% → 꺼짐, 다시 40% + 무적 → 꺼짐
      await page.evaluate(`(() => { const v = ${SC}.vitals; v.invulnLeft = 0; v.hearts = 1; v.hp = v.maxHp * 0.4; return 1; })()`);
      await sleep(800);
      const ringOn = await page.evaluate(`${SC}.dangerRing.shown`);
      await page.evaluate(`(() => { const v = ${SC}.vitals; v.hp = v.maxHp * 0.6; return 1; })()`);
      await sleep(500);
      const ringAbove = await page.evaluate(`${SC}.dangerRing.shown`);
      await page.evaluate(`(() => { const v = ${SC}.vitals; v.hp = v.maxHp * 0.4; v.invulnLeft = 2; return 1; })()`);
      await sleep(500);
      const ringInvuln = await page.evaluate(`${SC}.dangerRing.shown`);
      return { shown, gone, ring: { on: ringOn, above50: ringAbove, invuln: ringInvuln }, errs: errorsOf(page) };
    } finally {
      page.close();
    }
  })();
  {
    const w = gauge.shown.werewolf, t = gauge.shown['tori-lost'], o = gauge.shown.owl, b = gauge.shown.bat;
    record(
      'I15 적 빛 게이지(호스틸·잃어버린 주민만 · HP가 남을 때 발밑에 1 − HP/max로 차오름 · 1.5초 안에 사라짐 · 패시브·HP 0은 없음)',
      w.visible && w.belowFeet && Math.abs(w.fill - (1 - w.hp / w.max)) < 1e-3 && t.visible && t.fill > 0 && !o.has && !b.visible && b.hp <= 0 && !gauge.gone && gauge.errs.length === 0,
      gauge.shown,
    );
    record('I16 마지막 하트 위험 링(하트 1 + HP ≤ 50%에서만 · 무적 중 끔)', gauge.ring.on && !gauge.ring.above50 && !gauge.ring.invuln && gauge.errs.length === 0, gauge.ring);
  }
  // I17 꾸미기 탭 6칸 · I18 달·씨앗 잠김 → 친구를 되찾으면 열림 (2026-11-24 15:58 상점 채우기)
  const decor = await (async () => {
    const read = async (friends) => {
      const page = await openPage({ width: 390, height: 844, scale: 1, phone: true });
      try {
        await page.navigate(`${BASE}?screen=home`);
        await sleep(1200);
        await page.evaluate(`localStorage.clear(); localStorage.setItem('ld.progress.v2', JSON.stringify({ tutorialDone: true, dust: 50, friends: ${JSON.stringify(friends)} })); 1`);
        await page.navigate(`${BASE}?screen=shop`);
        await sleep(2200);
        await page.evaluate(`([...document.querySelectorAll('.screen--shop .tab')].find((b) => b.textContent.trim() === '꾸미기')?.click(), 1)`);
        await sleep(400);
        const out = await page.evaluate(`({ tabs: [...document.querySelectorAll('.screen--shop .tab')].map((b) => b.textContent.trim()), groups: [...document.querySelectorAll('.shop__group-title')].map((e) => e.textContent.trim()), cards: [...document.querySelectorAll('.shop-card--decor')].map((c) => [c.querySelector('strong').textContent, c.querySelector('.shop-card__tag').textContent.replace(/\\s+/g, ' ').trim()]) })`);
        return { ...out, errs: errorsOf(page) };
      } finally {
        page.close();
      }
    };
    return { none: await read([]), tori: await read(['tori']) };
  })();
  {
    const tag = (r, name) => r.cards.find((c) => c[0] === name)?.[1];
    record(
      'I17 꾸미기 탭 6칸(빛 모양 3 · 걸음 빛 3, 첫 칸 기본 쓰는 중) — 옛 스킨 탭',
      decor.none.tabs.join('/') === '빛 색/꾸미기' && decor.none.groups.join('/') === '빛 모양/걸음 빛' && decor.none.cards.map((c) => c[0]).join('/') === '별/달/씨앗/없음/반딧불 가루/별가루 흔적' && tag(decor.none, '별') === '쓰는 중' && tag(decor.none, '없음') === '쓰는 중' && decor.none.errs.length === 0,
      decor.none,
    );
    record(
      'I18 달·씨앗 잠김("토리와 함께한 뒤") → 토리를 되찾으면 달만 "사기 ✦20"',
      tag(decor.none, '달') === '토리와 함께한 뒤' && tag(decor.none, '씨앗') === '도토와 함께한 뒤' && /^사기 ?20$/.test(tag(decor.tori, '달') ?? '') && tag(decor.tori, '씨앗') === '도토와 함께한 뒤' && decor.tori.errs.length === 0,
      { none: decor.none.cards.slice(0, 3), tori: decor.tori.cards.slice(0, 3) },
    );
  }
  record('I 런 점검 중 콘솔 오류', flow.errs.length + parade.errs.length === 0, [...flow.errs, ...parade.errs]);
}

// ── H4 배포 주소: 열고 → 새로고침해도 정상
{
  const page = await openPage({ width: 960, height: 540, scale: 1 });
  await page.navigate(LIVE);
  await sleep(5000);
  const first = await page.evaluate(`({ canvas: !!document.querySelector('canvas'), ui: !!document.querySelector('.stage__ui'), title: document.title })`);
  await page.send('Page.reload', { ignoreCache: true });
  await sleep(5000);
  const again = await page.evaluate(`({ canvas: !!document.querySelector('canvas'), ui: !!document.querySelector('.stage__ui'), screen: document.querySelector('.stage__ui')?.dataset.screen ?? null })`);
  const errs = errorsOf(page);
  record('H4 배포 주소 새로고침', first.canvas && again.canvas && again.ui && errs.length === 0, { first, again, errs: errs.slice(0, 3) });
  page.close();
}

// ── H5 휴대폰 흉내(터치·세로)로 판 15초
{
  const page = await openPage({ width: 390, height: 844, scale: 2, phone: true });
  await page.navigate(`${BASE}?autoplay=15&night=1&seed=7`);
  await sleep(15000);
  const st = await page.evaluate(`({ layout: document.documentElement.dataset.layout, sticks: !!document.querySelector('.sticks, .stick'), screen: document.querySelector('.stage__ui')?.dataset.screen ?? null })`);
  const errs = errorsOf(page);
  record('H5 휴대폰 흉내 판(크롬 엔진)', st.layout === 'portrait' && errs.length === 0, { ...st, errs: errs.slice(0, 3) });
  page.close();
}

const pass = results.filter((r) => r.ok).length;
console.log(`\n${pass}/${results.length} 통과`);
if (out) writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
process.exit(pass === results.length ? 0 : 1);
