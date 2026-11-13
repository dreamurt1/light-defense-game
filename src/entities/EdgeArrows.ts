// 화면 밖 이웃 알림: 넓은 마을에서도 '어느 쪽을 먼저 막을지' 판단할 수 있게,
// 보이지 않는 적 쪽 화면 가장자리에 라벤더 화살표를 띄운다. 가까울수록 진하다. (제안: 기획서에 없음)
// 꺼진 등불·위험한 중앙 광원·빛을 잃은 친구 = **노란 화살표** (2026-11-13 라이언: '호박빛 표시'가 무엇인지 모르겠고
// 등불이 화면 안에 있으면 아무것도 안 뜬다 → 화면 밖이면 가장자리에서 그쪽을, 화면 안이면 그 위에서 아래로 가리킨다)
import Phaser from 'phaser';
import type { Vec } from '../systems/fan';

/** 노란 화살표가 가리킬 곳. lift = 화면 안일 때 화살표 끝을 둘 높이(그림 꼭대기 위), drop = 위가 HUD에 가려 아래에서 가리킬 때 끝의 깊이(받침·게이지 아래) — 연출 값 */
export interface Beacon extends Vec {
  lift: number;
  drop: number;
}

/** 화면 가장자리에서 들인 폭. 위·아래는 HUD 띠와 스틱을 피한다 (가로는 위 띠·아래 띠가 얇고 스틱이 양 구석) */
const INSET = {
  portrait: { left: 16, right: 16, top: 96, bottom: 132 },
  landscape: { left: 28, right: 28, top: 78, bottom: 96 },
};
const SIZE = 11;
const COLOR = 0xa89cd9;
/** 노란 화살표 (튜토리얼·토스트 문구 '노란 화살표'와 같은 색) */
const YELLOW = 0xffdd4a;
const OUTLINE = 0x120f24;
/** 화살촉 크기. 적 화살표보다 크고, 1.6초 주기로 천천히 숨 쉬듯 번진다(깜빡임 규칙 안, 제안) */
const ARROW = 18;
const PULSE_MS = 260;
/** 화면 안 화살표가 위아래로 오가는 폭 */
const BOB = 7;
/** 이만큼 떨어지면 가장 옅게 */
const FAR = 520;

export class EdgeArrows {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(4600);
  }

  /** 판이 끝나면 지운다 (update가 더 불리지 않으므로 마지막 화살표가 남지 않게) */
  hide(): void {
    this.g.clear();
  }

  update(cam: Phaser.Cameras.Scene2D.Camera, targets: readonly Vec[], beacons: readonly Beacon[] = []): void {
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
    const pulse = 0.5 + 0.5 * Math.sin(this.scene.time.now / PULSE_MS);
    for (const [i, t] of [...targets, ...beacons].entries()) {
      const beacon = i >= targets.length;
      // 화면 좌표 (카메라 확대 없음)
      const sx = t.x - view.x;
      const sy = t.y - view.y;
      const onScreen = sx >= -8 && sx <= W + 8 && sy >= -8 && sy <= H + 8;
      if (onScreen) {
        // 화면 안의 꺼진 등불: 그 위에서 아래로 가리킨다(위가 HUD에 가리면 아래에서 위로)
        if (beacon) this.pointAt(sx, sy, t as Beacon, y0, pulse);
        continue;
      }
      const dx = sx - W / 2;
      const dy = sy - H / 2;
      // 화면 가운데에서 이웃 쪽으로 그은 선이 안쪽 사각형 테두리와 만나는 점
      const k = Math.min(dx > 0 ? (x1 - W / 2) / dx : dx < 0 ? (x0 - W / 2) / dx : Infinity, dy > 0 ? (y1 - H / 2) / dy : dy < 0 ? (y0 - H / 2) / dy : Infinity);
      const px = W / 2 + dx * k;
      const py = H / 2 + dy * k;
      const a = Math.atan2(dy, dx);
      if (beacon) {
        // 가장자리에서 그쪽을 가리키는 노란 화살표 (끝이 바깥, 몸통은 안쪽이라 잘리지 않음)
        const nudge = 3 * pulse;
        this.arrow(px + Math.cos(a) * nudge, py + Math.sin(a) * nudge, a, pulse);
        continue;
      }
      const outside = Math.max(0, Math.max(-sx, sx - W, -sy, sy - H));
      const alpha = 0.95 - 0.6 * Math.min(1, outside / FAR);
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

  /** 화면 안 대상 위에서 아래로 (위쪽이 HUD 띠에 걸리면 발밑에서 위로) */
  private pointAt(sx: number, sy: number, b: Beacon, top: number, pulse: number): void {
    const length = ARROW * 2.3;
    const bob = BOB * pulse;
    const above = sy - b.lift - length - bob > top;
    if (above) this.arrow(sx, sy - b.lift - bob, Math.PI / 2, pulse);
    else this.arrow(sx, sy + b.drop + bob, -Math.PI / 2, pulse);
  }

  /** 끝(tip)이 angle 쪽을 가리키는 굵은 노란 화살표: 화살촉 + 몸통, 어두운 테두리, 뒤에 번지는 빛 */
  private arrow(tipX: number, tipY: number, angle: number, pulse: number): void {
    const g = this.g;
    const d = { x: Math.cos(angle), y: Math.sin(angle) };
    const p = { x: -d.y, y: d.x };
    const head = ARROW;
    const halfHead = ARROW * 0.72;
    const halfShaft = ARROW * 0.3;
    const shaft = ARROW * 1.3;
    const at = (along: number, side: number) => ({ x: tipX - d.x * along + p.x * side, y: tipY - d.y * along + p.y * side });
    const pts = [at(0, 0), at(head, halfHead), at(head, halfShaft), at(head + shaft, halfShaft), at(head + shaft, -halfShaft), at(head, -halfShaft), at(head, -halfHead)];
    const mid = at((head + shaft) / 2, 0);
    g.fillStyle(YELLOW, 0.12 + 0.14 * pulse);
    g.fillCircle(mid.x, mid.y, ARROW * 1.3 + 5 * pulse);
    g.fillStyle(YELLOW, 1);
    g.fillPoints(pts, true);
    g.lineStyle(2.5, OUTLINE, 0.85);
    g.strokePoints(pts, true);
  }
}
