// 광원 HP 게이지 (2026-11-13 라이언: 중앙 광원·등불의 체력이 플레이어에게 잘 보여야 함, 2026-11-14: 게이지 = HP, 광도 = HP 비례).
// 그림 위에 떠 있는 굵은 막대: 광도 4단계 눈금(HP 25·50·75%), 단계마다 색(노랑 → 호박 → 새벽빛 → 잔불),
// 맞으면 줄어든 만큼 흰 잔상이 남았다가 따라 줄고 테두리가 번쩍인다. 판정은 하지 않는다.
import Phaser from 'phaser';
import { GameData } from '../data';
import { bakeTexture } from './bake';

const BANDS = GameData.game.lightLevels.bands;
/** 단계별 채움 색: 낮음(잔불) · 중간(새벽빛) · 밝음(호박) · 크게 밝음(노랑) */
const BAND_COLORS = [0xff8c5a, 0xf2b880, 0xffc857, 0xffe27a];
const IGNITE_COLOR = 0xfff1c9;
/** 흰 잔상이 따라 주는 빠르기 (막대 비율/초) */
const LAG_PER_SEC = 0.5;
/** 캐릭터·적(깊이 = y)보다 위, 풀숲(6000)보다 아래 */
const DEPTH = 4500;

/** 테두리 그림의 가장자리 여유 (선 두께) */
const PAD = 2;

/** 2026-11-20 휴대폰 렉: 테두리(둥근 사각형)·눈금은 매 프레임 다시 쪼개지는 Graphics 대신 크기별로 한 번 구운 그림.
 *  맞았을 때 번쩍임은 미리 구운 '밝은 테두리' 그림으로 바꿔 끼운다 */
export class SourceGauge {
  private readonly frame: Phaser.GameObjects.Image;
  private readonly frameKeys: { normal: string; flash: string };
  private readonly lag: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly ticks: Phaser.GameObjects.Image;
  private shown = -1;
  private lagRatio = 0;
  private flashLeft = 0;
  private t = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    const frameKey = (name: string, bg: number, line: number, lineAlpha: number) =>
      bakeTexture(scene, `gauge-frame-${name}-${w}x${h}`, w + 6 + PAD * 2, h + 6 + PAD * 2, (g) => {
        const r = Math.min(6, (h + 6) / 2);
        g.fillStyle(bg, 0.88);
        g.fillRoundedRect(PAD, PAD, w + 6, h + 6, r);
        g.lineStyle(1.5, line, lineAlpha);
        g.strokeRoundedRect(PAD, PAD, w + 6, h + 6, r);
      });
    this.frameKeys = { normal: frameKey('normal', 0x14152e, 0xf6f1e7, 0.55), flash: frameKey('flash', 0x2a1f3d, 0xffffff, 1) };
    this.frame = scene.add.image(x, y, this.frameKeys.normal).setDepth(DEPTH);
    const left = x - w / 2;
    this.lag = scene.add.rectangle(left, y, w, h, 0xf6f1e7, 0.85).setOrigin(0, 0.5).setDepth(DEPTH + 0.1).setScale(0, 1);
    this.fill = scene.add.rectangle(left, y, w, h, BAND_COLORS[2], 1).setOrigin(0, 0.5).setDepth(DEPTH + 0.2).setScale(0, 1);
    // 광도 4단계 눈금
    const ticksKey = bakeTexture(scene, `gauge-ticks-${w}x${h}`, w, h, (g) => {
      g.lineStyle(1.5, 0x14152e, 0.75);
      for (const b of BANDS) {
        const tx = (w * b) / 100;
        g.lineBetween(tx, 1, tx, h - 1);
      }
    });
    this.ticks = scene.add.image(x, y, ticksKey).setDepth(DEPTH + 0.3);
  }

  /** @param ratio HP 비율 0~1 · value 광도 0~100(색 단계) · igniting = 점화 중(ratio는 점화 진행) · off = 꺼짐(흐리게) */
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
      if (this.flashLeft <= 0) this.frame.setTexture(this.frameKeys.normal);
    }
  }

  /** 맞음: 테두리가 잠깐 하얗게 번쩍인다 */
  flash(): void {
    if (this.flashLeft <= 0) this.frame.setTexture(this.frameKeys.flash);
    this.flashLeft = 0.14;
  }

  setVisible(v: boolean): void {
    for (const o of [this.frame, this.lag, this.fill, this.ticks]) o.setVisible(v);
  }
}
