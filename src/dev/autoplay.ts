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
import Phaser from 'phaser';
import { bus } from '../core/events';
import { Rng } from '../core/rng';
import { RunState } from '../core/RunState';
import type { CharacterId } from '../data';
import { COMBO_MILESTONES } from '../systems/ComboSystem';

interface PlayHandle {
  clock?: { t: number };
  field: { enemies: { x: number; y: number; targetable: boolean; def: { kind: string } }[] };
  boss: { pos: { x: number; y: number } | null; active: boolean } | null;
  sources: { stations: { pos: { x: number; y: number }; state: { mode: string } }[]; central: { pos: { x: number; y: number } } };
  stage: { fans: { age: number }[] };
  keeper: { pos: { x: number; y: number } };

  light: { range: number };
}

const TAP_EVERY_SEC = 0.45;
const REACH = 300;

export function installAutoplay(game: Phaser.Game): void {
  const params = new URLSearchParams(location.search);
  if (!params.has('autoplay')) return;
  // 2026-11-13: &stage=stage-2 (스테이지), &char=tori (캐릭터), stage=trial이면 트라이얼(고정된 적 연습장, 2026-11-14)
  const stage = params.get('stage');
  if (stage) {
    RunState.stageId = stage;
    RunState.test = stage === 'trial';
  }
  const ch = params.get('char');
  if (ch) RunState.characterId = ch as CharacterId;
  const stopAt = Number(params.get('autoplay') || 20);
  const idle = params.has('idle');
  const pause = params.has('pause');
  const burst = params.has('burst');
  const walk = params.has('walk');
  const aim = params.has('aim');
  const lamp = params.has('lamp');
  // 실력: 쏘는 간격 0.45 + (1 − skill) × 1.6초, 조준 오차 ±(1 − skill) × 0.5 라디안
  const skill = Math.min(1, Math.max(0, Number(params.get('skill') ?? 1)));
  const tapEvery = TAP_EVERY_SEC + (1 - skill) * 1.6;
  const jitter = (1 - skill) * 0.5;
  const aimRng = new Rng(4242);
  const fire = (angle: number) => bus.emit('input:fire', { angle: angle + (jitter > 0 ? aimRng.range(-jitter, jitter) : 0) });
  let walkT = 0;
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
  bus.on('game:over', () => freezeIn(900));
  bus.on('game:clear', () => freezeIn(900));

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
      const dHome = Math.hypot(home.x - me.x, home.y - me.y);
      const go = offLamp
        ? offLamp.d > s.light.range * 0.7
          ? { x: (offLamp.st.pos.x - me.x) / offLamp.d, y: (offLamp.st.pos.y - me.y) / offLamp.d }
          : { x: 0, y: 0 }
        : dHome > 90
          ? { x: (home.x - me.x) / dHome, y: (home.y - me.y) / dHome }
          : { x: 0, y: 0 };
      bus.emit('input:move', go);
    }
    if (!idle && sinceTap >= tapEvery) {
      const target = s.field.enemies
        .filter((e) => e.targetable && e.def.kind !== 'passive')
        .map((e) => ({ e: e as { x: number; y: number }, d: Math.hypot(e.x - me.x, e.y - me.y) }))
        .concat(s.boss?.active && s.boss.pos ? [{ e: { x: s.boss.pos.x, y: s.boss.pos.y - 30 }, d: Math.hypot(s.boss.pos.x - me.x, s.boss.pos.y - me.y) }] : [])
        .sort((a, b) => a.d - b.d)[0];
      if (offLamp && offLamp.d < s.light.range * 0.9) {
        fire(Math.atan2(offLamp.st.pos.y - me.y, offLamp.st.pos.x - me.x));
        sinceTap = 0;
      } else if (target && target.d < REACH) {
        fire(Math.atan2(target.e.y - me.y, target.e.x - me.x));
        sinceTap = 0;
      }
    }

    // burst 모드는 콤보 단계에서만 멈춘다
    if (!idle && !burst && s.clock.t >= stopAt) {
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
