// 빛 스틱(순수 로직, 브롤스타즈식): 누르고·끌고·놓는 동작을 '겨눔 / 발사 / 자동 조준 / 취소'로 바꾼다.
//  - 데드존 밖으로 끌면 겨눔: 그 방향으로 범위가 보이고, 놓으면 그 방향으로 발사. 끈 거리(스틱 반지름 대비 0~1)에 비례해
//    원뿔 반지름이 정해진다(2026-11-06 라이언 지시, 브롤스타즈의 던지기형 조준처럼 끝까지 끌면 사거리 끝)
//  - 끌지 않고 놓으면(짧게 탭) 가장 가까운 이웃에게 자동 조준
//  - 끌었다가 가운데(데드존)로 되돌려 놓으면 취소
import type { Vec } from './fan';

export type AimRelease = { kind: 'fire'; angle: number; power: number } | { kind: 'auto' } | { kind: 'cancel' };

export class AimStick {
  private pressed = false;
  /** 한 번이라도 데드존 밖으로 나갔나 */
  private dragged = false;
  private aiming = false;
  private angle = 0;
  private reach = 1;

  constructor(private readonly deadzone: number) {}

  get active(): boolean {
    return this.aiming;
  }

  /** 끌었다가 가운데로 돌아와 있음: 지금 놓으면 취소 */
  get cancelling(): boolean {
    return this.pressed && this.dragged && !this.aiming;
  }

  get direction(): number {
    return this.angle;
  }

  /** 끈 정도 0~1 (원뿔 반지름 = 사거리 × power) */
  get power(): number {
    return this.reach;
  }

  down(): void {
    this.pressed = true;
    this.dragged = false;
    this.aiming = false;
  }

  /** dx, dy = 손잡이 끌기 / 반지름. 지금 겨누는 중이면 true */
  move(dx: number, dy: number): boolean {
    if (!this.pressed) return false;
    const len = Math.hypot(dx, dy);
    if (len > this.deadzone) {
      this.dragged = true;
      this.aiming = true;
      this.angle = Math.atan2(dy, dx);
      this.reach = Math.min(1, len);
    } else {
      this.aiming = false;
    }
    return this.aiming;
  }

  /** 놓았을 때 할 일. 누르지 않은 상태면 null */
  up(): AimRelease | null {
    if (!this.pressed) return null;
    const release: AimRelease = this.aiming
      ? { kind: 'fire', angle: this.angle, power: this.reach }
      : this.dragged
        ? { kind: 'cancel' }
        : { kind: 'auto' };
    this.pressed = false;
    this.dragged = false;
    this.aiming = false;
    return release;
  }
}

/**
 * PC 마우스 끌기 조준 (2026-11-06 라이언 지시): 등불에서 커서 쪽으로, 커서까지의 거리가 곧 원뿔 반지름(사거리를 넘지 않음).
 * 등불 바로 위(cancelRadius 안)면 null: 거기서 놓으면 모바일 스틱을 가운데로 되돌려 놓은 것처럼 취소
 */
export function dragAim(origin: Vec, cursor: Vec, maxRange: number, cancelRadius: number): { angle: number; range: number } | null {
  const dx = cursor.x - origin.x;
  const dy = cursor.y - origin.y;
  const d = Math.hypot(dx, dy);
  if (d < cancelRadius) return null;
  return { angle: Math.atan2(dy, dx), range: Math.min(d, maxRange) };
}

/** 자동 조준 방향: 사거리 안에서 가장 가까운 이웃, 없으면 가장 가까운 이웃. 아무도 없으면 null */
export function autoAimAngle(origin: Vec, targets: readonly Vec[], range: number): number | null {
  let best: Vec | null = null;
  let bestScore = Infinity;
  for (const t of targets) {
    const d = Math.hypot(t.x - origin.x, t.y - origin.y);
    // 사거리 안의 이웃을 먼저 고르도록 사거리 밖은 점수를 크게
    const score = d <= range ? d : d + 1e6;
    if (score < bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best ? Math.atan2(best.y - origin.y, best.x - origin.x) : null;
}
