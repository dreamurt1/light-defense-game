// 박쥐 (어둠의 호스틸, 2026-11-12 새 기획): 보랏빛 눈의 검은 털뭉치로 지그재그로 다가오고, 날아서 장애물을 무시한다.
// 빛을 받아 HP가 0이 되면 움찔하며 되돌아온 모습(bat-true, 2026-11-24 2-C)으로 바뀌어 빛 반대쪽 하늘로 날아가 맵 밖으로 사라진다.
import Phaser from 'phaser';
import { AnimKeys, TextureKeys } from '../../core/TextureKeys';
import type { EnemyDef } from '../../data';
import { BAT } from '../../art/enemies';
import { isArtTexture, texScale } from '../../core/textureRes';
import { Enemy, type ReturnContext } from './Enemy';

// 연출 수치는 제안: 기획서에 없음
const RETREAT_DIST = 260;
const RETREAT_MS = 1200;
/** 화면에서 보이는 크기. 판정 반지름(enemies.json radius)은 그대로 */
const VISUAL_SCALE = 1.05;

export class Bat extends Enemy {
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly underGlow: Phaser.GameObjects.Image;
  private readonly sprite: Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene, def: EnemyDef, x: number, y: number) {
    super(scene, def, x, y);
    this.amplitude = Number(def.behaviorParams?.amplitude ?? 0);
    this.period = Number(def.behaviorParams?.periodSec ?? 1);
    this.shadow = scene.add.image(0, 22, TextureKeys.footShadow).setScale(0.9, 1.1);
    // 어두운 바닥에서도 형체가 보이게 깔리는 옅은 라벤더 빛
    this.underGlow = scene.add
      .image(0, 2, TextureKeys.glow)
      .setTint(0xa89cd9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.32)
      .setScale(64 / 256);
    this.sprite = scene.add
      .sprite(0, 0, TextureKeys.batDark, 0)
      .setOrigin(0.5, BAT.cy / BAT.size)
      .setScale(texScale(TextureKeys.batDark));
    this.sprite.play({ key: AnimKeys.batDarkFly, startFrame: Math.floor(Math.random() * 4) });
    this.add([this.shadow, this.underGlow, this.sprite]);
    this.setScale(VISUAL_SCALE);
  }

  private readonly amplitude: number;
  private readonly period: number;

  protected lateralOffset(t: number): number {
    return this.amplitude * Math.sin((t / this.period) * Math.PI * 2);
  }

  protected animate(): void {
    // 몸이 등불 쪽으로 돌아가도 그림자는 늘 화면 아래쪽에 가로로
    const r = this.rotation;
    this.shadow.setPosition(22 * Math.sin(r), 22 * Math.cos(r)).setRotation(-r);
  }

  /**
   * 생성 그림(2026-11-24 2-C, 오른쪽을 보는 옆모습)은 몸을 돌리지 않고 가로 부호로만 뒤집는다(나방·반딧불이 규칙) —
   * 돌리면 왼쪽으로 갈 때 거꾸로 선다. 코드 그림(폴백)은 지금처럼 가는 쪽으로 몸을 돌린다
   */
  protected override face(dir: Phaser.Math.Vector2): void {
    if (!isArtTexture(TextureKeys.batDark)) {
      super.face(dir);
      return;
    }
    this.setRotation(0);
    if (Math.abs(dir.x) > 0.15) this.sprite.setFlipX(dir.x < 0);
  }

  protected playHit(): void {
    this.sprite.setTint(0xffe0a8);
    this.scene.time.delayedCall(120, () => this.sprite.clearTint());
  }

  protected playReturn(ctx: ReturnContext): void {
    const scene = this.scene;
    this.setRotation(0);
    this.shadow.setVisible(false);
    this.underGlow.setVisible(false);
    // 2026-11-24 2-C: 빛을 받아 되돌아온 모습(bat-true, 같은 실루엣·같은 축척)으로 제자리에서 바꿔 끼우고 날아간다 — 그림만 바뀜
    if (scene.textures.exists(TextureKeys.batTrue) && scene.anims.exists(AnimKeys.batTrueFly)) {
      this.sprite.setTexture(TextureKeys.batTrue, 0).setScale(texScale(TextureKeys.batTrue)).play(AnimKeys.batTrueFly);
    }
    this.sprite.anims.timeScale = 1.8;

    const fx = scene.add.sprite(this.x, this.y, TextureKeys.fxImpact, 0).setDepth(this.depth + 0.1).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: fx, alpha: 0, scale: 1.6, duration: 380, onComplete: () => fx.destroy() });

    // 빛 반대쪽 위로 날아가 사라진다 (맵 밖으로 돌아감)
    const dx = this.x - ctx.from.x;
    const dy = this.y - ctx.from.y;
    const len = Math.hypot(dx, dy) || 1;
    if (isArtTexture(TextureKeys.batTrue) && Math.abs(dx) > 1) this.sprite.setFlipX(dx < 0); // 옆모습 그림: 날아가는 쪽을 보게
    scene.tweens.add({ targets: this, scale: { from: VISUAL_SCALE * 0.85, to: VISUAL_SCALE }, duration: 200, ease: 'Back.easeOut' });
    scene.tweens.add({
      targets: this,
      x: this.x + (dx / len) * RETREAT_DIST,
      y: this.y + (dy / len) * RETREAT_DIST * 0.6 - 120,
      duration: RETREAT_MS,
      ease: 'Sine.easeIn',
    });
    scene.tweens.add({
      targets: this,
      alpha: 0,
      delay: RETREAT_MS * 0.5,
      duration: RETREAT_MS * 0.5,
      onComplete: () => this.destroy(),
    });
  }
}
