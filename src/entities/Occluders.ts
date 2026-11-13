// 가리는 물체 반투명 (2026-11-13 라이언: 장애물 뒤쪽에 루미나 주인공이 있을 때 반투명으로 잘 보이게).
// 오두막·담·울타리·등불 기둥·바위·술통·중앙 광원·등불처럼 2.5D로 앞에 그려지는 물체가 등불지기 몸과 겹치면
// 그 물체를 반투명하게 했다가, 벗어나면 다시 불투명하게 한다. 풀숲은 숨는 곳이라 따로(MapProps).
import type Phaser from 'phaser';
import type { Vec } from '../systems/fan';
import type { Rect } from '../systems/obstacles';

/** 투명도를 바꿀 수 있는 그림 (Image·Graphics 모두) */
type Fadable = { alpha: number; setAlpha(value: number): unknown };

interface Occluder {
  objs: Fadable[];
  /** 그림이 화면에서 차지하는 마을 좌표 영역 */
  box: Rect;
  /** 앞뒤 순서(밑변 y): 이 값이 등불지기 발보다 크면 등불지기를 가린다 */
  depth: number;
  /** 원래 투명도 (등불 빛 등은 1이 아님) */
  base: number[];
  fade: number;
}

/** 가릴 때 투명도 (제안) */
const SEE_THROUGH = 0.45;
/** 바뀌는 빠르기 (초당) */
const RATE = 8;
/** 등불지기 몸 영역: 발 위치(pos) 기준 (그림 한 칸 128을 화면 2배로, 몸통만) */
const BODY = { halfW: 26, above: 78, below: 30 };

export class Occluders {
  private readonly items: Occluder[] = [];

  /** 물체 하나 등록. box를 주지 않으면 첫 그림의 화면 영역 */
  add(objs: readonly Fadable[], depth: number, box?: Rect): void {
    let r = box;
    if (!r) {
      const g = (objs[0] as unknown as Phaser.GameObjects.Image).getBounds();
      r = { x: g.x, y: g.y, w: g.width, h: g.height };
    }
    this.items.push({ objs: [...objs], box: r, depth, base: objs.map((o) => o.alpha), fade: 1 });
  }

  /** @param keeper 등불지기 위치(깊이 = y). null이면(쓰러짐 등) 모두 원래대로 */
  update(dt: number, keeper: Vec | null): void {
    const k = Math.min(1, dt * RATE);
    const body = keeper ? { x: keeper.x - BODY.halfW, y: keeper.y - BODY.above, w: BODY.halfW * 2, h: BODY.above + BODY.below } : null;
    for (const it of this.items) {
      const behind = !!body && !!keeper && it.depth > keeper.y && overlaps(body, it.box);
      const target = behind ? SEE_THROUGH : 1;
      if (Math.abs(it.fade - target) < 0.005) continue;
      it.fade += (target - it.fade) * k;
      it.objs.forEach((o, i) => o.setAlpha(it.base[i] * it.fade));
    }
  }
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}
