// 이동(순수 로직): 이동 스틱·키보드 입력을 걷는 벡터로 바꾸고, 한 프레임 걸은 위치를 마을 안으로 자른다.
import type { Vec } from './fan';

export interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 스틱 끌기(손잡이 이동 / 반지름)를 입력 벡터로: 데드존 안은 0, 밖은 0~1로 다시 늘이고 길이는 1을 넘지 않는다 */
export function stickVector(dx: number, dy: number, deadzone: number): Vec {
  const len = Math.hypot(dx, dy);
  if (len <= deadzone) return { x: 0, y: 0 };
  const k = Math.min(1, (len - deadzone) / (1 - deadzone)) / len;
  return { x: dx * k, y: dy * k };
}

/** 키보드 방향을 길이 1 벡터로 (대각선도 같은 속도) */
export function keysVector(left: boolean, right: boolean, up: boolean, down: boolean): Vec {
  const x = (right ? 1 : 0) - (left ? 1 : 0);
  const y = (down ? 1 : 0) - (up ? 1 : 0);
  const len = Math.hypot(x, y);
  return len === 0 ? { x: 0, y: 0 } : { x: x / len, y: y / len };
}

/** 두 입력(스틱·키보드) 중 더 센 쪽 */
export function strongerInput(a: Vec, b: Vec): Vec {
  return Math.hypot(a.x, a.y) >= Math.hypot(b.x, b.y) ? a : b;
}

/** 마을 크기에서 둘레(위는 집 줄, 옆·아래는 덤불 띠)를 뺀 걷기 영역 */
export function walkArea(width: number, height: number, inset: { top: number; side: number; bottom: number }): Area {
  return { x: inset.side, y: inset.top, w: width - inset.side * 2, h: height - inset.top - inset.bottom };
}

/** 한 프레임 걸은 뒤 위치. 입력 길이가 1을 넘으면 1로 줄이고, 걷기 영역 밖으로 나가지 않는다 */
export function stepMove(pos: Vec, input: Vec, speed: number, dt: number, area: Area): Vec {
  const len = Math.hypot(input.x, input.y);
  const k = len > 1 ? 1 / len : 1;
  const x = pos.x + input.x * k * speed * dt;
  const y = pos.y + input.y * k * speed * dt;
  return {
    x: Math.min(area.x + area.w, Math.max(area.x, x)),
    y: Math.min(area.y + area.h, Math.max(area.y, y)),
  };
}
