// 밤 마을 무대. 어두운 마을 위에 '빛을 받은 마을'을 올리고, 등불 글로우와 부채꼴이 닿은 곳만 보이게 마스크한다.
// 마스크는 매 프레임 RenderTexture에 그려 BitmapMask로 쓴다(WebGL). Canvas 렌더러에서는 켜진 마을을 생략한다.
// 콤보 단계마다 마을 창문·등불이 하나씩 켜지고, 반딧불이 늘어난다. 반짝이 별은 부채꼴·되돌림의 따뜻함을 보탠다.
// 2026-11-04: 마을은 화면보다 넓고(카메라가 따라감) 등불은 등불지기가 들고 다닌다.
// 마스크·시간대 덮개·섬광은 화면 크기로 화면에 붙여 두고(scrollFactor 0), 마스크에 찍을 때 카메라 스크롤만큼 뺀다.
import Phaser from 'phaser';
import { Rng } from '../core/rng';
import { TextureKeys } from '../core/TextureKeys';
import { GameData, type NightPhase } from '../data';
import { brightenAt, gloomAt } from '../systems/villageMood';
import { follow } from '../systems/facing';
import { FAN_TEXTURE_RADIUS } from '../art/effects';
import { texScale } from '../core/textureRes';
import { WORLD_LIGHTS, type VillageLight } from '../art/village';
import { expandRatio } from '../systems/LightSystem';
import type { Vec } from '../systems/fan';

/** 마을(월드) 크기 */
const WORLD = GameData.game.world;
const LIGHT = GameData.game.light;
const FAN_HALF = (LIGHT.fanDeg * Math.PI) / 360;

// 아래 연출 수치는 전부 제안: 기획서에 없음
/** 부채꼴이 다 퍼진 뒤에도 켜진 마을이 남아 있는 시간 */
const LIT_AFTERGLOW_SEC = 0.25;
const PHASE_TWEEN_MS = 1500;
/** 켜진 마을 위에 더하는 등불 글로우. 너무 세면 바랜다 */
const GLOW_ALPHA = 0.3;
/** 시간대별로 마을 위에 덮는 밤의 깊이 */
const PHASE_SHADE: Record<NightPhase, { color: number; alpha: number }> = {
  dusk: { color: 0x2a2f5a, alpha: 0 },
  midnight: { color: 0x1b1f3b, alpha: 0.22 },
  predawn: { color: 0x120f24, alpha: 0.38 },
  dawn: { color: 0xf2b880, alpha: 0.18 },
};
const FIREFLIES_BASE = 28;
/** 넓은 마을에서 등불이 많아도 반딧불은 이만큼까지 (60fps) */
const FIREFLIES_MAX = 72;
const FIREFLIES_PER_LIGHT = 2;
const FAN_SPARKLES = 12;
/** 등불 둘레에 늘 켜진 빛 웅덩이는 글로우 반경의 이 비율만큼만: 탭한 부채꼴이 주인공이 되게 */
const LIT_POOL_RATIO = 0.55;
const LIT_POOL_ALPHA = 0.85;
const RETURN_SPARKLES = 6;
/** 등불이 맞을 때 마을을 덮는 어둠의 색과 따라가는 시간 (제안) */
const GLOOM_COLOR = 0x0a0818;
const GLOOM_DARKEN_TAU = 0.35;
const GLOOM_LIFT_TAU = 0.15;
const SPARKLE_POOL = 64;

interface Fan {
  /** 쏜 자리 (등불지기가 움직여도 빛은 여기서 퍼진다) */
  ox: number;
  oy: number;
  angle: number;
  range: number;
  age: number;
  light: Phaser.GameObjects.Image;
}

interface LitPoint {
  def: VillageLight;
  on: boolean;
  glow: Phaser.GameObjects.Image;
  pane: Phaser.GameObjects.Image;
  phase: number;
}

interface Firefly {
  dot: Phaser.GameObjects.Image;
  home: Vec;
  t: number;
  speed: number;
}

