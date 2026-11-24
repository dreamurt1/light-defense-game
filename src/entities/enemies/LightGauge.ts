// 적 "빛 게이지" (2026-11-24 15:03 기획 세션, 라이언 확정): 빛에 맞아 HP가 줄었는데 아직 남았을 때만 발밑에 잠깐 —
// 받은 빛만큼 호박빛이 차오른다(숫자·붉은색 없음). 판정은 systems/lightGauge.ts, 값은 game.json enemyGauge.
//  - 그림: 둥근 막대 두 장(바탕 NIGHT 0.6 · 채움 AMBER)을 한 번만 굽고(bake), 채움은 잘라서 보인다 — 살아 있는 Graphics를 두지 않는다.
//  - 자리: 적 컨테이너의 자식이 아니라 월드에 따로 — 박쥐 코드 그림처럼 몸이 돌아도 막대는 눕지 않게, 매 프레임 발밑으로 옮긴다(보일 때만).
import Phaser from 'phaser';
import { GameData } from '../../data';
import { bakeTexture } from '../bake';
import { gaugeAlpha, gaugeFill, type EnemyGaugeCfg } from '../../systems/lightGauge';

const NIGHT = 0x1b1f3b;
const AMBER = 0xffc857;
const BG_ALPHA = 0.6;
/** 굽는 배율 — 36×4가 흐릿하지 않게 두 배로 굽고 반으로 줄인다 */
const RES = 2;

export class LightGauge {
  private readonly cfg: EnemyGaugeCfg = GameData.game.enemyGauge;
  private readonly bg: Phaser.GameObjects.Image;
  private readonly fill: Phaser.GameObjects.Image;
  /** 마지막으로 맞은 뒤 지난 시간(ms) */
  private since = Number.POSITIVE_INFINITY;
  private shownFill = -1;

  constructor(scene: Phaser.Scene) {
    const { width: w, height: h } = this.cfg;
    const bar = (key: string, color: number) =>
      bakeTexture(scene, key, w * RES, h * RES, (g) => g.fillStyle(color, 1).fillRoundedRect(0, 0, w * RES, h * RES, (h * RES) / 2));
    const bgKey = bar(`light-gauge-bg-${w}x${h}`, NIGHT);
    const fillKey = bar(`light-gauge-fill-${w}x${h}`, AMBER);
    this.bg = scene.add.image(0, 0, bgKey).setOrigin(0, 0.5).setScale(1 / RES).setVisible(false);
    this.fill = scene.add.image(0, 0, fillKey).setOrigin(0, 0.5).setScale(1 / RES).setVisible(false);
  }

  /** 맞음: 채움을 새 HP로, 보이는 시간을 처음부터 */
  hit(hp: number, maxHp: number): void {
    this.since = 0;
    const f = gaugeFill(hp, maxHp);
    if (f !== this.shownFill) {
      this.shownFill = f;
      this.fill.setCrop(0, 0, Math.max(0, Math.round(this.fill.width * f)), this.fill.height);
    }
  }

  /** 바로 숨김 (HP 0 — 퇴장·구출 연출이 대신) */
  hide(): void {
    this.since = Number.POSITIVE_INFINITY;
    this.bg.setVisible(false);
    this.fill.setVisible(false);
  }

  get visible(): boolean {
    return this.bg.visible;
  }

  /** 매 프레임: 시간을 보내고, 보이는 동안만 발밑(footX, footY)으로 옮긴다 */
  update(dtMs: number, footX: number, footY: number, depth: number): void {
    if (!Number.isFinite(this.since)) return;
    this.since += dtMs;
    const a = gaugeAlpha(this.since, this.cfg);
    if (a <= 0) {
      this.hide();
      return;
    }
    const x = footX - this.cfg.width / 2;
    const y = footY + this.cfg.offsetY + this.cfg.height / 2;
    this.bg.setPosition(x, y).setAlpha(BG_ALPHA * a).setDepth(depth).setVisible(true);
    this.fill.setPosition(x, y).setAlpha(a).setDepth(depth + 0.01).setVisible(this.shownFill > 0);
  }

  destroy(): void {
    this.bg.destroy();
    this.fill.destroy();
  }
}
