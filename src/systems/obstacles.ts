// 장애물과 풀숲 (순수 로직, 2026-11-04 라이언 지시 — 브롤스타즈식).
//  - 장애물(바위·술통·등불 기둥): 등불지기(원)가 사각형 안으로 들어가지 못하게 가장 가까운 바깥으로 밀어낸다
//  - 풀숲: 등불지기의 발이 풀숲 사각형 안(가장자리 inset 안쪽)에 있으면 숨은 것
import type { Vec } from './fan';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 원(pos, radius)이 사각형과 겹치면 겹치지 않는 가장 가까운 위치로 밀어낸다. 여러 장애물은 차례로 두 번 푼다 */
export function pushOut(pos: Vec, radius: number, rects: readonly Rect[]): Vec {
  let { x, y } = pos;
  for (let pass = 0; pass < 2; pass++) {
    for (const r of rects) {
      const cx = Math.min(r.x + r.w, Math.max(r.x, x));
      const cy = Math.min(r.y + r.h, Math.max(r.y, y));
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy);
      if (d >= radius) continue;
      if (d > 0) {
        // 사각형 바깥에서 닿음: 가장 가까운 점에서 반지름만큼 떨어뜨린다
        x = cx + (dx / d) * radius;
        y = cy + (dy / d) * radius;
      } else {
        // 중심이 사각형 안: 가장 얕은 쪽 변으로 내보낸다
        const left = x - r.x;
        const right = r.x + r.w - x;
        const top = y - r.y;
        const bottom = r.y + r.h - y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) x = r.x - radius;
        else if (m === right) x = r.x + r.w + radius;
        else if (m === top) y = r.y - radius;
        else y = r.y + r.h + radius;
      }
    }
  }
  return { x, y };
}

/** 점이 사각형 안(가장자리에서 inset만큼 들어간 곳)에 있나 */
export function insideRect(p: Vec, r: Rect, inset = 0): boolean {
  return p.x >= r.x + inset && p.x <= r.x + r.w - inset && p.y >= r.y + inset && p.y <= r.y + r.h - inset;
}

/** 들어가 있는 풀숲의 번호, 없으면 -1 */
export function bushAt(p: Vec, bushes: readonly Rect[], inset = 0): number {
  return bushes.findIndex((b) => insideRect(p, b, inset));
}
