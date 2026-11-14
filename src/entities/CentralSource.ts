// 중앙 광원 (2026-11-12 새 기획): 맵 가운데의 수호 토템. 상태는 systems/centralSource(HP, 광도 = HP 비례 — 2026-11-14)이고,
// 여기서는 그림(밝음·약함·꺼짐), 결정 둘레의 빛, 맞았을 때의 번쩍임만 맡는다. 빛 고임(마을이 드러나는 빛)은 VillageStage.
import Phaser from 'phaser';
import { TextureKeys } from '../core/TextureKeys';
import { texScale } from '../core/textureRes';
import { CENTRAL } from '../art/objects';
import type { GameConfig } from '../data';
import { bandOf } from '../systems/lightLevel';
import { CentralSourceState } from '../systems/centralSource';
import type { Rect } from '../systems/obstacles';
import { SourceGauge } from './SourceGauge';

/** 판정 점(x, y)에서 받침 바닥까지 (그림의 발 위치, 제안) */
const FOOT_BELOW = 50;
const FRAME = { lit: 0, low: 1, out: 2 } as const;
/** HP 게이지: 그림 꼭대기 위, 등불 게이지보다 크게 (2026-11-13 라이언: 잘 보이게, 2026-11-14: 게이지 = HP) */
const GAUGE = { w: 112, h: 12, gap: 14 };

export class CentralSource {
  readonly state: CentralSourceState;
  readonly pos: { x: number; y: number };
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly halo: Phaser.GameObjects.Image;
  private readonly gauge: SourceGauge;
  /** 판정 점에서 그림 꼭대기까지 */
  private readonly topAbove: number;
  private t = 0;
  /** 등불 덕에 회복한 직후 결정이 환해지는 정도 (1 → 0) */
  private glowBoost = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly cfg: GameConfig['central'],
    private readonly bands: readonly [number, number, number],
  ) {
    this.state = new CentralSourceState(cfg);
    this.pos = { x: cfg.x, y: cfg.y };
    const foot = cfg.y + FOOT_BELOW;
    const core = foot - (CENTRAL.footY - CENTRAL.coreY);
    this.halo = scene.add
      .image(cfg.x, core, TextureKeys.glow)
      .setTint(0xffd27a)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(foot + 0.1);
    this.sprite = scene.add
      .image(cfg.x, foot, TextureKeys.centralSource, FRAME.lit)
      .setOrigin(0.5, CENTRAL.footY / CENTRAL.h)
      .setScale(texScale(TextureKeys.centralSource))
      .setDepth(foot);
    this.topAbove = CENTRAL.footY - FOOT_BELOW;
    this.gauge = new SourceGauge(scene, cfg.x, cfg.y - this.topAbove - GAUGE.gap, GAUGE.w, GAUGE.h);
  }

  /** 등불지기를 가릴 수 있는 그림 (반투명 처리용) */
  get art(): Phaser.GameObjects.Image {
    return this.sprite;
  }

  /** 노란 화살표 끝 높이: 게이지 위 / 받침 아래 */
  get arrowLift(): number {
    return this.topAbove + GAUGE.gap + GAUGE.h + 12;
  }

  get arrowDrop(): number {
    return FOOT_BELOW + 18;
  }

  /** 지나갈 수 없는 받침 (발 위치 판정) */
  get footprint(): Rect {
    const { w, h } = this.cfg.footprint;
    const foot = this.cfg.y + FOOT_BELOW;
    return { x: this.cfg.x - w / 2, y: foot - h, w, h };
  }

  /** 맞음: 결정이 잠깐 하얗게 번쩍이고 흔들린다 */
  hit(): void {
    this.sprite.setTintFill(0xfff1c9);
    this.scene.time.delayedCall(70, () => this.sprite.clearTint());
    this.scene.tweens.add({ targets: this.sprite, x: { from: this.cfg.x - 4, to: this.cfg.x }, duration: 180, ease: 'Sine.easeOut' });
    this.gauge.flash();
  }

  /** 꺼진 등불이 켜져 회복: 등불에서 빛 방울이 날아와 결정이 잠깐 환해진다 (2026-11-14, 연출 값은 제안) */
  healFrom(from: { x: number; y: number }): void {
    const mote = this.scene.add
      .image(from.x, from.y, TextureKeys.glow)
      .setTint(0xffe7a0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.32)
      .setDepth(4400);
    this.scene.tweens.add({
      targets: mote,
      x: this.halo.x,
      y: this.halo.y,
      scale: 0.18,
      duration: 650,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        mote.destroy();
        this.glowBoost = 1;
      },
    });
  }

  update(dt: number): void {
    this.t += dt;
    this.glowBoost = Math.max(0, this.glowBoost - dt * 1.4);
    const s = this.state;
    const band = bandOf(s.light, this.bands);
    this.sprite.setFrame(s.out ? FRAME.out : band === 0 ? FRAME.low : FRAME.lit);
    // 결정 둘레의 빛: 광도에 비례, 아주 천천히 숨 쉰다
    const r = s.out ? 0 : 60 + 70 * s.ratio + 40 * this.glowBoost;
    this.halo.setScale((r * 2) / 256).setAlpha(s.out ? 0 : 0.26 + 0.05 * Math.sin(this.t * 1.6) + 0.3 * this.glowBoost); // 2026-11-13 큰 결정이 하얗게 날아가지 않게 0.35 → 0.26
    this.gauge.update(dt, s.ratio, s.light, s.out ? 'off' : 'on');
  }
}
