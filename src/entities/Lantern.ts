// 등불: HP와 그 시각 표현(놋쇠 등불, 일렁이는 불씨, 글로우 크기, 저HP 깜빡임, 빛 대기 링).
// 2026-11-04부터 등불지기가 손에 들고 다닌다: 매 프레임 setPosition으로 손 위치를 따라간다.
// 시너지 게이지는 레퍼런스처럼 아래 HUD에 있다(Hud.ts).
import Phaser from 'phaser';
import { TextureKeys } from '../core/TextureKeys';
import type { GameConfig } from '../data';
import { LANTERN, LANTERN_FRAME } from '../art/objects';
import { texScale } from '../core/textureRes';

type LanternCfg = GameConfig['lantern'];

/** 저HP 깜빡임: 초당 2회, 알파 0.85~1.0 (스킬 gameplay-systems.md) */
const LOW_HP_FLICKER_HZ = 2;
const COOLDOWN_RING_RADIUS = 24;
/** 손에 드는 크기 (바닥에 놓던 등불의 0.55배, 제안: 기획서에 없음) */
const CARRY_SCALE = 0.55;

export class Lantern {
  hp: number;
  /** 유리(불씨) 위치 = 빛의 원점, 이웃이 노리는 점. 같은 객체를 VillageStage·LightSystem이 함께 읽는다 */
  readonly pos: { x: number; y: number };
  private readonly body: Phaser.GameObjects.Image;
  private readonly heart: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Graphics;
  private t = 0;
  private out = false;
  /** 꺼지는 연출 동안 내려가는 밝기 */
  brightness = 1;
  /** 풀숲에 숨었을 때의 불투명도 (1 = 그대로) */
  veil = 1;

  constructor(
    scene: Phaser.Scene,
    private readonly cfg: LanternCfg,
  ) {
    this.hp = cfg.maxHp;
    const { x, y } = cfg;
    this.pos = { x, y };
    const { h, glassY } = LANTERN;
    this.body = scene.add
      .image(x, y, TextureKeys.lantern, LANTERN_FRAME.lit)
      .setOrigin(0.5, glassY / h)
      .setScale(CARRY_SCALE * texScale(TextureKeys.lantern))
      .setDepth(y);
    this.heart = scene.add
      .image(x, y + 2, TextureKeys.glow)
      .setTint(0xfff1c9)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(20 / 256)
      .setDepth(y + 0.1);
    this.ring = scene.add.graphics().setDepth(y + 0.2);
  }

  /** 손 위치로 옮긴다. depth는 들고 있는 등불지기보다 살짝 앞 */
  setPosition(x: number, y: number, depth: number): void {
    this.pos.x = x;
    this.pos.y = y;
    this.body.setPosition(x, y).setDepth(depth);
    this.heart.setPosition(x, y + 1).setDepth(depth + 0.1);
    this.ring.setDepth(depth + 0.2);
  }

  get maxHp(): number {
    return this.cfg.maxHp;
  }

  get ratio(): number {
    return this.hp / this.cfg.maxHp;
  }

  get isLow(): boolean {
    return this.ratio <= this.cfg.lowHpRatio;
  }

  get isOut(): boolean {
    return this.hp <= 0;
  }

  /** 글로우 반경 = glowMin + (glowMax − glowMin) × hp/maxHp */
  get glowRadius(): number {
    return (this.cfg.glowMin + (this.cfg.glowMax - this.cfg.glowMin) * Math.max(0, this.ratio)) * this.brightness;
  }

  /** 저HP일 때 깜빡이는 알파 */
  get flicker(): number {
    if (!this.isLow || this.out) return 1;
    return 0.925 + 0.075 * Math.sin(this.t * Math.PI * 2 * LOW_HP_FLICKER_HZ);
  }

  damage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
  }

  heal(amount: number): void {
    this.hp = Math.min(this.cfg.maxHp, this.hp + amount);
  }

  /** 불이 꺼진다: 유리가 식고 불씨 하나만 남는다 */
  extinguish(scene: Phaser.Scene, durationSec: number): void {
    this.out = true;
    this.ring.clear();
    const ms = durationSec * 1000;
    scene.tweens.add({ targets: this, brightness: 0.25, duration: ms, ease: 'Sine.easeIn' });
    scene.tweens.addCounter({
      from: 255,
      to: 110,
      duration: ms,
      onUpdate: (tw) => {
        const v = Math.round(tw.getValue() ?? 110);
        this.body.setTint(Phaser.Display.Color.GetColor(v, Math.round(v * 0.85), Math.round(v * 0.95)));
      },
    });
    scene.tweens.add({
      targets: this.heart,
      scale: 8 / 256,
      duration: ms,
      ease: 'Sine.easeIn',
      onComplete: () => this.body.clearTint().setFrame(LANTERN_FRAME.out),
    });
    this.heart.setTint(0xff8c5a);
  }

  /** @param cooldown 남은 빛 대기 비율 0~1 */
  update(dt: number, cooldown: number): void {
    this.t += dt;
    if (this.out) return;
    const a = this.flicker * this.veil;
    this.body.setFrame(this.isLow ? LANTERN_FRAME.low : LANTERN_FRAME.lit).setAlpha(a);
    this.heart.setAlpha(a).setScale((18 + 3 * Math.sin(this.t * 9) + 1.5 * Math.sin(this.t * 23)) / 256);

    const g = this.ring;
    g.clear();
    if (cooldown > 0) {
      const { x, y } = this.pos;
      const top = -Math.PI / 2;
      g.lineStyle(2, 0xffe0a8, 0.8);
      g.beginPath();
      g.arc(x, y, COOLDOWN_RING_RADIUS, top, top + Math.PI * 2 * cooldown, false);
      g.strokePath();
    }
  }
}
