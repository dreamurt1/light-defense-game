// 화면 밖 장식 끄기 (2026-11-20 휴대폰 렉: Phaser는 카메라 밖 물체도 매 프레임 묶어 보낸다 — 3스테이지 판에 보이는 물체 405개,
// 화면에 들어오는 건 마을의 약 11%). 움직이지 않고 다른 곳에서 보이기(visible)를 바꾸지 않는 장식만 맡아,
// 카메라가 보는 곳(+여유) 밖이면 visible을 끈다. 알파·색 같은 다른 값은 그대로 두므로 다시 들어오면 그 모습 그대로 보인다.
import type Phaser from 'phaser';

/** 카메라 바깥 여유: 빛 번짐·그림이 가장자리에서 툭 나타나지 않게 */
const MARGIN = 220;

type Cullable = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible & { getBounds(): Phaser.Geom.Rectangle };

interface Item {
  obj: Cullable;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** 순수 판단: 사각형이 보이는 곳(+여유)과 겹치나 */
export function inView(b: { x0: number; y0: number; x1: number; y1: number }, v: { x: number; y: number; width: number; height: number }, margin = MARGIN): boolean {
  return b.x1 >= v.x - margin && b.x0 <= v.x + v.width + margin && b.y1 >= v.y - margin && b.y0 <= v.y + v.height + margin;
}

export class WorldCuller {
  private readonly items: Item[] = [];

  /** 지금 자리·크기로 한 번 잰다. pad = 움직이는 폭(반딧불처럼 제자리 둘레를 맴도는 것) */
  add(obj: Cullable, pad = 0): void {
    const b = obj.getBounds();
    this.items.push({ obj, x0: b.x - pad, y0: b.y - pad, x1: b.right + pad, y1: b.bottom + pad });
  }

  update(cam: Phaser.Cameras.Scene2D.Camera): void {
    const v = cam.worldView;
    for (const it of this.items) {
      const on = inView(it, v);
      if (it.obj.visible !== on) it.obj.setVisible(on);
    }
  }

  /** 꺼진(화면 밖) 물체인가 — 화면 밖이면 갱신을 건너뛰고 싶을 때 */
  static hidden(obj: { visible: boolean }): boolean {
    return !obj.visible;
  }
}
