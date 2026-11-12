// 루미 시트 VFX로 만든 연출 (2026-11-04): 빛을 보낼 때 별이 원뿔 안으로 날아가고('공격 효과 — 발사 예시 원뿔형'),
// 이웃이 맞으면 반짝 터지고, 등불이 맞으면 아픈 별이 튀고, 새 밤 시작엔 빛기둥, 잠들면 z가 떠오른다.
// 판정은 하지 않는다(빛 판정은 LightSystem). 수치는 제안: 기획서에 없음
import Phaser from 'phaser';
import { TextureKeys } from '../core/TextureKeys';
import { texScale } from '../core/textureRes';
import type { Vec } from '../systems/fan';
import { prefersReducedMotion } from '../ui/dom';

const STARS = 6;
const STAR_MS = 420;

export class LightFx {
  constructor(private readonly scene: Phaser.Scene) {}

  private sprite(key: string, x: number, y: number, depth: number, scale: number): Phaser.GameObjects.Image {
    return this.scene.add
      .image(x, y, key)
      .setScale(scale * texScale(key))
      .setDepth(depth)
      .setBlendMode(Phaser.BlendModes.ADD);
  }

  /** 빛 발사: 등불에서 조준 방향 원뿔 안으로 별이 사거리 끝까지 날아간다 */
  shoot(origin: Vec, angle: number, range: number, fanDeg: number): void {
    const half = (fanDeg * Math.PI) / 360;
    const scene = this.scene;
    // 루미 앞의 휘두름 궤적
    const swing = this.sprite(TextureKeys.fxSwing, origin.x + Math.cos(angle) * 22, origin.y + Math.sin(angle) * 22, 4010, 0.9).setRotation(angle);
    scene.tweens.add({ targets: swing, alpha: 0, scale: swing.scale * 1.3, duration: 220, ease: 'Quad.easeOut', onComplete: () => swing.destroy() });
    for (let i = 0; i < STARS; i++) {
      const a = angle + (((i + 0.5) / STARS) * 2 - 1) * half * 0.8 + (Math.random() - 0.5) * 0.08;
      const dist = range * (0.7 + Math.random() * 0.3);
      const star = this.sprite(TextureKeys.fxStar, origin.x, origin.y, 4020, 0.55 + Math.random() * 0.2).setRotation(a);
      scene.tweens.add({
        targets: star,
        x: origin.x + Math.cos(a) * dist,
        y: origin.y + Math.sin(a) * dist,
        duration: STAR_MS,
        delay: i * 18,
        ease: 'Cubic.easeOut',
      });
      scene.tweens.add({ targets: star, alpha: 0, duration: STAR_MS * 0.35, delay: STAR_MS * 0.7 + i * 18, onComplete: () => star.destroy() });
    }
  }

  /** 이웃이 빛에 맞음 */
  impact(x: number, y: number): void {
    const fx = this.sprite(TextureKeys.fxImpact, x, y, 4030, 0.35);
    this.scene.tweens.add({ targets: fx, scale: fx.scale * 2.1, alpha: 0, duration: 300, ease: 'Quad.easeOut', onComplete: () => fx.destroy() });
  }

  /** 등불이 맞음 (루미 위에 아픈 별) */
  hurt(x: number, y: number): void {
    const fx = this.sprite(TextureKeys.fxHurt, x, y - 42, 4030, 0.5);
    this.scene.tweens.add({ targets: fx, scale: fx.scale * 1.8, alpha: 0, duration: 320, ease: 'Quad.easeOut', onComplete: () => fx.destroy() });
  }

  /** 새 밤 시작: 발밑에서 빛기둥 */
  respawn(x: number, feetY: number): void {
    const fx = this.sprite(TextureKeys.fxRespawn, x, feetY, 4030, 1.2).setOrigin(0.5, 0.9);
    this.scene.tweens.add({ targets: fx, alpha: 0, scaleY: fx.scaleY * 1.4, duration: 750, delay: 150, ease: 'Sine.easeIn', onComplete: () => fx.destroy() });
  }

  /** 잠들었을 때 떠오르는 z (등불이 꺼진 밤) */
  sleep(x: number, y: number): void {
    if (prefersReducedMotion()) return;
    [0, 1, 2].forEach((i) => {
      const z = this.scene.add
        .text(x + 22 + i * 10, y - 34, 'z', { fontFamily: 'Pretendard Variable, sans-serif', fontSize: `${18 + i * 5}px`, fontStyle: '700', color: '#F6F1E7' })
        .setOrigin(0.5)
        .setDepth(4040)
        .setAlpha(0);
      this.scene.tweens.add({ targets: z, alpha: 0.9, y: z.y - 26, duration: 900, delay: 400 + i * 380, ease: 'Sine.easeOut', yoyo: false, onComplete: () => z.destroy() });
    });
  }
}
