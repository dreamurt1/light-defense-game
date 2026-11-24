// 마지막 하트 위험 링 (2026-11-24 15:03 기획 세션, 라이언 확인 항목): 하트 1개 + HP ≤ 50%일 때 루미 발밑에 잔불 주황 링이
// 숨 쉬듯(불투명도 0.35~0.7, 1.2초 주기 — 깜빡임 규칙 초당 3회 안). 쓰러짐·부활 무적 중엔 끄고, 켜고 끌 때 0.3초 페이드.
// 판정 systems/lightGauge.ts, 값 game.json dangerRing(enabled false면 아무것도 만들지 않음). 링 그림은 한 번 굽는다(bake).
import type Phaser from 'phaser';
import { GameData } from '../../data';
import { bakeTexture } from '../../entities/bake';
import { dangerPulse, dangerRingOn, fadeToward, type KeeperVitals } from '../../systems/lightGauge';

const EMBER = 0xff8c5a;
/** 선 굵기 2px, 흐릿하지 않게 두 배로 굽는다 */
const LINE = 2;
const RES = 2;

export class DangerRing {
  private readonly cfg = GameData.game.dangerRing;
  private readonly ring: Phaser.GameObjects.Image | null = null;
  /** 켜짐 정도 0~1 (페이드) */
  private level = 0;
  /** 숨쉬기 시간(ms) — 켜질 때마다 0.35에서 시작 */
  private t = 0;

  constructor(scene: Phaser.Scene) {
    if (!this.cfg.enabled) return;
    const r = this.cfg.radius;
    const size = (r + LINE) * 2 * RES;
    const key = bakeTexture(scene, `danger-ring-${r}`, size, size, (g) => g.lineStyle(LINE * RES, EMBER, 1).strokeCircle(size / 2, size / 2, r * RES));
    this.ring = scene.add.image(0, 0, key).setScale(1 / RES).setVisible(false);
  }

  /** 지금 보이는지 (완료 기준 점검용) */
  get shown(): boolean {
    return this.level > 0;
  }

  update(dt: number, v: KeeperVitals, footX: number, footY: number, depth: number): void {
    const ring = this.ring;
    if (!ring) return;
    this.level = fadeToward(this.level, dangerRingOn(v, this.cfg), dt * 1000);
    if (this.level <= 0) {
      if (ring.visible) ring.setVisible(false);
      this.t = 0;
      return;
    }
    this.t += dt * 1000;
    ring.setPosition(footX, footY).setDepth(depth).setAlpha(dangerPulse(this.t, this.cfg.pulseMs) * this.level).setVisible(true);
  }
}
