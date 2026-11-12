// 파닥(박쥐): 보랏빛 눈의 검은 털뭉치로 지그재그로 다가오고, 빛을 받으면 라벤더색 얼굴을 되찾아 둥실 날아간다.
// 그림은 에셋(enemies/bat-dark.png, bat-true.png)의 날갯짓 애니메이션, 되돌림 순간은 effects/fx-return.png.
import Phaser from 'phaser';
import { AnimKeys, TextureKeys } from '../../core/TextureKeys';
import type { EnemyDef } from '../../data';
import type { Vec } from '../../systems/fan';
import { BAT } from '../../art/enemies';
import { texScale } from '../../core/textureRes';
import { Enemy } from './Enemy';

// 연출 수치는 제안: 기획서에 없음
const RETURN_RISE = 130;
const RETURN_MS = 1100;
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

  protected playHit(): void {
    this.sprite.setTint(0xffe0a8);
    this.scene.time.delayedCall(120, () => this.sprite.clearTint());
  }

  protected playReturn(lantern: Vec): void {
    const scene = this.scene;
    this.sprite.play(AnimKeys.batTrueFly).setScale(texScale(TextureKeys.batTrue));
    this.setRotation(0);
    this.shadow.setVisible(false);
    this.underGlow.setVisible(false);

    const fx = scene.add.sprite(this.x, this.y, TextureKeys.fxReturn, 0).setDepth(this.depth + 0.1).setBlendMode(Phaser.BlendModes.ADD);
    fx.play(AnimKeys.fxReturn);
    fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());

    // 제 모습으로 돌아와 등불 반대쪽 하늘로 둥실 날아간다
    const away = Math.sign(this.x - lantern.x) || 1;
    scene.tweens.add({ targets: this, scale: { from: VISUAL_SCALE * 1.25, to: VISUAL_SCALE }, duration: 260, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: this, x: this.x + away * 60, y: this.y - RETURN_RISE, duration: RETURN_MS, ease: 'Sine.easeInOut' });
    scene.tweens.add({
      targets: this,
      alpha: 0,
      delay: RETURN_MS * 0.65,
      duration: RETURN_MS * 0.35,
      onComplete: () => this.destroy(),
    });
  }
}