export class VillageStage {
  private readonly shade: Phaser.GameObjects.Rectangle;
  private readonly lit: Phaser.GameObjects.Container;
  private readonly maskTexture: Phaser.GameObjects.RenderTexture | null = null;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly flash: Phaser.GameObjects.Rectangle;
  private readonly fans: Fan[] = [];
  private readonly lights: LitPoint[] = [];
  private readonly fireflies: Firefly[] = [];
  private readonly sparkles: Phaser.GameObjects.Image[] = [];
  private readonly rng = new Rng(777);
  private shadeColor = Phaser.Display.Color.ValueToColor(PHASE_SHADE.dusk.color);
  private flood = 0;
  /** 밤 진행에 따라 켜진 마을이 전체에 드러나는 정도 (0~brightenMax) */
  private dawning = 0;
  /** 등불이 맞을수록 마을을 덮는 어둠 (지금 값 → 목표로 부드럽게) */
  private gloom = 0;
  private gloomTarget = 0;
  private readonly gloomLayer: Phaser.GameObjects.Rectangle;
  private time = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    /** 들고 다니는 등불의 현재 위치 (Lantern.pos를 그대로 받아 매 프레임 읽는다) */
    private readonly lantern: Vec,
  ) {
    // 화면에 붙은 층(밤 색조·빛 마스크·번쩍임)은 지금 화면 크기로 만들고, 화면 방식이 바뀌면 resize()로 맞춘다 (2026-11-06 가로 화면)
    const W = scene.scale.width;
    const H = scene.scale.height;
    scene.add.image(0, 0, TextureKeys.villageDark).setOrigin(0).setScale(texScale(TextureKeys.villageDark)).setDepth(-1000);
    this.shade = scene.add.rectangle(0, 0, W, H, PHASE_SHADE.dusk.color, 0).setOrigin(0).setScrollFactor(0).setDepth(-950);

    this.lit = scene.add.container(0, 0, [scene.add.image(0, 0, TextureKeys.villageLit).setOrigin(0).setScale(texScale(TextureKeys.villageLit))]);
    this.lit.setDepth(-900);
    if (scene.renderer.type === Phaser.WEBGL) {
      this.maskTexture = scene.make.renderTexture({ x: 0, y: 0, width: W, height: H }, false).setOrigin(0).setScrollFactor(0);
      this.lit.setMask(this.maskTexture.createBitmapMask());
      // 표시 목록에 넣지 않은 텍스처라 씬이 끝날 때 직접 지운다 (판마다 GPU 메모리가 쌓이지 않게)
      const rt = this.maskTexture;
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => rt.destroy());
    } else {
      this.lit.setVisible(false);
    }

    this.glow = scene.add
      .image(lantern.x, lantern.y, TextureKeys.glow)
      .setTint(0xffc857)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(GLOW_ALPHA)
      .setDepth(-860);

    for (const def of WORLD_LIGHTS) this.lights.push(this.makeLight(def));
    for (let i = 0; i < Math.min(FIREFLIES_MAX, FIREFLIES_BASE + FIREFLIES_PER_LIGHT * WORLD_LIGHTS.length); i++) this.fireflies.push(this.makeFirefly());
    for (let i = 0; i < SPARKLE_POOL; i++) {
      this.sparkles.push(
        scene.add.image(0, 0, TextureKeys.sparkle).setBlendMode(Phaser.BlendModes.ADD).setVisible(false).setDepth(4100),
      );
    }

    this.flash = scene.add
      .rectangle(0, 0, W, H, 0xffe0a8, 1)
      .setOrigin(0)
      .setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setDepth(5000);

    // 어둠: 마을·이웃·루미 위, 빛 부채꼴(4000) 아래 — 빛은 어둠을 뚫고 보인다
    this.gloomLayer = scene.add.rectangle(0, 0, W, H, GLOOM_COLOR, 1).setOrigin(0).setScrollFactor(0).setAlpha(0).setDepth(3900);

    this.setCombo(0, true);
  }

  /** 화면 크기가 바뀜 (세로 ↔ 가로, 창 크기) */
  resize(width: number, height: number): void {
    this.shade.setSize(width, height);
    this.flash.setSize(width, height);
    this.gloomLayer.setSize(width, height);
    this.maskTexture?.resize(width, height);
  }

  // --- 마을 불빛 ---

  private makeLight(def: VillageLight): LitPoint {
    const scene = this.scene;
    let pane: LitPoint['pane'];
    if (def.kind === 'window') {
      // 2026-11-06 버벅임 보완: 도형(Graphics)은 매 프레임 다시 쪼개 그려 무겁다 → 크기별로 한 번 구운 그림을 쓴다
      pane = scene.add.image(def.x, def.y, windowPaneTexture(scene, def.w, def.h)).setDepth(-880);
    } else {
      pane = scene.add.image(def.x, def.y, TextureKeys.hangingLantern, 0).setScale(texScale(TextureKeys.hangingLantern)).setDepth(-880);
    }
    const glow = scene.add
      .image(def.x, def.y, TextureKeys.glow)
      .setTint(0xffb347)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale((Math.max(def.w, def.h) * 3.2) / 256)
      .setDepth(-870);
    return { def, on: false, glow, pane, phase: this.rng.range(0, Math.PI * 2) };
  }

  private setLight(p: LitPoint, on: boolean, instant: boolean): void {
    if (p.on === on && !instant) return;
    p.on = on;
    // 매단 등불은 꺼진 모습(프레임 0)과 켜진 모습(프레임 1), 창문은 유리빛을 켜고 끈다
    if (p.def.kind !== 'window') p.pane.setFrame(on ? 1 : 0);
    const paneAlpha = p.def.kind === 'window' ? (on ? 1 : 0) : 1;
    const glowAlpha = on ? 0.55 : 0;
    if (instant) {
      p.pane.setAlpha(paneAlpha);
      p.glow.setAlpha(glowAlpha);
      return;
    }
    this.scene.tweens.add({ targets: p.pane, alpha: paneAlpha, duration: on ? 300 : 900 });
    this.scene.tweens.add({ targets: p.glow, alpha: glowAlpha, duration: on ? 300 : 900 });
    if (on) {
      const s = p.glow.scale;
      this.scene.tweens.add({ targets: p.glow, scale: s * 1.5, duration: 220, yoyo: true, ease: 'Quad.easeOut' });
      this.burstAt(p.def.x, p.def.y, 4, 0.6);
    }
  }

  /** 콤보만큼 마을 창문·등불을 켠다. 콤보가 줄면 천천히 다시 꺼진다 */
  setCombo(combo: number, instant = false): void {
    for (const p of this.lights) this.setLight(p, combo >= p.def.combo, instant);
  }

  private get litCount(): number {
    return this.lights.filter((p) => p.on).length;
  }

  // --- 반딧불 ---

  private makeFirefly(): Firefly {
    const home = { x: this.rng.range(20, WORLD.width - 20), y: this.rng.range(60, WORLD.height - 60) };
    const dot = this.scene.add
      .image(home.x, home.y, TextureKeys.glow)
      .setTint(0xffd27a)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(14 / 256)
      .setAlpha(0)
      .setDepth(4050);
    return { dot, home, t: this.rng.range(0, 100), speed: this.rng.range(0.35, 0.7) };
  }

  // --- 반짝이 별 ---

  private sparkle(x: number, y: number, dx: number, dy: number, size: number, ms: number, delay = 0): void {
    const s = this.sparkles.find((p) => !p.visible);
    if (!s) return;
    s.setPosition(x, y).setScale(0).setAlpha(1).setVisible(true).setRotation(this.rng.range(0, Math.PI));
    s.setTint(this.rng.chance(0.5) ? 0xffffff : 0xffd27a);
    this.scene.tweens.add({
      targets: s,
      x: x + dx,
      y: y + dy,
      scale: { from: 0, to: size },
      rotation: s.rotation + 1.2,
      duration: ms * 0.45,
      delay,
      ease: 'Quad.easeOut',
      onComplete: () =>
        this.scene.tweens.add({
          targets: s,
          scale: 0,
          alpha: 0,
          y: s.y - 10,
          duration: ms * 0.55,
          ease: 'Quad.easeIn',
          onComplete: () => s.setVisible(false),
        }),
    });
  }

  /** 되돌림 순간 터지는 별 조각 */
  burstAt(x: number, y: number, count = RETURN_SPARKLES, size = 0.7): void {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + this.rng.range(-0.3, 0.3);
      const d = this.rng.range(18, 34);
      this.sparkle(x, y, Math.cos(a) * d, Math.sin(a) * d - 8, size * this.rng.range(0.7, 1.1), this.rng.range(450, 650));
    }
  }

  /** 빛 부채꼴: origin(루미 중심)에서 퍼진다 */
  addFan(origin: Vec, angle: number, range: number): void {
    const light = this.scene.add
      .image(origin.x, origin.y, TextureKeys.fanLight)
      .setOrigin(0, 0.5)
      .setRotation(angle)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4000)
      .setScale(0);
    this.fans.push({ ox: origin.x, oy: origin.y, angle, range, age: 0, light });
    // 부채꼴 안에 흩날리는 별
    for (let i = 0; i < FAN_SPARKLES; i++) {
      const r = range * this.rng.range(0.3, 0.92);
      const a = angle + this.rng.range(-FAN_HALF * 0.85, FAN_HALF * 0.85);
      const x = this.lantern.x + Math.cos(a) * r;
      const y = this.lantern.y + Math.sin(a) * r;
      const delay = (r / range) * LIGHT.expandSec * 1000;
      this.sparkle(x, y, Math.cos(a) * 14, Math.sin(a) * 14 - 6, this.rng.range(0.35, 0.65), this.rng.range(420, 620), delay);
    }
  }

  // --- 시간대·끝 연출 ---

  /**
   * 마을 분위기 (2026-11-06 라이언 지시, systems/villageMood): progress = 밤 진행률 0~1, hpRatio = 등불 HP 비율.
   * 밤이 흐를수록 점점 빨리 밝아지고, 등불이 맞을수록 어두워지며(밤이 깊을수록 깊게), 회복하면 그만큼 밝아진다
   */
  setMood(progress: number, hpRatio: number): void {
    const cfg = GameData.game.village;
    this.dawning = brightenAt(progress, cfg);
    this.gloomTarget = gloomAt(hpRatio, progress, cfg);
  }

  /** 등불이 회복됨: 어둠이 빨리 걷히고 마을이 한 번 크게 환해진다 */
  healGlow(): void {
    this.flood = Math.max(this.flood, 0.5);
    this.scene.tweens.add({ targets: this, flood: 0, delay: 150, duration: 700, ease: 'Sine.easeIn' });
  }

  setPhase(phase: NightPhase, instant = false): void {
    const to = PHASE_SHADE[phase];
    const toColor = Phaser.Display.Color.ValueToColor(to.color);
    if (instant) {
      this.shadeColor = toColor;
      this.shade.setFillStyle(to.color, to.alpha);
      return;
    }
    const from = this.shadeColor;
    const fromAlpha = this.shade.fillAlpha;
    this.scene.tweens.addCounter({
      from: 0,
      to: 100,
      duration: PHASE_TWEEN_MS,
      ease: 'Sine.easeInOut',
      onUpdate: (tw) => {
        const v = tw.getValue() ?? 0;
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(from, toColor, 100, v);
        this.shade.setFillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), fromAlpha + ((to.alpha - fromAlpha) * v) / 100);
      },
      onComplete: () => (this.shadeColor = toColor),
    });
  }

  /** 대광원: 광장 전체가 환해지고 별이 흩어진다 */
  burst(durationSec: number): void {
    this.flood = 1;
    this.scene.tweens.add({ targets: this, flood: 0, duration: durationSec * 1000, ease: 'Sine.easeIn' });
    this.flash.setAlpha(0.3);
    this.scene.tweens.add({ targets: this.flash, alpha: 0, duration: durationSec * 1000, ease: 'Sine.easeOut' });
    for (let i = 0; i < 18; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const r = this.rng.range(60, 300);
      this.sparkle(
        this.lantern.x + Math.cos(a) * r,
        this.lantern.y + Math.sin(a) * r,
        Math.cos(a) * 20,
        Math.sin(a) * 20 - 10,
        this.rng.range(0.5, 0.9),
        this.rng.range(500, 800),
        this.rng.range(0, 200),
      );
    }
  }

  /** 콤보 단계: 마을이 한 번 따뜻하게 환해진다 (깜빡임 아님: 한 번의 완만한 펄스) */
  pulse(): void {
    // 잠깐 머물렀다(0.18초) 천천히 가라앉는다: 눈에 남되 깜빡이지 않게
    this.flood = Math.max(this.flood, 0.6);
    this.scene.tweens.add({ targets: this, flood: 0, delay: 180, duration: 750, ease: 'Sine.easeIn' });
    this.burstAt(this.lantern.x, this.lantern.y - 20, 10, 1);
  }

  /** 새벽: 마을 전체가 켜진다 */
  dawn(durationSec: number): void {
    this.setPhase('dawn');
    this.scene.tweens.add({ targets: this, flood: 1, duration: durationSec * 1000, ease: 'Sine.easeInOut' });
  }

  /** 등불이 꺼질 때: 광장의 빛은 사라지고 집집의 창문만 남는다 */
  fadeOut(durationSec: number): void {
    this.scene.tweens.add({ targets: this, flood: 0, duration: durationSec * 1000 });
    this.scene.tweens.add({ targets: this.glow, alpha: 0.1, duration: durationSec * 1000, ease: 'Sine.easeIn' });
  }

  update(dt: number, glowRadius: number, glowAlpha = 1): void {
    this.time += dt;
    // 어두워질 땐 천천히, 회복으로 밝아질 땐 빨리
    const tau = this.gloomTarget > this.gloom ? GLOOM_DARKEN_TAU : GLOOM_LIFT_TAU;
    this.gloom += (this.gloomTarget - this.gloom) * follow(dt, tau);
    this.gloomLayer.setAlpha(this.gloom);
    this.glow.setPosition(this.lantern.x, this.lantern.y).setScale((glowRadius * 2) / 256).setAlpha(GLOW_ALPHA * glowAlpha);

    // 켜진 불빛은 아주 살짝 일렁인다(깜빡임 아님: 초당 1회 미만의 완만한 변화)
    for (const p of this.lights) {
      if (p.on && !this.scene.tweens.isTweening(p.glow)) p.glow.setAlpha(0.5 + 0.08 * Math.sin(this.time * 2.1 + p.phase));
    }

    const visible = FIREFLIES_BASE + FIREFLIES_PER_LIGHT * this.litCount;
    this.fireflies.forEach((f, i) => {
      f.t += dt * f.speed;
      const on = i < visible;
      const target = on ? 0.55 + 0.35 * Math.sin(f.t * 2.3) : 0;
      f.dot.setAlpha(f.dot.alpha + (target - f.dot.alpha) * Math.min(1, dt * 2));
      f.dot.setPosition(f.home.x + Math.sin(f.t) * 26 + Math.sin(f.t * 0.37) * 14, f.home.y + Math.cos(f.t * 0.8) * 18);
    });

    const expand = LIGHT.expandSec;
    for (let i = this.fans.length - 1; i >= 0; i--) {
      const f = this.fans[i];
      f.age += dt;
      const r = f.range * expandRatio(f.age, expand);
      f.light.setScale(r / FAN_TEXTURE_RADIUS).setAlpha(0.9 * Math.max(0, 1 - f.age / (expand + LIT_AFTERGLOW_SEC)));
      if (f.age >= expand + LIT_AFTERGLOW_SEC) {
        f.light.destroy();
        this.fans.splice(i, 1);
      }
    }

    const rt = this.maskTexture;
    if (!rt) return;
    rt.clear();
    const base = Math.max(this.flood, this.dawning);
    if (base > 0) rt.fill(0xffffff, base);
    // 마스크는 화면에 붙어 있으므로 마을 좌표에서 카메라 스크롤을 뺀 자리에 찍는다
    const cam = this.scene.cameras.main;
    rt.stamp(TextureKeys.glowMask, undefined, this.lantern.x - cam.scrollX, this.lantern.y - cam.scrollY, {
      scale: (glowRadius * 2 * LIT_POOL_RATIO) / 256,
      alpha: glowAlpha * LIT_POOL_ALPHA,
    });
    for (const f of this.fans) {
      const r = f.range * expandRatio(f.age, expand);
      const fade = f.age <= expand ? 1 : 1 - (f.age - expand) / LIT_AFTERGLOW_SEC;
      rt.stamp(TextureKeys.fanMask, undefined, f.ox - cam.scrollX, f.oy - cam.scrollY, {
        originX: 0,
        originY: 0.5,
        rotation: f.angle,
        scale: r / FAN_TEXTURE_RADIUS,
        alpha: Math.max(0, fade),
      });
    }
  }
}

/** 창문 유리빛 그림(크기별로 한 번만 굽는다): 아치 창 또는 둥근 창 + 창살 */
function windowPaneTexture(scene: Phaser.Scene, w: number, h: number): string {
  const key = `window-pane-${w}x${h}`;
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({}, false);
  g.fillStyle(0xffc857, 1);
  if (w === h) g.fillCircle(w / 2, h / 2, w / 2 - 4);
  else g.fillRoundedRect(4, 4, w - 8, h - 8, { tl: w / 2 - 4, tr: w / 2 - 4, bl: 2, br: 2 });
  // 창살
  g.lineStyle(2.5, 0x6b4630, 1);
  g.lineBetween(w / 2, 4, w / 2, h - 4);
  g.lineBetween(4, h / 2, w - 4, h / 2);
  g.generateTexture(key, w, h);
  g.destroy();
  return key;
}
