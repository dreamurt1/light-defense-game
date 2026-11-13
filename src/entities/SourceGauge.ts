// 광원 게이지 (2026-11-13 라이언: 중앙 광원·등불의 광도 = 그것들의 체력이므로 플레이어에게 잘 보여야 함).
// 그림 위에 떠 있는 굵은 막대: 광도 4단계 눈금(25·50·75), 단계마다 색(노랑 → 호박 → 새벽빛 → 잔불),
// 맞으면 줄어든 만큼 흰 잔상이 남았다가 따라 줄고 테두리가 번쩍인다. 판정은 하지 않는다.
import Phaser from 'phaser';
import { GameData } from '../data';

const BANDS = GameData.game.lightLevels.bands;
/** 단계별 채움 색: 낮음(잔불) · 중간(새벽빛) · 밝음(호박) · 크게 밝음(노랑) */
const BAND_COLORS = [0xff8c5a, 0xf2b880, 0xffc857, 0xffe27a];
const IGNITE_COLOR = 0xfff1c9;
/** 흰 잔상이 따라 주는 빠르기 (막대 비율/초) */
const LAG_PER_SEC = 0.5;
/** 캐릭터·적(깊이 = y)보다 위, 풀숲(6000)보다 아래 */
const DEPTH = 4500;

export class SourceGauge {
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly lag: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly ticks: Phaser.GameObjects.Graphics;
  private shown = -1;
  private lagRatio = 0;
  private flashLeft = 0;
  private t = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly w: number,
    private readonly h: number,
  ) {
    this.frame = scene.add.graphics().setDepth(DEPTH);
    this.drawFrame(0x14152e, 0xf6f1e7, 0.55);
    const left = x - w / 2;
    this.lag = scene.add.rectangle(left, y, w, h, 0xf6f1e7, 0.85).setOrigin(0, 0.5).setDepth(DEPTH + 0.1).setScale(0, 1);
    this.fill = scene.add.rectangle(left, y, w, h, BAND_COLORS[2], 1).setOrigin(0, 0.5).setDepth(DEPTH + 0.2).setScale(0, 1);
    // 광도 4단계 눈금
    this.ticks = scene.add.graphics().setDepth(DEPTH + 0.3);
    this.ticks.lineStyle(1.5, 0x14152e, 0.75);
    for (const b of BANDS) {
      const tx = left + (w * b) / 100;
      this.ticks.lineBetween(tx, y - h / 2 + 1, tx, y + h / 2 - 1);
    }
  }

  private drawFrame(bg: number, line: number, lineAlpha: number): void {
    const g = this.frame;
    const r = Math.min(6, (this.h + 6) / 2);
    g.clear();
    g.fillStyle(bg, 0.88);
    g.fillRoundedRect(this.x - this.w / 2 - 3, this.y - this.h / 2 - 3, this.w + 6, this.h + 6, r);
    g.lineStyle(1.5, line, lineAlpha);
    g.strokeRoundedRect(this.x - this.w / 2 - 3, this.y - this.h / 2 - 3, this.w + 6, this.h + 6, r);
  }

  /** @param value 광도 0~100 · igniting = 점화 중(ratio는 점화 진행) · off = 꺼짐(흐리게) */
  update(dt: number, ratio: number, value: number, mode: 'on' | 'igniting' | 'off'): void {
    this.t += dt;
    const r = Math.max(0, Math.min(1, ratio));
    if (r !== this.shown) {
      // 줄어들면 흰 잔상이 남고, 늘면 잔상도 바로 따라간다
      if (r > this.lagRatio) this.lagRatio = r;
      this.shown = r;
      this.fill.setScale(r, 1);
    }
    this.lagRatio = Math.max(r, this.lagRatio - LAG_PER_SEC * dt);
    this.lag.setScale(this.lagRatio, 1);
    const band = value < BANDS[0] ? 0 : value < BANDS[1] ? 1 : value < BANDS[2] ? 2 : 3;
    let color = mode === 'igniting' ? IGNITE_COLOR : BAND_COLORS[band];
    // '낮음'이면 잔불색으로 천천히 숨 쉰다 (위험 신호, 깜빡임 규칙 안)
    const alpha = mode === 'off' ? 0.45 : band === 0 && mode === 'on' ? 0.65 + 0.35 * Math.abs(Math.sin(this.t * 2.2)) : 1;
    if (mode === 'off') color = 0x8a8fa8;
    this.fill.setFillStyle(color, alpha);
    this.frame.setAlpha(mode === 'off' ? 0.6 : 1);
    if (this.flashLeft > 0) {
      this.flashLeft -= dt;
      if (this.flashLeft <= 0) this.drawFrame(0x14152e, 0xf6f1e7, 0.55);
    }
  }

  /** 맞음: 테두리가 잠깐 하얗게 번쩍인다 */
  flash(): void {
    if (this.flashLeft <= 0) this.drawFrame(0x2a1f3d, 0xffffff, 1);
    this.flashLeft = 0.14;
  }

  setVisible(v: boolean): void {
    for (const o of [this.frame, this.lag, this.fill, this.ticks]) o.setVisible(v);
  }
}
