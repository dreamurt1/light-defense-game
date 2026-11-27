// 빛 겨누기 입력 (PlayScene에서 떼어 냄, 2026-11-18): 빛 스틱 겨눔 · PC 마우스 끌기 · 반자동(빛 스틱을 누르고 있기 / PC 스페이스)
// → 매 프레임 조준선을 그리고, 반자동으로 지금 한 발 쏠지 알려 준다. 실제 발사는 PlayScene.fire가 한다.
import { GameData } from '../../data';
import type { AimGuide } from '../../entities/AimGuide';
import type { DesktopControls } from '../../input/DesktopControls';
import { dragAim } from '../../systems/aimStick';
import { AutoFire } from '../../systems/autoFire';
import { FireBuffer } from '../../systems/fireBuffer';
import type { Vec } from '../../systems/fan';

const CTRL = GameData.game.controls;

type Fire = (angle: number | null, reach: number) => boolean;

export class Aiming {
  /** 빛 스틱으로 겨누는 방향과 끈 정도(0~1). 겨누지 않으면 null */
  stick: { angle: number; power: number } | null = null;
  readonly auto = new AutoFire(CTRL.autoHoldDelaySec);
  /** 빛 대기 중에 들어온 탭·놓기 (2026-11-27 라이언: 노트북 터치패드로 톡톡 탭하면 공격이 잘 안 먹힘) */
  readonly queued = new FireBuffer<{ angle: number | null; reach: number }>(CTRL.fireBufferSec);

  constructor(
    private readonly desktop: DesktopControls,
    private readonly guide: AimGuide,
  ) {}

  /** PC 마우스 끌기: 등불지기에서 커서 쪽으로, 커서까지의 거리만큼(사거리를 넘지 않음). 등불지기 바로 위면 null = 취소 */
  mouse(origin: Vec, point: Vec, range: number): { angle: number; range: number } | null {
    return dragAim(origin, point, range, CTRL.mouseCancelRadius);
  }

  /** 탭·놓기 한 발(빛 스틱 놓기·짧은 탭·PC 클릭): 빛이 대기 중이라 못 쐈으면 버리지 않고 예약 — 대기가 끝나는 순간 쏜다 */
  shoot(angle: number | null, reach: number, light: { ready: boolean; cooldownLeft: number }, fire: Fire): void {
    if (!fire(angle, reach) && !light.ready) this.queued.hold({ angle, reach }, light.cooldownLeft);
  }

  /** 매 프레임: 예약한 한 발을 빛이 준비되면 쏜다 */
  flush(dt: number, ready: boolean, fire: Fire): void {
    const q = this.queued.take(dt, ready);
    if (q) fire(q.angle, q.reach);
  }

  /** 일시정지: 끌던 마우스·예약한 한 발을 버린다 (다시 시작한 순간 빛이 나가지 않게) */
  cancel(): void {
    this.desktop.cancel();
    this.queued.clear();
  }

  /**
   * 매 프레임: 빛 스틱 겨눔이 우선, 아니면 PC 마우스 끌기, 아니면 반자동 대상(누르고 있는 동안)으로 조준선을 그린다.
   * 반환 = 반자동으로 지금 한 발 쏠 차례 (겨누거나 끄는 중이면 false)
   */
  update(dt: number, origin: Vec, range: number, ready: boolean, down: boolean, autoAngle: () => number | null): boolean {
    const key = this.desktop.autoHeld;
    const shoot = this.auto.update(dt, ready && !down, key);
    const stick = this.stick;
    const drag = stick ? null : this.desktop.dragPoint();
    const mouse = drag ? this.mouse(origin, drag, range) : null;
    const auto = !stick && !mouse && this.auto.holding(key) ? autoAngle() : null;
    const aim = down ? null : (stick?.angle ?? mouse?.angle ?? auto);
    const reach = stick ? stick.power * range : (mouse?.range ?? range);
    this.guide.draw(origin, aim, reach, ready);
    return shoot && !stick && !mouse;
  }
}
