// 노월 보스 (2026-11-13 컨셉 시연판, Phase 5). 4스테이지 시작 몇 초 뒤 나타나 중앙 광원 둘레를 천천히 돈다.
//  - 7초마다 박쥐 둘을 부르고, 4.5초마다 어둠 구슬을 중앙 광원이나 켜진 등불로 던진다(빛을 맞히면 구슬이 사라짐)
//  - 빛을 맞아 마음(HP)이 다 풀리면 "…이 빛, 생각보다 따뜻하네" 하고 물러난다 = 진정 → 바로 아침(승리)
//  - 수치는 모두 제안
import Phaser from 'phaser';
import { bus } from '../../core/events';
import { TextureKeys } from '../../core/TextureKeys';
import { texScale } from '../../core/textureRes';
import { enemyById, type StageDef } from '../../data';
import { sayAbove } from '../../entities/Bubble';
import type { EnemyTarget } from '../../entities/enemies/Enemy';
import type { Vec } from '../../systems/fan';
import type { LightTarget } from '../../systems/LightSystem';
import type { EnemyField } from './EnemyField';
import type { Rng } from '../../core/rng';

const ORBIT = { rx: 470, ry: 330, speed: 0.22 };
const SUMMON_SEC = 7;
/** 마을에 박쥐가 이만큼 있으면 소환을 쉰다 (방치하면 끝없이 쌓이지 않게, 제안) */
const SUMMON_CAP = 6;
const ORB = { everySec: 4.5, speed: 170, damage: 3, radius: 22, popScore: 20 };
const ENTER_MS = 1600;
const HIT_RADIUS = 46;
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
  private summonLeft = SUMMON_SEC;
  private orbLeft = ORB.everySec;
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
    const def = enemyById(stage.boss?.enemyId ?? 'witch');
    this.hp = this.maxHp = def.hp;
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
      this.angle += ORBIT.speed * dt;
      this.sprite.setPosition(this.center.x + Math.cos(this.angle) * ORBIT.rx, this.center.y + Math.sin(this.angle) * ORBIT.ry).setDepth(this.sprite.y);
      this.summonLeft -= dt;
      if (this.summonLeft <= 0) {
        this.summonLeft = SUMMON_SEC;
        const bats = this.field.enemies.filter((e) => e.def.id === 'bat' && e.targetable).length;
        if (bats < SUMMON_CAP) {
          for (const dx of [-50, 50]) this.field.spawnAt('bat', this.sprite.x + dx, this.sprite.y + 20, true);
          bus.emit('boss:attack', { kind: 'summon' });
        }
      }
      this.orbLeft -= dt;
      if (this.orbLeft <= 0 && targets.length > 0) {
        this.orbLeft = ORB.everySec;
        const target = this.rng.pick(targets);
        this.throwOrb(target);
      }
    }
    return this.moveOrbs(dt, hits, targets);
  }

  lightTargets(): LightTarget[] {
    const out: LightTarget[] = this.orbs.map((o) => ({ uid: o.uid, x: o.img.x, y: o.img.y, radius: ORB.radius }));
    if (this.sprite && this.active && !this.entering) out.push({ uid: WITCH_UID, x: this.sprite.x, y: this.sprite.y - 30, radius: HIT_RADIUS });
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
    const img = this.sprite.list[1] as Phaser.GameObjects.Image;
    img.setTint(0xffe0a8);
    this.scene.time.delayedCall(120, () => img.clearTint());
    if (this.hp > 0) return 'hit';
    this.calm();
    return 'calmed';
  }

  private appear(): void {
    this.appeared = true;
    const s = this.scene;
    const glow = s.add.image(0, -40, TextureKeys.glow).setTint(0xa89cd9).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5).setScale(220 / 256);
    const img = s.add.image(0, 0, TextureKeys.witch, 0).setOrigin(0.5, 0.95).setScale(texScale(TextureKeys.witch) * 0.75);
    const startX = this.center.x;
    const startY = this.center.y - ORBIT.ry - 260;
    this.sprite = s.add.container(startX, startY, [glow, img]).setDepth(startY);
    const tx = this.center.x + Math.cos(this.angle) * ORBIT.rx;
    const ty = this.center.y + Math.sin(this.angle) * ORBIT.ry;
    s.tweens.add({ targets: this.sprite, x: tx, y: ty, duration: ENTER_MS, ease: 'Sine.easeOut', onComplete: () => (this.entering = false) });
    s.tweens.add({ targets: img, y: -8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    bus.emit('witch:spawn');
    bus.emit('boss:hp', { hp: this.hp, maxHp: this.maxHp });
    s.time.delayedCall(ENTER_MS, () => this.sprite && sayAbove(s, this.sprite, '빛이 너무 멀리까지 왔구나', -150, 2600));
  }

  private calm(): void {
    this.calmed = true;
    const s = this.scene;
    const box = this.sprite;
    if (!box) return;
    sayAbove(s, box, '…이 빛, 생각보다 따뜻하네', -150, 2400);
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
        hits.push({ target: o.target.id, damage: ORB.damage });
        this.popOrb(i);
        continue;
      }
      const step = Math.min(d, ORB.speed * dt);
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

  static get popScore(): number {
    return ORB.popScore;
  }
}
