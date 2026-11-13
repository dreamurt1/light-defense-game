// 데이터로 움직이는 적·주민 (2026-11-13 컨셉 시연판, Phase 3). 박쥐·개구리 밖의 모든 종을 이 클래스 하나로 만든다.
//  - 호스틸(웨어울프·뱀파이어): 역할대로 목표를 고르고(Enemy), HP 0이면 맵 밖으로 물러난다
//  - 잃어버린 주민(고슴도치·레서판다): HP 0이면 제 모습으로 돌아와 중앙 쪽으로 뛰어가며 사라진다 = 구출
//  - 패시브(올빼미·나방·반딧불이): 공격하지 않고 떠돌며 빛을 피한다. 곁을 그냥 지나가 주면 자비(PlayScene + systems/mercy).
//    빛에 맞으면 화가 나서(분노) 눈이 보랏빛이 되고 주인공을 쫓아 작은 피해를 준다. 다시 맞으면 점수 없이 물러난다
//  - 빛을 잃은 친구(토리·도토): 가만히 도움을 기다린다. 되찾으면 해금(friend:rescued)
// 그림은 Claude 임시 코드 그림(src/art/creatures.ts, 친구는 초상).
import Phaser from 'phaser';
import { TextureKeys } from '../../core/TextureKeys';
import { texScale } from '../../core/textureRes';
import { GameData, type EnemyDef } from '../../data';
import type { Rng } from '../../core/rng';
import { CREATURES, creatureAnim, creatureKey, isCreature, type CreatureArt } from '../../art/creatures';
import { Enemy, type EnemyContext, type EnemyStep, type ReturnContext } from './Enemy';
import { sayAbove } from '../Bubble';

// 수치 원본은 game.json passive(피하기·분노), 아래는 연출 값
const P = GameData.game.passive;
const RUN_AWAY = 320;
const RUN_MS = 1400;
/** 화난 패시브의 눈빛 */
const ANGRY_TINT = 0xc8b8ff;
/** 패시브 대사 (CLAUDE.md 2절) */
export const PASSIVE_LINES = ['너무 밝아..', '싸우기 싫어..', '저 빛이 무서워', '우리도 여기서 살고 있어'];
const TALK_EVERY = 6.5;
const FRIEND_SIZE = 92;

export class Creature extends Enemy {
  /** 빛에 맞아 화남 (패시브) */
  upset = false;
  /** 자비를 주고 떠나는 중 (패시브) */
  leaving = false;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly underGlow: Phaser.GameObjects.Image;
  private readonly art: CreatureArt | null;
  private readonly amplitude: number;
  private readonly period: number;
  /** 첫 대사까지: 생성 때 seed 난수로 정한다 */
  private talkLeft: number;
  private wanderTo: { x: number; y: number } | null = null;

