// 데이터로 움직이는 적·주민 (2026-11-13 컨셉 시연판, Phase 3). 박쥐·개구리 밖의 모든 종을 이 클래스 하나로 만든다.
//  - 호스틸(웨어울프·뱀파이어): 역할대로 목표를 고르고(Enemy), HP 0이면 맵 밖으로 물러난다
//  - 잃어버린 주민(고슴도치·레서판다): HP 0이면 제 모습으로 돌아와 중앙 쪽으로 뛰어가며 사라진다 = 구출
//  - 패시브(올빼미·나방·반딧불이) = 어둠의 행렬 (2026-11-23 밤 나들이 v3, systems/parade.ts): 맵 한 변에서 맞은편으로 줄지어 지나간다.
//    빛을 맞으면 웅크렸다(말풍선 '싸우기 싫어..' → '우린 지나가는 거야' → '제발..') 진행 방향으로 종종걸음 도망 — 반격·추적 없음.
//    세 번 맞으면 맵 밖으로 돌려보내진다. 곁을 그냥 지나가 주면 자비(고마워하고 계속 걸어감). 길이 없는 패시브(튜토리얼)는 떠돌며 살짝 피한다.
//    옛 '분노'(쫓아와 들이받음)는 없앴다
//  - 빛을 잃은 친구(토리·도토): 가만히 도움을 기다린다. 되찾으면 해금(friend:rescued)
// 그림은 Claude 임시 코드 그림(src/art/creatures.ts, 친구는 초상).
import Phaser from 'phaser';
import { TextureKeys } from '../../core/TextureKeys';
import { isArtTexture, texScale } from '../../core/textureRes';
import { GameData, type EnemyDef } from '../../data';
import type { Rng } from '../../core/rng';
import { CREATURES, creatureAnim, creatureKey, isCreature, paradeFleeAnim, paradePoseKey, type CreatureArt, type CreatureLook } from '../../art/creatures';
import { critterView, type CritterView } from '../../systems/critterView';
import { Enemy, type EnemyContext, type EnemyStep, type ReturnContext } from './Enemy';
import { ParadeState, type ParadeMode } from '../../systems/parade';
import type { Vec } from '../../systems/fan';
import { sayAbove } from '../Bubble';

// 수치 원본은 game.json passive(길 없는 패시브의 피하기)·enemies.json(행렬), 아래는 연출 값
const P = GameData.game.passive;
const RUN_AWAY = 320;
const RUN_MS = 1400;
/** 패시브 대사 (CLAUDE.md 2절) */
export const PASSIVE_LINES = ['너무 밝아..', '싸우기 싫어..', '저 빛이 무서워', '우리도 여기서 살고 있어'];
const TALK_EVERY = 6.5;
const FRIEND_SIZE = 92;

export class Creature extends Enemy {
  /** 자비를 주고 떠나는 중 (길 없는 패시브) */
  leaving = false;
  /** 어둠의 행렬 (패시브): 웅크림·도망·세 번이면 돌려보냄 */
  readonly parade: ParadeState | null;
  /** 행렬이 갈 곳(맵 밖). 없으면 그 자리 둘레를 떠돈다(튜토리얼·트라이얼) */
  route: Vec | null = null;
  /** 자비를 이미 줌 — 행렬은 고마워하고 계속 걸어간다 */
  thanked = false;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly underGlow: Phaser.GameObjects.Image;
  private readonly art: CreatureArt | null;
  private readonly amplitude: number;
  private readonly period: number;
  /** 첫 대사까지: 생성 때 seed 난수로 정한다 */
  private talkLeft: number;
  private wanderTo: { x: number; y: number } | null = null;
  /** 지금 모습 (걷는 종은 옆·앞·뒤, 2026-11-13) */
  private view: CritterView = 'side';
  /** 방어(고슴도치 필살기)를 다시 쓸 수 있을 때까지 / 눈 가림 말풍선을 이미 했는지 (2026-11-18) */
  private guardLeft = 0;
  private eyesSaid = false;
  private look: CreatureLook = 'dark';
  /** 행렬 자세(웅크림·도망)와, 그 생성 그림을 지금 끼우고 있는지 */
  private poseMode: ParadeMode = 'walk';
  private poseArt = false;

