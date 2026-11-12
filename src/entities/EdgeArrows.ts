// 화면 밖 이웃 알림: 넓은 마을에서도 '어느 쪽을 먼저 막을지' 판단할 수 있게,
// 보이지 않는 이웃 쪽 화면 가장자리에 라벤더 화살표를 띄운다. 가까울수록 진하다. (제안: 기획서에 없음)
import Phaser from 'phaser';
import type { Vec } from '../systems/fan';

/** 화면 가장자리에서 들인 폭. 위·아래는 HUD 띠와 스틱을 피한다 (가로는 위 띠·아래 띠가 얇고 스틱이 양 구석) */
const INSET = {
  portrait: { left: 16, right: 16, top: 96, bottom: 132 },
  landscape: { left: 28, right: 28, top: 78, bottom: 96 },
};
const SIZE = 11;
const COLOR = 0xa89cd9;
/** 이만큼 떨어지면 가장 옅게 */
const FAR = 520;

export class EdgeArrows {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(4600);
  }

  /** 판이 끝나면 지운다 (update가 더 불리지 않으므로 마지막 화살표가 남지 않게) */
  hide(): void {
    this.g.clear();
  }

  update(cam: Phaser.Cameras.Scene2D.Camera, targets: readonly Vec[]): void {
    const g = this.g;
    g.clear();
    const view = cam.worldView;
    // 화면 크기는 화면 방식(세로·가로·창 비율)에 따라 바뀐다
    const W = cam.width;
    const H = cam.height;
    const inset = W > H ? INSET.landscape : INSET.portrait;
    const x0 = inset.left;
    const x1 = W - inset.right;
    const y0 = inset.top;
    const y1 = H - inset.bottom;
    for (const t of targets) {
      // 화면 좌표 (카메라 확대 없음)
      const sx = t.x - view.x;
      const sy = t.y - view.y;
      if (sx >= -8 && sx <= W + 8 && sy >= -8 && sy <= H + 8) continue;
      const dx = sx - W / 2;
      const dy = sy - H / 2;
      // 화면 가운데에서 이웃 쪽으로 그은 선이 안쪽 사각형 테두리와 만나는 점
      const k = Math.min(dx > 0 ? (x1 - W / 2) / dx : dx < 0 ? (x0 - W / 2) / dx : Infinity, dy > 0 ? (y1 - H / 2) / dy : dy < 0 ? (y0 - H / 2) / dy : Infinity);
      const px = W / 2 + dx * k;
      const py = H / 2 + dy * k;
      const outside = Math.max(0, Math.max(-sx, sx - W, -sy, sy - H));
      const alpha = 0.95 - 0.6 * Math.min(1, outside / FAR);
      const a = Math.atan2(dy, dx);
      g.fillStyle(COLOR, alpha);
      g.fillTriangle(
        px + Math.cos(a) * SIZE,
        py + Math.sin(a) * SIZE,
        px + Math.cos(a + 2.4) * SIZE,
        py + Math.sin(a + 2.4) * SIZE,
        px + Math.cos(a - 2.4) * SIZE,
        py + Math.sin(a - 2.4) * SIZE,
      );
    }
  }
}