  /** @param rng 대사 타이밍·대사 고르기·첫 동작 칸 (판 seed에서, 같은 seed면 같은 밤) */
  constructor(scene: Phaser.Scene, def: EnemyDef, x: number, y: number, private readonly rng: Rng) {
    super(scene, def, x, y);
    this.talkLeft = rng.range(1.2, 3.2);
    this.amplitude = Number(def.behaviorParams?.amplitude ?? 0);
    this.period = Number(def.behaviorParams?.periodSec ?? 1);
    this.art = isCreature(def.id) ? CREATURES[def.id] : null;
    this.shadow = scene.add.image(0, 4, TextureKeys.footShadow).setScale(1, 1.1);
    const glowTint = def.kind === 'passive' ? 0x9ed9b5 : def.friend ? 0xffc857 : 0xa89cd9;
    this.underGlow = scene.add.image(0, -10, TextureKeys.glow).setTint(glowTint).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3).setScale(70 / 256);
    if (this.art && isCreature(def.id)) {
      const look = def.kind === 'passive' ? 'plain' : 'dark';
      const key = creatureKey(def.id, look);
      this.sprite = scene.add.sprite(0, 0, key, 0).setOrigin(0.5, this.art.cy / this.art.size).setScale(texScale(key));
      const anim = creatureAnim(def.id, look);
      if (scene.anims.exists(anim)) this.sprite.play({ key: anim, startFrame: rng.int(0, 1) });
      if (this.art.flies) this.shadow.setPosition(0, this.art.size * 0.35);
    } else {
      // 빛을 잃은 친구: 초상 그림을 작게 (임시)
      const key = `portrait-${def.friend ?? 'tori'}-lost`;
      this.sprite = scene.add.sprite(0, 0, key, 0).setOrigin(0.5, 0.95);
      this.sprite.setScale((FRIEND_SIZE / Math.max(1, this.sprite.width)) * 1);
      this.underGlow.setScale(130 / 256).setAlpha(0.45);
    }
    this.add([this.shadow, this.underGlow, this.sprite]);
  }

  get passive(): boolean {
    return this.def.kind === 'passive';
  }

  /** 자비를 줄 수 있는 상태 */
  get calm(): boolean {
    return this.passive && !this.upset && !this.leaving && this.targetable;
  }

  protected override get attackDamage(): number {
    return this.upset ? P.angryDamage : this.def.damage;
  }

  protected lateralOffset(t: number): number {
    return this.amplitude ? this.amplitude * Math.sin((t / this.period) * Math.PI * 2) : 0;
  }

  protected animate(): void {
    const flies = this.art?.flies ?? false;
    const bob = flies ? Math.sin(this.age * 5) * 4 : -Math.abs(Math.sin(this.age * 6)) * 2;
    this.sprite.y = bob;
  }

  protected override face(dir: Phaser.Math.Vector2): void {
    if (Math.abs(dir.x) > 0.15) this.sprite.setFlipX(dir.x < 0);
  }

  protected playHit(): void {
    this.sprite.setTint(0xffe0a8);
    this.scene.time.delayedCall(120, () => (this.upset ? this.sprite.setTint(ANGRY_TINT) : this.sprite.clearTint()));
  }

  override hitByLight(power: number, knockback: number, stunSec: number, ctx: ReturnContext): boolean {
    // 차분한 패시브는 맞아도 물러나지 않고 화가 난다 (분노)
    if (this.calm && power > 0) {
      this.upset = true;
      this.playerOnly = true;
      this.sprite.setTint(ANGRY_TINT);
      this.underGlow.setTint(0xa89cd9);
      sayAbove(this.scene, this, '아야.. 왜 그래');
      return super.hitByLight(0, knockback, stunSec, ctx);
    }
    return super.hitByLight(power, knockback, stunSec, ctx);
  }

  override step(dt: number, ctx: EnemyContext): EnemyStep {
    if (this.def.behavior === 'idle') {
      this.age += dt;
      this.underGlow.setAlpha(0.35 + 0.15 * Math.sin(this.age * 3));
      this.talk(dt, ctx, ['도와줘..', '여기 있어..']);
      return { hit: null };
    }
    if (!this.calm || this.mode === 'stunned') {
      if (this.upset) return super.step(dt, { ...ctx, speedMultiplier: ctx.speedMultiplier * P.angrySpeedMultiplier });
      if (!this.leaving) return super.step(dt, ctx);
      return { hit: null };
    }
    // 차분한 패시브: 천천히 떠돌고, 루미가 너무 가까우면 살짝 피한다. 공격하지 않는다
    this.age += dt;
    this.animate();
    this.talk(dt, ctx, PASSIVE_LINES);
    const p = ctx.player;
    let vx = 0;
    let vy = 0;
    let speed = this.def.speed * ctx.speedMultiplier;
    if (p && Math.hypot(p.x - this.x, p.y - this.y) < P.shyDist) {
      vx = this.x - p.x;
      vy = this.y - p.y;
      speed *= P.shySpeedMultiplier;
    } else {
      if (!this.wanderTo || Math.hypot(this.wanderTo.x - this.base.x, this.wanderTo.y - this.base.y) < 24) this.wanderTo = ctx.roam(this.base);
      vx = this.wanderTo.x - this.base.x;
      vy = this.wanderTo.y - this.base.y;
    }
    const len = Math.hypot(vx, vy) || 1;
    this.base.x += (vx / len) * speed * dt;
    this.base.y += (vy / len) * speed * dt;
    this.setPosition(this.base.x, this.base.y);
    if (Math.abs(vx) > 1) this.sprite.setFlipX(vx < 0);
    this.setDepth(this.y);
    return { hit: null };
  }

  /** 자비: 고마워하며 마을 밖으로 천천히 떠난다 */
  thank(): void {
    this.leaving = true;
    this.mode = 'returning';
    sayAbove(this.scene, this, '고마워..');
    const scene = this.scene;
    scene.tweens.add({ targets: this, y: this.y - 40, alpha: 0, delay: 1400, duration: 1200, onComplete: () => this.destroy() });
  }

  private talk(dt: number, ctx: EnemyContext, lines: readonly string[]): void {
    this.talkLeft -= dt;
    if (this.talkLeft > 0) return;
    this.talkLeft = TALK_EVERY + this.rng.range(0, 3);
    const p = ctx.player;
    if (!p || Math.hypot(p.x - this.x, p.y - this.y) > 520) return;
    sayAbove(this.scene, this, this.rng.pick(lines), -((this.art?.size ?? FRIEND_SIZE) * 0.9));
  }

  protected playReturn(ctx: ReturnContext): void {
    const scene = this.scene;
    this.sprite.clearTint();
    const kind = this.def.kind;
    const fx = scene.add.sprite(this.x, this.y, TextureKeys.fxReturn, 0).setDepth(this.depth + 0.1).setBlendMode(Phaser.BlendModes.ADD);
    if (scene.anims.exists('fx-return')) fx.play('fx-return');
    fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
    scene.time.delayedCall(900, () => fx.active && fx.destroy());

    let tx: number;
    let ty: number;
    if (kind === 'lost') {
      // 제 모습으로 돌아와 중앙 광원 쪽으로 뛰어간다
      if (this.def.friend) {
        const key = `portrait-${this.def.friend}`;
        this.sprite.setTexture(key, 0).setScale(FRIEND_SIZE / Math.max(1, this.sprite.width));
      } else if (this.art && isCreature(this.def.id)) {
        const key = creatureKey(this.def.id, 'true');
        if (scene.textures.exists(key)) {
          this.sprite.setTexture(key, 0).setScale(texScale(key));
          const anim = creatureAnim(this.def.id, 'true');
          if (scene.anims.exists(anim)) this.sprite.play(anim);
        }
      }
      this.underGlow.setTint(0xffd27a).setAlpha(0.5);
      tx = ctx.home.x - this.x;
      ty = ctx.home.y - this.y;
    } else {
      // 빛 반대쪽으로 물러난다 (맵 밖으로)
      tx = this.x - ctx.from.x;
      ty = this.y - ctx.from.y;
    }
    const len = Math.hypot(tx, ty) || 1;
    const run = Math.min(RUN_AWAY, kind === 'lost' ? len : RUN_AWAY);
    if (Math.abs(tx) > 1) this.sprite.setFlipX(tx < 0);
    scene.tweens.add({ targets: this, x: this.x + (tx / len) * run, y: this.y + (ty / len) * run, duration: RUN_MS, delay: 200, ease: 'Sine.easeIn' });
    scene.tweens.add({ targets: this.sprite, y: -8, duration: 160, yoyo: true, repeat: 5, delay: 200 });
    scene.tweens.add({ targets: this, alpha: 0, delay: RUN_MS * 0.7, duration: RUN_MS * 0.45, onComplete: () => this.destroy() });
  }
}
