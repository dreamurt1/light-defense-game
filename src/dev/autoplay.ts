// 개발 전용: 헤드리스 스크린샷으로 화면을 확인하기 위한 자동 플레이. 빌드에는 들어가지 않는다(main.ts에서 DEV일 때만 불러옴).
//   ?autoplay=20        20초 동안 가장 가까운 적에게 빛을 보내다가(빛 스틱을 놓는 것과 같은 input:fire), 빛이 퍼지는 순간 화면을 멈춘다.
//                       꺼진 등불이 사거리 안이면 먼저 켠다(2026-11-12 새 기획)
//   ?autoplay=20&walk   위와 같되 루미가 천천히 원을 그리며 걷는다(이동·카메라 따라가기 확인)
//   ?autoplay=20&lamp   루미가 가장 가까운 꺼진 등불 쪽으로 걸어가 켜고, 다 켜면 중앙 광원 곁으로 돌아와 지킨다
//   ?autoplay=20&aim    멈출 때 빛 스틱으로 겨누고 있는 모습(조준 부채꼴)을 띄운다
//   ?autoplay=20&idle   탭하지 않고 버티다가(게임 오버 화면 확인용) 결과 시트가 뜨면 멈춘다
//   ?autoplay=20&pause  20초에 일시정지 시트를 열고 멈춘다
//   ?autoplay=5&burst   5초 이후 처음 터지는 콤보 단계 연출(콤보 ×N) 한가운데서 멈춘다
//   &skill=0.3          밸런스 측정용 사람 실력 흉내(2026-11-13): 1 = 지금처럼 0.45초마다 정확히, 낮을수록 드물게·빗나가게 쏜다
//   ?autoplay=run       밸런스 측정용 자동 런(2026-11-23): 꺼진 등불 → 빛을 잃은 친구 → 중앙 광원 곁 순으로 움직이며 쏘고,
//                       아침마다 자동으로 다음 밤(상한 &cap=15), 결과는 window.__runLog (dev/runBot.ts)
//   &speed=4            빨리 감기(한 화면에 판을 4번 진행) · &friends = 토리·도토가 이미 함께(노월 확인용) · &banish=3 = 넓히는 길로 시작
import Phaser from 'phaser';
import { bus } from '../core/events';
import { Rng } from '../core/rng';
import { NIGHT_STAGE, RunState } from '../core/RunState';
import { GameData, type CharacterId } from '../data';
import { newRunData } from '../systems/nightRun';
import { COMBO_MILESTONES } from '../systems/ComboSystem';
import { installRunBot, installSpeed } from './runBot';
import { cellCenter, cellOf, type Cell } from '../systems/grid';
import { findPath } from '../systems/pathfind';

interface PlayHandle {
  clock?: { t: number };
  field: { enemies: { x: number; y: number; targetable: boolean; def: { kind: string; friend?: string } }[] };
  boss: { pos: { x: number; y: number } | null; active: boolean } | null;
  sources: { stations: { pos: { x: number; y: number }; state: { mode: string } }[]; central: { pos: { x: number; y: number }; state: { hp: number; maxHp: number } } };
  stage: { fans: { age: number }[] };
  keeper: { pos: { x: number; y: number } };

  light: { range: number };
  grid: { walk: boolean[][]; blocked(a: { x: number; y: number }, b: { x: number; y: number }): boolean };
}

const TAP_EVERY_SEC = 0.45;
const REACH = 300;

