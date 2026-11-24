// 노월 보스 (2026-11-13 컨셉 시연판, Phase 5 → 2026-11-23 밤 나들이 v3 두 모습). 밤 시작 몇 초 뒤 나타나 중앙 광원 둘레를 천천히 돈다.
//  - 6초마다 박쥐를 부르고, 몇 초마다 어둠 구슬을 중앙 광원이나 켜진 등불로 던진다(빛을 맞히면 구슬이 사라짐)
//  - 두 모습(game.json boss.calm / boss.angry): 넓히는 길이면 분노한 노월(HP·소환·구슬이 거셈, 눈빛 잔불 주황),
//    아니면 찾아온 노월(라벤더). 그림은 같고 눈빛 색과 수치만 다르다 (NIGHT_RUN.md 8절)
//  - 빛을 맞아 마음(HP)이 다 풀리면 말풍선을 남기고 물러난다 = 진정 → 바로 아침(승리)
import Phaser from 'phaser';
import { bus } from '../../core/events';
import { TextureKeys } from '../../core/TextureKeys';
import { texScale } from '../../core/textureRes';
import { GameData, type StageDef, type WitchForm, type WitchFormDef } from '../../data';
import { sayAbove } from '../../entities/Bubble';
import { WITCH_FRAME } from '../../art/enemies';
import type { EnemyTarget } from '../../entities/enemies/Enemy';
import type { Vec } from '../../systems/fan';
import type { LightTarget } from '../../systems/LightSystem';
import type { EnemyField } from './EnemyField';
import type { Rng } from '../../core/rng';
import { witchFormOf, type RunPath } from '../../systems/nightRules';

const B = GameData.game.boss;
const ENTER_MS = B.enterSec * 1000;
/** 함께 부르는 박쥐 사이 간격 (연출) */
const SUMMON_GAP = 100;
/** 노월·구슬의 빛 판정 uid (적·등불과 겹치지 않게) */
const WITCH_UID = 900_000;
let orbUid = 900_001;

interface Orb {
  uid: number;
  img: Phaser.GameObjects.Image;
  target: EnemyTarget;
}

