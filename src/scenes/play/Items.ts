// 아이템 (2026-11-13 컨셉 시연판, Phase 4): 맵에 생기고 걸어서 주워 칸(2개)에 담고, HUD 칸·PC Q/E로 쓴다.
//  - 생기는 곳: stages.json items.intervalSec마다, 동시 maxGround개. 2026-11-14 라이언: 대부분(lampShare) 켜진 등불 빛 안에
//    (등불을 켜 둘 이유), 나머지는 중앙 광원 둘레. 패배 위험(마지막 하트에 HP 낮음·중앙 광원 낮음)이면 루미 곁에, 곧(dangerSoonSec)
//  - 빛의 부적은 스테이지마다 1개를 기본으로 준다(XMind). 도토의 볼주머니 = 효과 ×1.5
//  - 효과: 바람 깃털(이동 빠르게) · 별 목걸이(적 느리게) · 반딧불 병(LP) · 황금 도토리(구출한 친구 2명이 곁에서 빛을 보냄) · 빛의 부적(HP·LP)
import Phaser from 'phaser';
import { bus } from '../../core/events';
import type { Rng } from '../../core/rng';
import { TextureKeys } from '../../core/TextureKeys';
import { texScale } from '../../core/textureRes';
import { GameData, type ItemDef, type StageDef } from '../../data';
import type { Enemy } from '../../entities/enemies/Enemy';
import type { Vec } from '../../systems/fan';
import { Effects, Inventory } from '../../systems/inventory';
import type { LightPoints } from '../../systems/lightPoints';
import { pushOut, type Rect } from '../../systems/obstacles';
import type { Vitals } from '../../systems/vitals';

// 수치 원본: game.json items(칸·줍기·생기는 둘레), items.json golden_acorn(helper*)
const CFG = GameData.game.items;
const ACORN = GameData.items.find((i) => i.id === 'golden_acorn');
/** 황금 도토리: 친구가 빛을 보내는 간격·거리·위력 */
const HELPER = { everySec: Number(ACORN?.helperEverySec ?? 1), range: Number(ACORN?.helperRange ?? 280), power: Number(ACORN?.helperPower ?? 6) };
/** 친구가 루미 곁을 도는 반지름 (연출) */
const HELPER_ORBIT = 72;

interface Ground {
  def: ItemDef;
  img: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  left: number;
}

/** 아이템이 생길 곳 (Sources.itemPlaces) */
export interface ItemPlaces {
  central: Vec;
  /** 켜진 등불 */
  lamps: readonly Vec[];
  /** 패배 위험: 루미 곁에 */
  danger: boolean;
}

export interface ItemHost {
  vitals: Vitals;
  lp: LightPoints;
}

