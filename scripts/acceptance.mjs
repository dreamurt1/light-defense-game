// 완료 기준(docs/design/ACCEPTANCE_CRITERIA.md) 헤드리스 점검 (2026-11-19). 창 없는 크롬으로 실제 게임을 돌려 확인한다.
// 단위 테스트(npx vitest run)로 확인하는 항목은 여기서 다시 하지 않는다 — 문서의 각 항목 옆에 근거를 적어 둔다.
// dev 서버(npm run dev, 5173)가 켜져 있어야 한다.
//
// 사용: node scripts/acceptance.mjs [--skip-long] [--out <결과 json>]
//   --skip-long: 한 판 끝까지(약 2분) 도는 F 항목을 건너뛴다.
import { writeFileSync } from 'node:fs';
import { openPage, sleep } from './lib/chrome.mjs';

const BASE = 'http://localhost:5173/';
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
/** 장애물에서 200 넘게 떨어진 트인 자리(map.json 기준) — 이동 점검용 */
const SPOT = { x: 1520, y: 1330 };
const place = `s.keeper.pos.x = ${SPOT.x}; s.keeper.pos.y = ${SPOT.y};`;
const wait = 'const wait = (ms) => new Promise((r) => setTimeout(r, ms));';

/** 판 하나 (자동 조작 없이 서 있음) + 이벤트 기록 */
async function playPage(stage = 'stage-1', opts = {}) {
  const page = await openPage({ width: 960, height: 540, scale: 1, ...opts });
  await page.navigate(`${BASE}?autoplay=300&stage=${stage}&idle`);
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

// ── A2 콘솔 오류: 메뉴 화면 넷 + 2스테이지 20초 (동시에)
{
  const qs = ['?screen=home', '?screen=select', '?screen=shop', '?screen=ranking', '?autoplay=20&stage=stage-2'];
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
  record('A2 콘솔 오류', errs.length === 0, errs.length ? errs.slice(0, 5) : '홈·선택·상점·지난 밤들·2스테이지 20초 — 오류 0');
}

// ── A4 가로·세로 화면에서 버튼이 잘리지 않음: 라이언 지정 4종 × 화면 다섯(홈·선택·상점·지난 밤들·판 HUD)
{
  const sizes = [
    ['PC 풀 화면', 1920, 1080, false, 'landscape'],
    ['PC 세로', 1920, 1080, false, 'portrait'],
    ['모바일 세로', 390, 844, true, 'landscape'],
    ['모바일 가로', 844, 390, true, 'landscape'],
  ];
  const screens = ['?screen=home', '?screen=select', '?screen=shop', '?screen=ranking', '?autoplay=300&stage=stage-1&idle'];
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
  const page = await playPage('stage-1');
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
  const measure = (limit) =>
    page.evaluate(`(async () => { ${wait} const g = window.__game; const s = ${SC};
      g.loop.fpsLimit = ${limit}; g.loop.hasFpsLimit = ${limit} > 0; g.loop._limitRate = ${limit} > 0 ? 1000 / ${limit} : 0; g.loop.sleep(); g.loop.wake(true); await wait(1200);
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

// ── F: 한 판 끝까지 (1스테이지 · 4스테이지 노월, 동시에)
if (!skipLong) {
  const run = async (stage) => {
    const page = await openPage({ width: 960, height: 540, scale: 1 });
    await page.navigate(`${BASE}?autoplay=160&stage=${stage}&lamp&skill=1`);
    await sleep(3500);
    await page.evaluate(`(async () => { const { bus } = await import('/src/core/events.ts'); window.__end = null; window.__kinds = [];
      bus.on('enemy:returned', (e) => window.__kinds.push(e.kind));
      bus.on('game:clear', (e) => (window.__end = e.result)); bus.on('game:over', (e) => (window.__end = e.result)); })()`);
    const t0 = Date.now();
    let end = null;
    while (Date.now() - t0 < 150000 && !(end = await page.evaluate('window.__end'))) await sleep(2000);
    await sleep(2500);
    const sheet = await page.evaluate(`(() => { const q = (s) => document.querySelector(s)?.textContent?.trim() ?? null;
      const rows = [...document.querySelectorAll('.result__row')].filter((r) => !r.hidden).map((r) => [r.querySelector('dt')?.textContent, r.querySelector('dd')?.textContent]);
      return { score: q('.result__score'), rows }; })()`);
    const kinds = await page.evaluate('window.__kinds');
    const errs = errorsOf(page);
    page.close();
    return { stage, end, sheet, kinds, errs };
  };
  const [s1, s4] = await Promise.all([run('stage-1'), run('stage-4')]);
  const e1 = s1.end;
  record('F1 타이머대로 끝남(100초)', !!e1 && e1.reason === 'time' && Math.abs(e1.survivedSec - 100) < 1, e1 ? { reason: e1.reason, sec: e1.survivedSec, outcome: e1.outcome } : '끝나지 않음');
  record('F5 보스 스테이지 규칙(노월 진정 = 아침)', !!s4.end && s4.end.reason === 'boss' && s4.end.bossCalmed, s4.end ? { reason: s4.end.reason, calmed: s4.end.bossCalmed, sec: s4.end.survivedSec } : '끝나지 않음');
  const fmt = (n) => Math.round(n).toLocaleString('ko-KR');
  const rowOf = (name) => s1.sheet.rows.find((r) => r[0] === name)?.[1];
  const sheetOk = !!e1 && s1.sheet.score === fmt(e1.score) && rowOf('최대 콤보') === `×${e1.maxCombo}` && (e1.mercy > 0 ? rowOf('자비') === `${e1.mercy}번` : true);
  record('F6 결과 화면 = 실제 점수·콤보·자비', sheetOk, { result: e1 && { score: e1.score, maxCombo: e1.maxCombo, mercy: e1.mercy }, sheet: s1.sheet });
  const lost = s1.kinds.filter((k) => k === 'lost').length;
  const hostile = s1.kinds.filter((k) => k === 'hostile').length;
  record('E1·E2 구출(잃어버린 주민)·돌려보냄(호스틸)', lost > 0 && hostile > 0, { rescued: lost, retreated: hostile });
  record('F 판 중 콘솔 오류', s1.errs.length + s4.errs.length === 0, [...s1.errs, ...s4.errs].slice(0, 5));
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
  await page.navigate(`${BASE}?autoplay=15&stage=stage-1`);
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