export class Boss {
  hp: number;
  readonly maxHp: number;
  calmed = false;
  private sprite: Phaser.GameObjects.Container | null = null;
  private angle = -Math.PI / 2;
  /** 이번 밤의 모습 */
  readonly form: WitchForm;
  private readonly F: WitchFormDef;
  private summonLeft = B.summonEverySec;
  private orbLeft: number;
  private orbs: Orb[] = [];
  private entering = true;
  private appeared = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly stage: StageDef,
    private readonly field: EnemyField,
    private readonly center: Vec,
    private readonly rng: Rng,
  ) {
    this.form = witchFormFor(stage);
    this.F = B[this.form];
    this.hp = this.maxHp = this.F.hp;
    this.orbLeft = this.F.orbEverySec;
  }

  get active(): boolean {
    return this.appeared && !this.calmed;
  }

  get pos(): Vec | null {
    return this.sprite ? { x: this.sprite.x, y: this.sprite.y } : null;
  }

  /** @param targets 중앙 광원·켜진 등불 @returns 구슬이 닿은 곳(피해 대상 id) */
  update(dt: number, t: number, targets: readonly EnemyTarget[]): { target: string; damage: number }[] {
    const hits: { target: string; damage: number }[] = [];
    if (!this.appeared && t >= (this.stage.boss?.atSec ?? 0)) this.appear();
    if (!this.sprite || this.calmed) return this.moveOrbs(dt, hits, targets);
    if (!this.entering) {
      this.angle += B.orbitSpeed * dt;
      this.sprite.setPosition(this.center.x + Math.cos(this.angle) * B.orbitRx, this.center.y + Math.sin(this.angle) * B.orbitRy).setDepth(this.sprite.y);
      // 도는 방향(왼쪽·오른쪽)을 바라본다
      this.witch?.setFlipX(-Math.sin(this.angle) < 0);
      this.summonLeft -= dt;
      if (this.summonLeft <= 0) {
        this.summonLeft = B.summonEverySec;
        // 마을에 박쥐가 summonCap 이상이면 쉰다 (방치하면 끝없이 쌓이지 않게)
        const bats = this.field.enemies.filter((e) => e.def.id === 'bat' && e.targetable).length;
        if (bats < this.F.summonCap) {
          for (let i = 0; i < this.F.summonCount; i++) {
            const dx = (i - (this.F.summonCount - 1) / 2) * SUMMON_GAP;
            this.field.spawnAt('bat', this.sprite.x + dx, this.sprite.y + 20, true);
          }
          bus.emit('boss:attack', { kind: 'summon' });
          this.cast();
        }
      }
      this.orbLeft -= dt;
      if (this.orbLeft <= 0 && targets.length > 0) {
        this.orbLeft = this.F.orbEverySec;
        const target = this.rng.pick(targets);
        this.throwOrb(target);
      }
    }
    return this.moveOrbs(dt, hits, targets);
  }

  lightTargets(): LightTarget[] {
    const out: LightTarget[] = this.orbs.map((o) => ({ uid: o.uid, x: o.img.x, y: o.img.y, radius: B.orbRadius }));
    if (this.sprite && this.active && !this.entering) out.push({ uid: WITCH_UID, x: this.sprite.x, y: this.sprite.y - 30, radius: B.hitRadius });
    return out;
  }

  owns(uid: number): boolean {
    return uid >= WITCH_UID;
  }

  /** 빛이 닿음. @returns 'calmed'(진정) · 'hit' · 'orb'(구슬을 없앰) · null */
  hit(uid: number, power: number): 'calmed' | 'hit' | 'orb' | null {
    if (uid !== WITCH_UID) {
      const i = this.orbs.findIndex((o) => o.uid === uid);
      if (i < 0) return null;
      this.popOrb(i);
      return 'orb';
    }
    if (!this.sprite || !this.active) return null;
    this.hp = Math.max(0, this.hp - power);
    bus.emit('boss:hp', { hp: this.hp, maxHp: this.maxHp });
    const img = this.witch;
    img?.setTint(0xffe0a8);
    this.scene.time.delayedCall(120, () => img?.clearTint());
    if (this.hp > 0) return 'hit';
    this.calm();
    return 'calmed';
  }

  private appear(): void {
    this.appeared = true;
    const s = this.scene;
    const eye = Phaser.Display.Color.HexStringToColor(this.F.eye).color;
    const glow = s.add.image(0, -40, TextureKeys.glow).setTint(eye).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5).setScale(220 / 256);
    const img = s.add.sprite(0, 0, this.tex, 0).setOrigin(0.5, 0.95).setScale(texScale(this.tex) * 0.75);
    if (s.anims.exists(this.anim('idle'))) img.play(this.anim('idle'));
    const startX = this.center.x;
    const startY = this.center.y - B.orbitRy - 260;
    this.sprite = s.add.container(startX, startY, [glow, img]).setDepth(startY);
    const tx = this.center.x + Math.cos(this.angle) * B.orbitRx;
    const ty = this.center.y + Math.sin(this.angle) * B.orbitRy;
    s.tweens.add({ targets: this.sprite, x: tx, y: ty, duration: ENTER_MS, ease: 'Sine.easeOut', onComplete: () => (this.entering = false) });
    s.tweens.add({ targets: img, y: -8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    bus.emit('witch:spawn', { form: this.form });
    bus.emit('boss:hp', { hp: this.hp, maxHp: this.maxHp });
    s.time.delayedCall(ENTER_MS, () => this.sprite && sayAbove(s, this.sprite, this.F.enterLine, -150, 2600));
  }

  private calm(): void {
    this.calmed = true;
    const s = this.scene;
    const box = this.sprite;
    if (!box) return;
    sayAbove(s, box, this.F.calmLine, -150, 2400);
    // 눈을 감고 미소 짓는 진정 칸에서 멈춘다
    this.witch?.stop().setFrame(WITCH_FRAME.calm);
    // 2026-11-24 생성 그림은 진정 칸이 대기와 거의 같다 → 기존 부활 빛기둥(fx-respawn)을 한 번 겹쳐 진정을 보여 준다
    if (s.textures.exists(TextureKeys.fxRespawn)) {
      const fx = s.add.image(box.x, box.y + 90, TextureKeys.fxRespawn).setOrigin(0.5, 0.9).setScale(texScale(TextureKeys.fxRespawn) * 1.6).setDepth(box.depth + 1);
      s.tweens.add({ targets: fx, alpha: 0, scaleY: fx.scaleY * 1.4, duration: 900, delay: 150, ease: 'Sine.easeIn', onComplete: () => fx.destroy() });
    }
    for (let i = this.orbs.length - 1; i >= 0; i--) this.popOrb(i);
    s.tweens.add({ targets: box, y: box.y - 160, alpha: 0, delay: 1400, duration: 1400, onComplete: () => box.destroy() });
    bus.emit('witch:returned');
  }

  private throwOrb(target: EnemyTarget): void {
    if (!this.sprite) return;
    const key = this.scene.textures.exists('fx-dark-orb') ? 'fx-dark-orb' : TextureKeys.glow;
    const img = this.scene.add.image(this.sprite.x, this.sprite.y - 40, key).setDepth(5500);
    if (key === TextureKeys.glow) img.setTint(0x6b4fa8).setScale(56 / 256);
    else img.setScale(texScale(key));
    this.orbs.push({ uid: orbUid++, img, target });
    bus.emit('boss:attack', { kind: 'orb' });
    this.cast();
  }

  /** 노월 그림 (대기·시전·진정 칸) */
  private get witch(): Phaser.GameObjects.Sprite | null {
    return (this.sprite?.list[1] as Phaser.GameObjects.Sprite | undefined) ?? null;
  }

  /** 지팡이를 들어 시전한 뒤 대기로 돌아간다 */
  private cast(): void {
    const w = this.witch;
    if (!w || this.calmed || !this.scene.anims.exists(this.anim('cast'))) return;
    w.play(this.anim('cast'));
    w.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (!this.calmed && w.active) w.play(this.anim('idle'));
    });
  }

  /** 진정될 때 점수 (모습마다) */
  get score(): number {
    return this.F.score;
  }

  /** 모습의 그림 (분노 = 눈빛 잔불 주황 witch-angry, 없으면 기본 그림) */
  private get tex(): string {
    return this.form === 'angry' && this.scene.textures.exists(TextureKeys.witchAngry) ? TextureKeys.witchAngry : TextureKeys.witch;
  }

  private anim(kind: 'idle' | 'cast'): string {
    return `${this.tex}-${kind}`;
  }

  private moveOrbs(dt: number, hits: { target: string; damage: number }[], alive: readonly EnemyTarget[]): { target: string; damage: number }[] {
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      // 날아가는 사이 목표 등불이 꺼졌으면 구슬도 흩어진다 (코드 리뷰 2026-11-13)
      if (!alive.some((t) => t.id === o.target.id)) {
        this.popOrb(i);
        continue;
      }
      const dx = o.target.x - o.img.x;
      const dy = o.target.y - o.img.y;
      const d = Math.hypot(dx, dy);
      if (d <= o.target.radius) {
        hits.push({ target: o.target.id, damage: this.F.orbDamage });
        this.popOrb(i);
        continue;
      }
      const step = Math.min(d, B.orbSpeed * dt);
      o.img.setPosition(o.img.x + (dx / d) * step, o.img.y + (dy / d) * step);
      o.img.rotation += dt * 3;
    }
    return hits;
  }

  private popOrb(i: number): void {
    const o = this.orbs[i];
    this.scene.tweens.add({ targets: o.img, alpha: 0, scale: o.img.scale * 1.8, duration: 220, onComplete: () => o.img.destroy() });
    this.orbs.splice(i, 1);
  }

}

/** 이번 밤의 노월 모습: 넓히는 길(밤 규칙의 path)이면 분노한 노월, 아니면 찾아온 노월 */
export function witchFormFor(stage: StageDef): WitchForm {
  return witchFormOf((stage as StageDef & { path?: RunPath }).path);
}