export class Items {
  readonly inventory = new Inventory(CFG.slots);
  readonly effects = new Effects();
  used = 0;
  private ground: Ground[] = [];
  private spawnLeft: number;
  private helpers: Phaser.GameObjects.Sprite[] = [];
  private helperTick = 0;
  private spin = 0;
  /** 이번 위험에 다음 아이템을 이미 당겼는지 (위험이 풀리면 다시) */
  private dangerPulled = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly stage: StageDef,
    private readonly rng: Rng,
    /** 도토 볼주머니 ×1.5 */
    private readonly boost: number,
  ) {
    this.spawnLeft = stage.items?.firstSec ?? Infinity;
    if (!stage.tutorial) this.inventory.add('light_charm');
    this.emitSlots();
  }

  get speedMultiplier(): number {
    return this.effects.active('moveSpeed') ? this.mult('wind_feather') : 1;
  }

  get enemySpeedMultiplier(): number {
    return this.effects.active('enemySlow') ? this.mult('star_necklace') : 1;
  }

  /** 줍기·생기기·효과 시간. @returns 이번에 주운 아이템 */
  update(dt: number, keeper: Vec, place: ItemPlaces, obstacles: readonly Rect[], area: Rect): ItemDef[] {
    const picked: ItemDef[] = [];
    this.spawnLeft -= dt;
    // 위험해지면 다음 아이템을 곧 루미 곁에 (한 번의 위험에 한 번)
    if (!place.danger) this.dangerPulled = false;
    else if (!this.dangerPulled && this.stage.items) {
      this.dangerPulled = true;
      this.spawnLeft = Math.min(this.spawnLeft, CFG.dangerSoonSec);
    }
    if (this.spawnLeft <= 0 && this.stage.items) {
      this.spawnLeft = this.stage.items.intervalSec;
      if (this.ground.length < CFG.maxGround) {
        const [base, min, max] = place.danger
          ? [keeper, CFG.dangerRingMin, CFG.dangerRingMax]
          : place.lamps.length > 0 && this.rng.chance(CFG.lampShare)
            ? [this.rng.pick(place.lamps), CFG.lampRingMin, CFG.lampRingMax]
            : [place.central, CFG.spawnRingMin, CFG.spawnRingMax];
        const a = this.rng.range(0, Math.PI * 2);
        const d = this.rng.range(min, max);
        const p = pushOut({ x: base.x + Math.cos(a) * d, y: base.y + Math.sin(a) * d }, 30, obstacles);
        // 위험할 때는 빛의 부적(HP·LP)도 나올 수 있다 (제안)
        const def = this.rng.pick(GameData.items.filter((i) => place.danger || i.id !== 'light_charm'));
        this.drop(def.id, Math.min(area.x + area.w, Math.max(area.x, p.x)), Math.min(area.y + area.h, Math.max(area.y, p.y)));
      }
    }
    for (let i = this.ground.length - 1; i >= 0; i--) {
      const g = this.ground[i];
      g.left -= dt;
      g.img.setAlpha(g.left < CFG.blinkLastSec ? 0.45 + 0.55 * Math.abs(Math.cos(g.left * Math.PI * 2)) : 1);
      const near = Math.hypot(g.img.x - keeper.x, g.img.y + 10 - keeper.y) <= CFG.pickRadius;
      if (near && this.inventory.add(g.def.id)) {
        picked.push(g.def);
        bus.emit('item:pickup', { itemId: g.def.id, x: g.img.x, y: g.img.y });
        this.emitSlots();
        this.remove(i);
      } else if (g.left <= 0) this.remove(i);
    }
    for (const e of this.effects.update(dt)) if (e === 'summonRescued') this.clearHelpers();
    return picked;
  }

  /** 맵에 아이템을 놓는다 (튜토리얼은 루미 곁에) */
  drop(id: string, x: number, y: number): void {
    const def = GameData.items.find((i) => i.id === id);
    if (!def) return;
    const key = `item-${id}`;
    const has = this.scene.textures.exists(key);
    const color = Phaser.Display.Color.HexStringToColor(def.color).color;
    const glow = this.scene.add.image(x, y, TextureKeys.glow).setTint(color).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.55).setScale(90 / 256).setDepth(y - 1);
    const img = has
      ? this.scene.add.image(x, y, key).setScale(texScale(key) * 0.75).setDepth(y)
      : this.scene.add.image(x, y, TextureKeys.star).setTint(color).setScale(1.4).setDepth(y);
    this.scene.tweens.add({ targets: img, y: y - 8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.ground.push({ def, img, glow, left: this.stage.tutorial || this.stage.practice ? 9999 : CFG.lifetimeSec });
    bus.emit('item:spawn', { itemId: id, x, y });
  }

  /** 칸의 아이템을 쓴다. @returns 쓴 아이템 */
  use(slot: number, host: ItemHost): ItemDef | null {
    const id = this.inventory.take(slot);
    if (!id) return null;
    const def = GameData.items.find((i) => i.id === id);
    if (!def) return null;
    const b = this.boost;
    const sec = Number(def.durationSec ?? 0) * b;
    switch (def.effect) {
      case 'moveSpeed':
      case 'enemySlow':
      case 'summonRescued':
        this.effects.start(def.effect, sec);
        break;
      case 'restoreLp':
        host.lp.restore(Number(def.amount) * b);
        break;
      case 'restoreHpLp':
        host.vitals.heal(Number(def.hp) * b);
        host.lp.restore(Number(def.lp) * b);
        break;
    }
    this.used += 1;
    this.emitSlots();
    bus.emit('item:use', { itemId: id, durationSec: sec });
    return def;
  }

  /** 황금 도토리: 구출한 친구 둘이 루미 곁을 돌며 가까운 적에게 작은 빛을 보낸다. @returns 빛을 맞힌 적 */
  updateHelpers(dt: number, keeper: Vec, enemies: readonly Enemy[]): Enemy[] {
    if (!this.effects.active('summonRescued')) return [];
    if (this.helpers.length === 0) {
      this.helpers = [TextureKeys.frogTrue, TextureKeys.batTrue].map((k) => this.scene.add.sprite(keeper.x, keeper.y, k, 0).setScale(texScale(k) * 0.8));
    }
    this.spin += dt * 2.2;
    this.helpers.forEach((h, i) => {
      const a = this.spin + i * Math.PI;
      h.setPosition(keeper.x + Math.cos(a) * HELPER_ORBIT, keeper.y + Math.sin(a) * HELPER_ORBIT * 0.6).setDepth(h.y);
    });
    this.helperTick -= dt;
    if (this.helperTick > 0) return [];
    this.helperTick = HELPER.everySec;
    const shot: Enemy[] = [];
    for (const h of this.helpers) {
      let best: Enemy | null = null;
      let bd = HELPER.range;
      for (const e of enemies) {
        if (e.def.kind === 'passive' || e.def.friend || shot.includes(e)) continue;
        const d = Math.hypot(e.x - h.x, e.y - h.y);
        if (d < bd) {
          bd = d;
          best = e;
        }
      }
      if (!best) continue;
      shot.push(best);
      const line = this.scene.add.line(0, 0, h.x, h.y, best.x, best.y, 0xffd27a, 0.8).setOrigin(0, 0).setLineWidth(3).setDepth(5000);
      this.scene.tweens.add({ targets: line, alpha: 0, duration: 260, onComplete: () => line.destroy() });
    }
    return shot;
  }

  get helperPower(): number {
    return HELPER.power;
  }

  private mult(id: string): number {
    return Number(GameData.items.find((i) => i.id === id)?.multiplier ?? 1);
  }

  private remove(i: number): void {
    const g = this.ground[i];
    this.scene.tweens.killTweensOf(g.img);
    g.img.destroy();
    g.glow.destroy();
    this.ground.splice(i, 1);
  }

  private clearHelpers(): void {
    this.helpers.forEach((h) => h.destroy());
    this.helpers = [];
  }

  emitSlots(): void {
    bus.emit('item:slots', { slots: [...this.inventory.slots] });
  }
}