export function installAutoplay(game: Phaser.Game): void {
  const params = new URLSearchParams(location.search);
  if (!params.has('autoplay')) return;
  // &char=tori (캐릭터). &stage=trial이면 트라이얼(고정된 적 연습장), &stage=tutorial이면 튜토리얼.
  // 2026-11-23 밤 나들이: 그 밖에는 정식 런 — &night=n이면 밤 n부터(기본 1), &seed=n이면 런 seed 고정, &map=B1이면 그 맵(테스트 판)
  const ch = params.get('char');
  if (ch) RunState.characterId = ch as CharacterId;
  const stage = params.get('stage');
  if (stage === 'trial' || stage === 'tutorial') {
    RunState.stageId = stage;
    RunState.test = stage === 'trial';
    RunState.run = null;
  } else {
    RunState.stageId = NIGHT_STAGE;
    RunState.test = false;
    const seed = Number(params.get('seed') ?? 0) || (Date.now() >>> 0);
    RunState.run = { ...newRunData(seed, RunState.characterId, GameData.game.stage.hearts), night: Math.max(1, Number(params.get('night') ?? 1) || 1) };
    // &friends: 토리·도토가 이미 함께(노월 조건) · &banish=n / &mercy=n: 그만큼 돌려보냄·자비를 쌓은 런 (2026-11-23 노월 두 모습 확인)
    if (params.has('friends')) RunState.run.friendNights = { tori: 1, doto: 1 };
    RunState.run.banish = Number(params.get('banish') ?? 0) || 0;
    RunState.run.mercy = Number(params.get('mercy') ?? 0) || 0;
    // &level=n: 빛 레벨 ★n으로 시작 (2026-11-24 — 밤 10 점검 판을 실제 런처럼, ★1로 바로 시작하면 노월 진정이 시간에 걸림)
    const level = Number(params.get('level') ?? 0);
    if (level > 1) RunState.run.level = Math.min(GameData.game.growth.xpToNext.length + 1, Math.floor(level));
  }
  const runMode = params.get('autoplay') === 'run';
  const skill0 = Math.min(1, Math.max(0, Number(params.get('skill') ?? 1)));
  if (runMode && RunState.run) installRunBot(skill0, RunState.run.seed, Number(params.get('cap') ?? 15) || 15);
  installSpeed(game, Math.max(1, Math.floor(Number(params.get('speed') ?? 1) || 1)));
  // &map=B1: 그 격자 맵으로 (테스트 판처럼 — 기록에 남지 않음, 2026-11-23)
  const map = params.get('map');
  if (map && RunState.run) {
    RunState.test = true;
    RunState.testMapId = map;
  }
  const stopAt = Number(params.get('autoplay') || 20);
  const idle = params.has('idle');
  const pause = params.has('pause');
  const burst = params.has('burst');
  const walk = params.has('walk');
  const aim = params.has('aim');
  const lamp = params.has('lamp') || runMode;
  // 실력: 쏘는 간격 0.45 + (1 − skill) × 1.6초, 조준 오차 ±(1 − skill) × 0.5 라디안
  const skill = skill0;
  const tapEvery = TAP_EVERY_SEC + (1 - skill) * 1.6;
  const jitter = (1 - skill) * 0.5;
  const aimRng = new Rng(4242);
  const fire = (angle: number) => bus.emit('input:fire', { angle: angle + (jitter > 0 ? aimRng.range(-jitter, jitter) : 0) });
  let walkT = 0;
  /** 이번 밤 중앙 광원 HP의 최저 비율 (런 기록용) */
  let runLowest = 1;
  bus.on('run:start', () => (runLowest = 1));
  if (runMode) (window as unknown as { __centralLowest: () => number }).__centralLowest = () => runLowest;
  let sinceTap = 0;
  let frozen = false;
  /** 헤드리스에서는 setTimeout이 늦게 돌 수 있어, 멈출 시각은 실제 시계로 재고 프레임마다 확인한다 */
  let freezeAt: number | null = null;
  const freezeIn = (ms: number) => (freezeAt = performance.now() + ms);

  const freeze = () => {
    frozen = true;
    game.loop.sleep();
    // HUD의 CSS 애니메이션(콤보 링 등)도 같은 순간에 멈춘다
    document.getAnimations().forEach((a) => a.pause());
  };
  if (burst) {
    // stopAt 이후 첫 콤보 단계 연출이 한창일 때 멈춘다
    bus.on('combo:change', (e) => {
      const s = game.scene.getScene('Play') as unknown as PlayHandle | null;
      if (frozen || e.reason !== 'gain' || !COMBO_MILESTONES.includes(e.combo) || (s?.clock?.t ?? 0) < stopAt) return;
      freezeIn(240);
    });
  }
  // 런 모드는 멈추지 않고 아침·다음 밤으로 이어 간다
  if (!runMode) {
    bus.on('game:over', () => freezeIn(900));
    bus.on('game:clear', () => freezeIn(900));
  }

  game.events.on(Phaser.Core.Events.POST_STEP, (_time: number, delta: number) => {
    if (freezeAt !== null && performance.now() >= freezeAt) {
      freezeAt = null;
      freeze();
    }
    if (frozen || freezeAt !== null) return;
    const s = game.scene.getScene('Play') as unknown as PlayHandle | null;
    if (!s?.clock) return;
    sinceTap += delta / 1000;
    if (walk) {
      walkT += delta / 1000;
      bus.emit('input:move', { x: Math.cos(walkT * 0.5) * 0.7, y: Math.sin(walkT * 0.5) * 0.7 });
    }

    const me = s.keeper.pos;
    const offLamp = s.sources.stations
      .filter((st) => st.state.mode === 'off')
      .map((st) => ({ st, d: Math.hypot(st.pos.x - me.x, st.pos.y - me.y) }))
      .sort((a, b) => a.d - b.d)[0];
    if (lamp) {
      const home = { x: s.sources.central.pos.x, y: s.sources.central.pos.y + 130 };
      // 런 모드: 꺼진 등불이 없으면 빛을 잃은 친구 쪽으로 (되찾기)
      // 사람처럼 중앙 광원 막대를 본다: HP가 문턱(실력 0 → 30%, 1 → 60%) 아래면 나가지 않고 곁으로 (2026-11-23 밸런스 측정)
      const central = s.sources.central.state;
      const worried = runMode && central.hp / central.maxHp < 0.3 + 0.3 * skill;
      runLowest = Math.min(runLowest, central.hp / central.maxHp);
      const friend = runMode && !offLamp && !worried ? s.field.enemies.find((e) => e.def.friend && e.targetable) : undefined;
      // 사람처럼 울타리·집을 돌아서 걷는다(격자 길찾기 — 직선으로 걸으면 B1 울타리에 걸려 멈춤, 2026-11-23 밸런스 진단)
      // 등불·친구는 빛이 막히지 않는 곳까지 다가간다
      const goal = offLamp && !worried ? { p: offLamp.st.pos, stop: s.light.range * 0.6 } : friend ? { p: friend as { x: number; y: number }, stop: 200 } : { p: home, stop: 90 };
      const dGoal = Math.hypot(goal.p.x - me.x, goal.p.y - me.y);
      const arrived = dGoal <= goal.stop && (goal.p === home || !s.grid.blocked(me, goal.p));
      bus.emit('input:move', arrived ? { x: 0, y: 0 } : steer(s, me, goal.p, delta / 1000));
    }
    if (!idle && sinceTap >= tapEvery) {
      const target = s.field.enemies
        .filter((e) => e.targetable && e.def.kind !== 'passive' && (!runMode || !s.grid.blocked(me, e)))
        .map((e) => ({ e: e as { x: number; y: number }, d: Math.hypot(e.x - me.x, e.y - me.y) }))
        .concat(s.boss?.active && s.boss.pos ? [{ e: { x: s.boss.pos.x, y: s.boss.pos.y - 30 }, d: Math.hypot(s.boss.pos.x - me.x, s.boss.pos.y - me.y) }] : [])
        .sort((a, b) => a.d - b.d)[0];
      if (offLamp && offLamp.d < s.light.range * 0.9 && (!runMode || !s.grid.blocked(me, offLamp.st.pos))) {
        fire(Math.atan2(offLamp.st.pos.y - me.y, offLamp.st.pos.x - me.x));
        sinceTap = 0;
      } else if (target && target.d < REACH) {
        fire(Math.atan2(target.e.y - me.y, target.e.x - me.x));
        sinceTap = 0;
      }
    }

    // burst 모드는 콤보 단계에서만 멈춘다
    if (!idle && !burst && !runMode && s.clock.t >= stopAt) {
      if (pause) {
        // 일시정지 시트가 다 내려온 뒤 멈춘다
        bus.emit('ui:pause-toggle');
        freezeIn(700);
        return;
      }
      if (aim) {
        // 빛 스틱을 오른쪽 위로 끌고 있는 모습
        if (walk) bus.emit('input:move', { x: 0, y: 0 });
        bus.emit('input:aim', { active: true, angle: -Math.PI / 3, power: 0.8 });
        freezeIn(120);
        return;
      }
      const fan = s.stage.fans[0];
      if (fan && fan.age > 0.2 && fan.age < 0.28) freeze();
    }
  });
}

/** 길찾기로 목표 쪽 다음 칸을 향하는 단위 벡터 (0.5초마다 경로를 다시) */
const route: { goal: string; path: Cell[] | null; age: number } = { goal: '', path: null, age: 0 };
function steer(s: PlayHandle, me: { x: number; y: number }, to: { x: number; y: number }, dt: number): { x: number; y: number } {
  const D = GameData.grid;
  const g = cellOf(to, D);
  const key = `${g.col},${g.row}`;
  route.age += dt;
  if (route.goal !== key || route.age > 0.5 || !route.path) {
    route.goal = key;
    route.age = 0;
    route.path = s.grid?.walk ? findPath(s.grid.walk, cellOf(me, D), g) : null;
  }
  let next = to;
  const p = route.path;
  if (p) {
    while (p.length > 1) {
      const c = cellCenter(p[0].col, p[0].row, D);
      if (Math.hypot(c.x - me.x, c.y - me.y) > D.cell * 0.5) break;
      p.shift();
    }
    if (p.length > 1) next = cellCenter(p[0].col, p[0].row, D);
  }
  const d = Math.hypot(next.x - me.x, next.y - me.y) || 1;
  return { x: (next.x - me.x) / d, y: (next.y - me.y) / d };
}

