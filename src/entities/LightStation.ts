// 등불 스테이션 (2026-11-12 새 기획): 맵 외곽의 꺼진 등불. 빛을 맞으면 igniteSec 뒤 켜지고(크게 밝음),
// 적에게 맞으면 천천히 약해진다. HP 없이 광도 게이지만 보인다(XMind). 상태는 systems/lightStation.
// 그림은 큰 등불(objects/lantern.png: 0 켜짐, 1 약함, 2 꺼짐)을 바닥에 세운다.
import Phaser from 'phaser';
import { TextureKeys } from '../core/TextureKeys';
import { texScale } from '../core/textureRes';
import { LANTERN, LANTERN_FRAME } from '../art/objects';
import type { GameConfig } from '../data';
import { StationState } from '../systems/lightStation';
import { SourceGauge } from './SourceGauge';
import type { Rect } from '../systems/obstacles';

// 제안: 기획서에 없음
/** 바닥에 세운 등불 크기 (2026-11-13 라이언: 조금 큼직하게 1.15 → 1.5) */
const SCALE = 1.5;
/** 광도 게이지: 등불 꼭대기 위 (2026-11-13 라이언: 잘 보이게 — 46×6 받침 아래 → 64×9 그림 위) */
const GAUGE = { w: 64, h: 9, gap: 14 };

export class LightStation {
  readonly state: StationState;
  /** 빛이 맞는 점(유리) */
  readonly pos: { x: number; y: number };
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly halo: Phaser.GameObjects.Image;
  private readonly gauge: SourceGauge;
  /** 유리(빛이 맞는 점)에서 그림 꼭대기까지 */
  private readonly topAbove: number;
  /** 유리에서 밑동까지 */
  private readonly footBelow: number;
  private t = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly index: number,
    /** 등불 밑동 */
    private readonly foot: { x: number; y: number },
    private readonly cfg: GameConfig['station'],
  ) {
    this.state = new StationState(cfg);
    const bottom = LANTERN.h - 8;
    const glassAbove = (bottom - LANTERN.glassY) * SCALE;
    this.pos = { x: foot.x, y: foot.y - glassAbove };
    this.halo = scene.add
      .image(this.pos.x, this.pos.y, TextureKeys.glow)
      .setTint(0xffc857)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setDepth(foot.y + 0.1);
    this.sprite = scene.add
      .image(foot.x, foot.y, TextureKeys.lantern, LANTERN_FRAME.out)
      .setOrigin(0.5, bottom / LANTERN.h)
      .setScale(SCALE * texScale(TextureKeys.lantern))
      .setDepth(foot.y);
    this.footBelow = glassAbove;
    this.topAbove = (LANTERN.glassY - 1) * SCALE;
    this.gauge = new SourceGauge(scene, foot.x, this.pos.y - this.topAbove - GAUGE.gap, GAUGE.w, GAUGE.h);
  }

  get id(): string {
    return `station-${this.index}`;
  }

  /** 지나갈 수 없는 밑동 */
  get footprint(): Rect {
    const { w, h } = this.cfg.footprint;
    return { x: this.foot.x - w / 2, y: this.foot.y - h, w, h };
  }

  get radius(): number {
    return this.cfg.radius;
  }

  /** 노란 화살표 끝 높이: 게이지 위 / 밑동 아래 (빛이 맞는 점 기준) */
  get arrowLift(): number {
    return this.topAbove + GAUGE.gap + GAUGE.h + 12;
  }

  get arrowDrop(): number {
    return this.footBelow + 14;
  }

  /** 빛을 맞음: 꺼져 있으면 점화가 시작된다(유리가 점점 달아오름) */
  ignite(): boolean {
    if (!this.state.ignite()) return false;
    this.scene.tweens.add({ targets: this.sprite, scaleX: this.sprite.scaleX * 1.08, scaleY: this.sprite.scaleY * 1.08, duration: 160, yoyo: true });
    return true;
  }

  /** 적에게 맞음 */
  hit(): void {
    this.sprite.setTint(0xb8a8e0);
    this.scene.time.delayedCall(90, () => this.sprite.clearTint());
    // 들이받혀 흔들리고 게이지가 번쩍인다 (2026-11-13 공격 효과)
    this.scene.tweens.add({ targets: this.sprite, angle: { from: -6, to: 0 }, duration: 220, ease: 'Back.easeOut' });
    this.gauge.flash();
  }

  /** @returns 이번 프레임에 켜졌으면 true */
  update(dt: number, mapLevel: number): boolean {
    this.t += dt;
    const s = this.state;
    const justLit = s.update(dt);
    if (justLit) {
      this.scene.tweens.add({ targets: this.halo, scale: { from: 0.2, to: (260 * 2) / 256 }, alpha: { from: 0.9, to: 0.5 }, duration: 500, ease: 'Quad.easeOut' });
    }
    // 그림: 꺼짐 / 점화 중(꺼짐 그림이 깜빡이듯 달아오름이 아니라 완만하게 밝아짐) / 켜짐(약하면 약한 그림)
    const igniteP = s.mode === 'igniting' ? 1 - s.igniteLeft / this.cfg.igniteSec : 0;
    this.sprite.setFrame(s.mode === 'on' ? (s.ratio < 0.35 ? LANTERN_FRAME.low : LANTERN_FRAME.lit) : s.mode === 'igniting' && igniteP > 0.5 ? LANTERN_FRAME.low : LANTERN_FRAME.out);
    if (!this.scene.tweens.isTweening(this.halo)) {
      const lit = s.mode === 'on' ? 0.25 + 0.3 * s.ratio : s.mode === 'igniting' ? 0.4 * igniteP : 0;
      this.halo.setScale((this.radiusFor(mapLevel) * 2) / 256).setAlpha(lit + (lit > 0 ? 0.04 * Math.sin(this.t * 2) : 0));
    }
    // 광도 게이지 (꺼져 있으면 비어 있고 흐리게)
    const level = s.mode === 'on' ? s.level(mapLevel) : 0;
    this.gauge.update(dt, s.mode === 'igniting' ? igniteP : s.mode === 'on' ? level / this.cfg.on : 0, level, s.mode === 'igniting' ? 'igniting' : s.mode === 'on' ? 'on' : 'off');
    return justLit;
  }

  /** 빛 고임 반지름: 광도에 비례 (VillageStage가 마을을 드러내는 크기) */
  radiusFor(mapLevel: number): number {
    const s = this.state;
    if (s.mode === 'off') return 0;
    const v = s.mode === 'igniting' ? (1 - s.igniteLeft / this.cfg.igniteSec) * this.cfg.on : s.level(mapLevel);
    return this.cfg.glowMin + (this.cfg.glowMax - this.cfg.glowMin) * Math.min(1, v / this.cfg.on);
  }
}