  /** @param rng 대사 타이밍·대사 고르기·첫 동작 칸 (판 seed에서, 같은 seed면 같은 밤) */
  constructor(scene: Phaser.Scene, def: EnemyDef, x: number, y: number, private readonly rng: Rng) {
    super(scene, def, x, y);
    this.talkLeft = rng.range(1.2, 3.2);
    this.amplitude = Number(def.behaviorParams?.amplitude ?? 0);
    this.period = Number(def.behaviorParams?.periodSec ?? 1);
    this.parade =
      def.kind === 'passive' ? new ParadeState({ hitsToBanish: def.hitsToBanish ?? 3, cowerSec: def.cowerSec ?? 0.6, fleeSec: def.fleeSec ?? 2, fleeMultiplier: def.fleeMultiplier ?? 1.5 }) : null;
    this.art = isCreature(def.id) ? CREATURES[def.id] : null;
    this.shadow = scene.add.image(0, 4, TextureKeys.footShadow).setScale(1, 1.1);
    const glowTint = def.kind === 'passive' ? 0x9ed9b5 : def.friend ? 0xffc857 : 0xa89cd9;
    this.underGlow = scene.add.image(0, -10, TextureKeys.glow).setTint(glowTint).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3).setScale(70 / 256);
    if (this.art && isCreature(def.id)) {
      const look: CreatureLook = def.kind === 'passive' ? 'plain' : 'dark';
      this.look = look;
      const key = creatureKey(def.id, look);
      this.sprite = scene.add.sprite(0, 0, key, 0).setOrigin(0.5, this.art.cy / this.art.size).setScale(texScale(key));
      const anim = creatureAnim(def.id, look);
      if (scene.anims.exists(anim)) this.sprite.play({ key: anim, startFrame: rng.int(0, 1) });
      if (this.art.flies) this.shadow.setPosition(0, this.art.size * 0.35);
    } else {
      // 빛을 잃은 친구: 초상 그림을 작게 (임시)
      const key = `friend-${def.friend ?? 'tori'}-lost`; // 컨셉 그림 실루엣 (2026-11-24)
      this.sprite = scene.add.sprite(0, 0, key, 0).setOrigin(0.5, 0.95);
      this.sprite.setScale((FRIEND_SIZE / Math.max(1, this.sprite.width)) * 1);
      this.underGlow.setScale(130 / 256).setAlpha(0.45);
    }
    this.add([this.shadow, this.underGlow, this.sprite]);
  }

  get passive(): boolean {
    return this.def.kind === 'passive';
  }

  /** 빛을 한 번이라도 맞음 (자비를 주지 않음) */
  get upset(): boolean {
    return (this.parade?.hits ?? 0) > 0;
  }

  /** 자비를 줄 수 있는 상태 */
  get calm(): boolean {
    return this.passive && !this.upset && !this.thanked && !this.leaving && this.targetable;
  }

  protected lateralOffset(t: number): number {
    return this.amplitude ? this.amplitude * Math.sin((t / this.period) * Math.PI * 2) : 0;
  }

  protected animate(): void {
    const flies = this.art?.flies ?? false;
    // 걷는 종은 그림 안에 걸음 들썩임이 있으므로 코드로는 들썩이지 않는다 (2026-11-13 새 걸음 그림)
    this.sprite.y = flies ? Math.sin(this.age * 5) * 4 : 0;
  }

  /** 걷는 종: 이동 방향에 따라 옆·앞·뒤 걸음, 옆이면 좌우 뒤집기 / 나는 종: 좌우만 */
  protected override face(dir: { x: number; y: number }): void {
    const walker = this.art && !this.art.flies && isCreature(this.def.id);
    if (this.poseArt) {
      // 웅크림·도망 생성 그림을 낀 동안은 좌우만 (그림은 옆모습)
      if (Math.abs(dir.x) > 0.15) this.sprite.setFlipX(dir.x < 0);
      return;
    }
    if (walker && isCreature(this.def.id)) {
      const view = critterView(dir, this.view);
      if (view !== this.view) {
        this.view = view;
        const anim = creatureAnim(this.def.id, this.look, view);
        if (this.scene.anims.exists(anim)) this.sprite.play(anim, true);
      }
      if (view !== 'side') {
        this.sprite.setFlipX(false);
        return;
      }
    }
    if (Math.abs(dir.x) > 0.15) this.sprite.setFlipX(dir.x < 0);
  }

  protected playHit(): void {
    this.sprite.setTint(0xffe0a8);
    this.scene.time.delayedCall(120, () => this.sprite.clearTint());
  }

  override hitByLight(power: number, knockback: number, stunSec: number, ctx: ReturnContext): boolean {
    // 어둠의 행렬: 되받아치지 않고 웅크렸다 도망, 세 번째면 맵 밖으로 돌려보내진다 (2026-11-23)
    if (this.parade && power > 0 && this.targetable && !this.leaving) {
      const r = this.parade.hit();
      sayAbove(this.scene, this, this.parade.line, -((this.art?.size ?? FRIEND_SIZE) * 0.9));
      if (r === 'banished') return super.hitByLight(this.hp + 1, 0, stunSec, ctx);
      this.playHit();
      this.showParadePose('cower');
      if (!this.poseArt) {
        const cower = (this.def.cowerSec ?? 0.6) * 1000;
        this.scene.tweens.add({ targets: this, scaleX: 1.1, scaleY: 0.8, duration: 120, yoyo: true, hold: Math.max(0, cower - 240), ease: 'Quad.easeOut' });
      }
      return false;
    }
    const p = this.def.behaviorParams;
    // 방어(고슴도치, 필살기): 몸을 말아 빛 위력을 줄인다 — guardCooldownSec마다 한 번 (systems/specials.ts 설명)
    if (p?.special === 'guard' && this.guardLeft <= 0 && power > 0) {
      power *= Number(p.guardMultiplier ?? 0.5);
      this.guardLeft = Number(p.guardCooldownSec ?? 4);
      this.scene.tweens.add({ targets: this, scaleX: 1.12, scaleY: 0.78, duration: 160, yoyo: true, hold: 220, ease: 'Quad.easeOut' });
    }
    // 눈 가림(웨어울프·뱀파이어, 종류별 빛 반응): 눈부셔 더 오래 멈칫한다
    if (p?.lightReaction === 'coverEyes' && power > 0) {
      stunSec *= Number(p.coverEyesStun ?? 1.6);
      if (!this.eyesSaid && this.hp - power > 0) {
        this.eyesSaid = true;
        sayAbove(this.scene, this, '눈부셔..');
      }
    }
    return super.hitByLight(power, knockback, stunSec, ctx);
  }

  override step(dt: number, ctx: EnemyContext): EnemyStep {
    this.guardLeft = Math.max(0, this.guardLeft - dt);
    // 트라이얼의 고정된 적 (패시브도 떠돌지 않음 — 곁을 지나가면 자비, 맞히면 화남 → 화난 채로 아주 가까우면 제자리에서 공격)
    if (this.pinned && !this.leaving) return super.step(dt, ctx);
    if (this.def.behavior === 'idle') {
      this.age += dt;
      this.underGlow.setAlpha(0.35 + 0.15 * Math.sin(this.age * 3));
      this.talk(dt, ctx, ['도와줘..', '여기 있어..']);
      return { hit: null };
    }
    if (this.parade) return this.leaving || !this.targetable ? { hit: null } : this.walkParade(dt, ctx);
    if (this.mode === 'stunned' || !this.leaving) return super.step(dt, ctx);
    return { hit: null };
  }

  /** 어둠의 행렬: 길을 따라 걷고(결계는 둘레로, 막히면 옆으로), 웅크림이면 제자리, 도망이면 빠르게. 공격하지 않는다 */
  private walkParade(dt: number, ctx: EnemyContext): EnemyStep {
    const parade = this.parade as ParadeState;
    this.age += dt;
    this.animate();
    const mode = parade.update(dt);
    this.showParadePose(mode);
    if (mode === 'walk') this.talk(dt, ctx, PASSIVE_LINES);
    let speed = this.def.speed * ctx.speedMultiplier * parade.speedMultiplier;
    if (speed <= 0) return { hit: null };
    let dest: Vec;
    const p = ctx.player;
    if (this.route) dest = this.route;
    else if (p && Math.hypot(p.x - this.x, p.y - this.y) < P.shyDist) {
      // 길 없는 패시브(튜토리얼): 루미가 너무 가까우면 살짝 피한다
      dest = { x: this.base.x + (this.x - p.x), y: this.base.y + (this.y - p.y) };
      speed *= P.shySpeedMultiplier;
    } else {
      if (!this.wanderTo || Math.hypot(this.wanderTo.x - this.base.x, this.wanderTo.y - this.base.y) < 24) this.wanderTo = ctx.roam(this.base);
      dest = this.wanderTo;
    }
    if (ctx.paths && !this.def.flies) dest = ctx.paths.waypoint(this, dest) ?? dest; // 걷는 행렬은 A* 경로로 (2026-11-23)
    const dir = this.headingTo(dest, dt, ctx.sources);
    this.base.x += dir.x * speed * dt;
    this.base.y += dir.y * speed * dt;
    this.setPosition(this.base.x, this.base.y);
    this.face(dir);
    this.setDepth(this.y);
    return { hit: null };
  }

  /**
   * 행렬의 웅크림·도망 자세: 생성 그림(art-src)이 있을 때만 그 그림으로 바꿔 끼우고, 걸음으로 돌아오면 원래 걸음 그림으로 (2026-11-24 그림 자리).
   * 코드 대체 그림뿐이면 아무것도 바꾸지 않는다 — 웅크림은 납작해지는 움직임, 도망은 빨라지는 걸음 그대로
   */
  private showParadePose(mode: ParadeMode): void {
    if (mode === this.poseMode || !isCreature(this.def.id)) return;
    this.poseMode = mode;
    const id = this.def.id;
    const key = mode === 'walk' ? '' : paradePoseKey(id, mode);
    if (key && isArtTexture(key) && this.scene.textures.exists(key)) {
      this.poseArt = true;
      this.sprite.anims.stop(); // 걷기 애니가 돌면 다음 프레임에 걷기 그림으로 되덮는다
      this.sprite.setTexture(key, 0).setScale(texScale(key));
      if (mode === 'flee' && this.scene.anims.exists(paradeFleeAnim(id))) this.sprite.play(paradeFleeAnim(id));
      return;
    }
    if (!this.poseArt) return;
    this.poseArt = false;
    const walk = creatureKey(id, this.look);
    this.sprite.setTexture(walk, 0).setScale(texScale(walk));
    const anim = creatureAnim(id, this.look, this.art?.flies ? 'side' : this.view);
    if (this.scene.anims.exists(anim)) this.sprite.play(anim);
  }

  /** 행렬이 맵을 다 지나감(또는 길을 못 찾음): 점수 없이 조용히 사라진다 */
  leaveQuietly(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.mode = 'returning';
    this.scene.tweens.add({ targets: this, alpha: 0, duration: 600, onComplete: () => this.destroy() });
  }

  /** 자비: 고마워한다. 행렬이면 계속 걸어가고, 길 없는 패시브는 마을 밖으로 천천히 떠난다 */
  thank(): void {
    if (this.route) {
      this.thanked = true;
      sayAbove(this.scene, this, '고마워..');
      return;
    }
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
    // 빛을 잃은 친구는 실루엣 귀 끝까지 보이게 조금 더 위에 (2026-11-24)
    sayAbove(this.scene, this, this.rng.pick(lines), -(this.art ? this.art.size * 0.9 : FRIEND_SIZE * 1.15));
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
          this.look = 'true';
          const anim = creatureAnim(this.def.id, 'true', this.view);
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
    this.face({ x: tx / (Math.hypot(tx, ty) || 1), y: ty / (Math.hypot(tx, ty) || 1) });
    scene.tweens.add({ targets: this, x: this.x + (tx / len) * run, y: this.y + (ty / len) * run, duration: RUN_MS, delay: 200, ease: 'Sine.easeIn' });
    scene.tweens.add({ targets: this.sprite, y: -8, duration: 160, yoyo: true, repeat: 5, delay: 200 });
    scene.tweens.add({ targets: this, alpha: 0, delay: RUN_MS * 0.7, duration: RUN_MS * 0.45, onComplete: () => this.destroy() });
  }
}
