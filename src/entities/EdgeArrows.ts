// 화면 밖 이웃 알림: 넓은 마을에서도 '어느 쪽을 먼저 막을지' 판단할 수 있게,
// 보이지 않는 적 쪽 화면 가장자리에 라벤더 화살표를 띄운다. 가까울수록 진하다. (제안: 기획서에 없음)
// 꺼진 등불·위험한 중앙 광원·빛을 잃은 친구 = **노란 화살표** (2026-11-13 라이언: '호박빛 표시'가 무엇인지 모르겠고
// 등불이 화면 안에 있으면 아무것도 안 뜬다 → 화면 밖이면 가장자리에서 그쪽을, 화면 안이면 그 위에서 아래로 가리킨다)
// 2026-11-27 기기별 렉: 매 프레임 지우고 다시 그리는 Graphics(클라이맥스 명령 230~330개 + 노란 화살표의 원·다각형을 매번 삼각형으로 쪼갬)가
// 느린 기기 CPU의 큰 몫 → 같은 모양을 한 번 구운 그림(라벤더 삼각형·노란 화살표·빛 원)을 돌려 쓰는 이미지 묶음으로. 자리·각도·투명도·숨쉬기 계산은 그대로.
import Phaser from 'phaser';
import type { Vec } from '../systems/fan';
import { bakeTexture } from './bake';

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
const DEPTH = 4600;

/** 노란 화살표 모양 (끝 = 오른쪽, angle 0) */
const HEAD = ARROW;
const HALF_HEAD = ARROW * 0.72;
const HALF_SHAFT = ARROW * 0.3;
const SHAFT = ARROW * 1.3;
const STROKE = 2.5;
const PAD = 3;
const AW = Math.ceil(HEAD + SHAFT + PAD * 2);
const AH = Math.ceil(HALF_HEAD * 2 + PAD * 2);
/** 빛 원 텍스처 반지름 */
const GLOW_R = 32;

const KEYS = { enemy: 'edge-arrow-enemy', beacon: 'edge-arrow-beacon', glow: 'edge-arrow-glow' } as const;

function bakeArrows(scene: Phaser.Scene): void {
  const s = SIZE + 1;
  bakeTexture(scene, KEYS.enemy, s * 2, s * 2, (g) => {
    g.fillStyle(COLOR, 1);
    g.fillTriangle(s + SIZE, s, s + Math.cos(2.4) * SIZE, s + Math.sin(2.4) * SIZE, s + Math.cos(-2.4) * SIZE, s + Math.sin(-2.4) * SIZE);
  });
  bakeTexture(scene, KEYS.beacon, AW, AH, (g) => {
    // 끝(tip) = (AW - PAD, AH / 2), 몸통은 왼쪽으로
    const tx = AW - PAD;
    const ty = AH / 2;
    const at = (along: number, side: number) => ({ x: tx - along, y: ty + side });
    const pts = [at(0, 0), at(HEAD, HALF_HEAD), at(HEAD, HALF_SHAFT), at(HEAD + SHAFT, HALF_SHAFT), at(HEAD + SHAFT, -HALF_SHAFT), at(HEAD, -HALF_SHAFT), at(HEAD, -HALF_HEAD)];
    g.fillStyle(YELLOW, 1);
    g.fillPoints(pts, true);
    g.lineStyle(STROKE, OUTLINE, 0.85);
    g.strokePoints(pts, true);
  });
  bakeTexture(scene, KEYS.glow, GLOW_R * 2, GLOW_R * 2, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(GLOW_R, GLOW_R, GLOW_R);
  });
}

/** 같은 그림의 이미지 묶음: 프레임마다 앞에서부터 쓰고 남은 것은 숨긴다 */
class Pool {
  private readonly items: Phaser.GameObjects.Image[] = [];
  private used = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly key: string,
    private readonly depth: number,
    private readonly origin: { x: number; y: number },
  ) {}

  begin(): void {
    this.used = 0;
  }

  next(): Phaser.GameObjects.Image {
    let img = this.items[this.used];
    if (!img) {
      img = this.scene.add.image(0, 0, this.key).setScrollFactor(0).setDepth(this.depth).setOrigin(this.origin.x, this.origin.y);
      this.items.push(img);
    }
    this.used++;
    return img.setVisible(true);
  }

  end(): void {
    for (let i = this.used; i < this.items.length; i++) if (this.items[i].visible) this.items[i].setVisible(false);
  }
}

export class EdgeArrows {
  private readonly enemies: Pool;
  private readonly beacons: Pool;
  private readonly glows: Pool;

  constructor(private readonly scene: Phaser.Scene) {
    bakeArrows(scene);
    this.glows = new Pool(scene, KEYS.glow, DEPTH - 0.1, { x: 0.5, y: 0.5 });
    this.enemies = new Pool(scene, KEYS.enemy, DEPTH, { x: 0.5, y: 0.5 });
    this.beacons = new Pool(scene, KEYS.beacon, DEPTH + 0.1, { x: (AW - PAD) / AW, y: 0.5 });
  }

  /** 판이 끝나면 지운다 (update가 더 불리지 않으므로 마지막 화살표가 남지 않게) */
  hide(): void {
    for (const p of [this.enemies, this.beacons, this.glows]) {
      p.begin();
      p.end();
    }
  }

  update(cam: Phaser.Cameras.Scene2D.Camera, targets: readonly Vec[], beacons: readonly Beacon[] = []): void {
    this.enemies.begin();
    this.beacons.begin();
    this.glows.begin();
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
    const n = targets.length + beacons.length;
    for (let i = 0; i < n; i++) {
      const beacon = i >= targets.length;
      const t = beacon ? beacons[i - targets.length] : targets[i];
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
      this.enemies
        .next()
        .setPosition(px, py)
        .setRotation(a)
        .setAlpha(0.95 - 0.6 * Math.min(1, outside / FAR));
    }
    this.enemies.end();
    this.beacons.end();
    this.glows.end();
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
    const mid = (HEAD + SHAFT) / 2;
    const r = ARROW * 1.3 + 5 * pulse;
    this.glows
      .next()
      .setPosition(tipX - Math.cos(angle) * mid, tipY - Math.sin(angle) * mid)
      .setScale(r / GLOW_R)
      .setTint(YELLOW)
      .setAlpha(0.12 + 0.14 * pulse);
    this.beacons.next().setPosition(tipX, tipY).setRotation(angle);
  }
}
