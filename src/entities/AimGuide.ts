// 공격 범위 표시 (독립 벡터 그래픽 — src/art/vectors.ts의 aim-cone.svg · aim-circle.svg).
//  - 조준: 빛 스틱(PC는 마우스)을 끄는 동안 루미의 중심에서 조준 방향으로 60° 원뿔을 바닥에 편다(2026-11-06: 등불 → 루미 중심,
//    브롤스타즈처럼 범위 표시는 땅 위·캐릭터와 물체 아래). 끄는 거리에 따라 반지름 길이만 바뀌고
//    각도·색은 그대로다(2026-11-06 라이언 지시: 원뿔을 통째로 늘이거나 줄이지 않는다). 면은 밝은 노랑 50%, 선 없음.
//    빛이 대기 중이면 같은 노랑을 더 옅게
//  - 대광원: 원형 범위가 등불에서 퍼져 나간다
import Phaser from 'phaser';
import { TextureKeys } from '../core/TextureKeys';
import { AIM_CIRCLE, AIM_CONE_FILL } from '../art/vectors';
import type { Vec } from '../systems/fan';

/** 빛이 대기 중일 때 원뿔 면의 불투명도 (제안: 기획서에 없음) */
const WAIT_ALPHA = 0.22;
/** 원뿔을 구워 두는 반지름 (최대 사거리 390보다 커서 늘 줄여 쓴다) */
const CONE_R = 512;
/** 원뿔 깊이: 마을 바닥(-1000~-860) 위, 루미·이웃·소품(깊이 = y ≥ 0) 아래 */
const CONE_DEPTH = -800;

export class AimGuide {
  private readonly cone: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Image;
  private readonly half: number;
  /** 마지막으로 그린 반지름 (확인용) */
  readonly drawn = { range: -1 };

  constructor(
    private readonly scene: Phaser.Scene,
    fanDeg: number,
  ) {
    this.half = (fanDeg * Math.PI) / 360;
    // 2026-11-06 버벅임 보완: 매 프레임 부채꼴을 다시 쪼개 그리지 않고, 반지름 CONE_R로 한 번 구운 그림을 늘인다.
    // 선이 없는 면뿐이라 늘여도 각도·색은 그대로이고 반지름 길이만 바뀐다
    this.cone = scene.add.image(0, 0, coneTexture(scene, this.half)).setOrigin(0, 0.5).setDepth(CONE_DEPTH).setVisible(false);
    this.ring = scene.add.image(0, 0, TextureKeys.aimCircle).setDepth(3991).setVisible(false);
  }

  /** angle이 null이면 숨긴다. range = 원뿔 반지름(끄는 거리에 비례) */
  draw(origin: Vec, angle: number | null, range: number, ready: boolean): void {
    if (angle === null) {
      this.cone.setVisible(false);
      return;
    }
    this.drawn.range = range;
    this.cone
      .setVisible(true)
      .setPosition(origin.x, origin.y)
      .setRotation(angle)
      .setScale(range / CONE_R)
      .setAlpha(ready ? AIM_CONE_FILL.alpha : WAIT_ALPHA);
  }

  hide(): void {
    this.cone.setVisible(false);
  }

  /** 대광원: 원형 범위가 radius까지 퍼지며 옅어진다 */
  burst(origin: Vec, radius: number, durationMs: number): void {
    const s = radius / AIM_CIRCLE.radius;
    this.ring.setVisible(true).setPosition(origin.x, origin.y).setScale(s * 0.25).setAlpha(1);
    this.scene.tweens.add({
      targets: this.ring,
      scale: s,
      alpha: 0,
      duration: durationMs,
      ease: 'Cubic.easeOut',
      onComplete: () => this.ring.setVisible(false),
    });
  }
}

/** 60° 부채꼴 면(밝은 노랑, 불투명 — 투명도는 그림에 준다)을 한 번 굽는다. 꼭짓점 = 왼쪽 가운데 */
function coneTexture(scene: Phaser.Scene, half: number): string {
  const key = 'aim-cone-fill';
  if (scene.textures.exists(key)) return key;
  const h = Math.ceil(CONE_R * Math.sin(half)) * 2 + 4;
  const g = scene.make.graphics({}, false);
  g.fillStyle(AIM_CONE_FILL.color, 1).beginPath().slice(0, h / 2, CONE_R, -half, half, false).fillPath();
  g.generateTexture(key, CONE_R + 2, h);
  g.destroy();
  return key;
}
