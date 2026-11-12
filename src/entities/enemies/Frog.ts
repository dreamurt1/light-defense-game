// 개구리 (잃어버린 빛의 주민, 2026-11-12 새 기획): 빛을 잃어 보랏빛 눈의 검은 털뭉치가 된 채 폴짝폴짝 다가와 공격한다.
// 빛으로 HP가 0이 되면 처치 연출 대신 제 모습(연두빛 개구리)을 되찾고 마을(중앙 광원) 쪽으로 뛰어가며 사라진다 = 구출.
// 그림은 임시 코드 그림(enemies/frog-dark.png, frog-true.png) — ChatGPT 그림이 오면 같은 키로 바뀐다.
import Phaser from 'phaser';
import { AnimKeys, TextureKeys } from '../../core/TextureKeys';
import type { EnemyDef } from '../../data';
import { FROG } from '../../art/enemies';
import { texScale } from '../../core/textureRes';
import { Enemy, type ReturnContext } from './Enemy';

// 연출 수치는 제안: 기획서에 없음
const VISUAL_SCALE = 1.1;
const HOP_HEIGHT = 7;
const RESCUE_RUN = 340;
const RESCUE_MS = 1500;

export class Frog extends Enemy {
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly underGlow: Phaser.GameObjects.Image;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly period: number;

  constructor(scene: Phaser.Scene, def: EnemyDef, x: number, y: number) {
    super(scene, def, x, y);
    this.period = Number(def.behaviorParams?.periodSec ?? 0.7);
    this.shadow = scene.add.image(0, 16, TextureKeys.footShadow).setScale(0.8, 0.9);
    this.underGlow = scene.add.image(0, 4, TextureKeys.glow).setTint(0xa89cd9).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3).setScale(60 / 256);
    this.sprite = scene.add
      .sprite(0, 0, TextureKeys.frogDark, 0)
      .setOrigin(0.5, FROG.cy / FROG.size)
      .setScale(texScale(TextureKeys.frogDark));
    this.sprite.play({ key: AnimKeys.frogDarkHop, startFrame: Math.floor(Math.random() * 2) });
    this.add([this.shadow, this.underGlow, this.sprite]);
    this.setScale(VISUAL_SCALE);
  }

  protected lateralOffset(): number {
    return 0;
  }

  protected animate(): void {
    // 폴짝: 몸만 위아래로, 그림자는 바닥에
    const p = (this.age / this.period) % 1;
    this.sprite.y = -Math.abs(Math.sin(p * Math.PI)) * HOP_HEIGHT;
  }

  /** 걷는 적은 몸을 돌리지 않고 좌우만 본다 */
  protected override face(dir: Phaser.Math.Vector2): void {
    if (Math.abs(dir.x) > 0.15) this.sprite.setFlipX(dir.x < 0);
  }

  protected playHit(): void {
    this.sprite.setTint(0xffe0a8);
    this.scene.time.delayedCall(120, () => this.sprite.clearTint());
  }

  protected playReturn(ctx: ReturnContext): void {
    const scene = this.scene;
    this.sprite.play(AnimKeys.frogTrueHop).setScale(texScale(TextureKeys.frogTrue));
    this.underGlow.setTint(0xffd27a).setAlpha(0.45);

    const fx = scene.add.sprite(this.x, this.y, TextureKeys.fxReturn, 0).setDepth(this.depth + 0.1).setBlendMode(Phaser.BlendModes.ADD);
    fx.play(AnimKeys.fxReturn);
    fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());

    // 제 모습으로 돌아와 마을(중앙 광원) 쪽으로 뛰어간다
    const dx = ctx.home.x - this.x;
    const dy = ctx.home.y - this.y;
    const len = Math.hypot(dx, dy) || 1;
    const run = Math.min(RESCUE_RUN, len);
    if (Math.abs(dx) > 1) this.sprite.setFlipX(dx < 0);
    scene.tweens.add({ targets: this, scale: { from: VISUAL_SCALE * 1.25, to: VISUAL_SCALE }, duration: 260, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: this, x: this.x + (dx / len) * run, y: this.y + (dy / len) * run, duration: RESCUE_MS, delay: 250, ease: 'Sine.easeIn' });
    scene.tweens.add({ targets: this, alpha: 0, delay: RESCUE_MS * 0.7, duration: RESCUE_MS * 0.45, onComplete: () => this.destroy() });
    // 뛰어가는 동안 폴짝폴짝 (age가 계속 흐르도록 step 대신 직접)
    scene.tweens.add({ targets: this.sprite, y: -HOP_HEIGHT * 1.4, duration: 180, yoyo: true, repeat: 5, delay: 250, ease: 'Sine.easeOut' });
  }
}
