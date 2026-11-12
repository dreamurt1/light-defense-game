// 개발 전용: 헤드리스 스크린샷으로 화면을 확인하기 위한 자동 플레이. 빌드에는 들어가지 않는다(main.ts에서 DEV일 때만 불러옴).
//   ?autoplay=20        20초 동안 가장 가까운 이웃에게 빛을 보내다가(빛 스틱을 놓는 것과 같은 input:fire), 빛이 퍼지는 순간 화면을 멈춘다
//   ?autoplay=20&walk   위와 같되 등불지기가 천천히 원을 그리며 걷는다(이동·카메라 따라가기 확인)
//   ?autoplay=20&aim    멈출 때 빛 스틱으로 겨누고 있는 모습(조준 부채꼴)을 띄운다
//   ?autoplay=20&idle   탭하지 않고 버티다가(게임 오버 화면 확인용) 결과 시트가 뜨면 멈춘다
//   ?autoplay=20&pause  20초에 일시정지 시트를 열고 멈춘다
//   ?autoplay=5&burst   5초 이후 처음 터지는 콤보 단계 연출(콤보 ×N) 한가운데서 멈춘다
import Phaser from 'phaser';
import { bus } from '../core/events';
import { COMBO_MILESTONES } from '../systems/ComboSystem';

interface PlayHandle {
  clock?: { t: number };
  enemies: { x: number; y: number; targetable: boolean }[];
  stage: { fans: { age: number }[] };
  lantern: { pos: { x: number; y: number } };
}

const TAP_EVERY_SEC = 0.45;
const REACH = 300;

export function installAutoplay(game: Phaser.Game): void {
  const params = new URLSearchParams(location.search);
  if (!params.has('autoplay')) return;
  const stopAt = Number(params.get('autoplay') || 20);
  const idle = params.has('idle');
  const pause = params.has('pause');
  const burst = params.has('burst');
  const walk = params.has('walk');
  const aim = params.has('aim');
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

    if (!idle && sinceTap >= TAP_EVERY_SEC) {
      const lantern = s.lantern.pos;
      const target = s.enemies
        .filter((e) => e.targetable)
        .map((e) => ({ e, d: Math.hypot(e.x - lantern.x, e.y - lantern.y) }))
        .sort((a, b) => a.d - b.d)[0];
      if (target && target.d < REACH) {
        bus.emit('input:fire', { angle: Math.atan2(target.e.y - lantern.y, target.e.x - lantern.x) });
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
