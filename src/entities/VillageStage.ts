// 밤 마을 무대. 어두운 마을 위에 '빛을 받은 마을'을 올리고, 빛 고임(루미·중앙 광원·켜진 등불)과 부채꼴이 닿은 곳만 보이게 마스크한다.
// 빛 자국과 켜진 마을은 매 프레임 화면 크기 RenderTexture 하나에 한 번에 그린다(WebGL, 2026-11-20 — 예전 BitmapMask). Canvas 렌더러에서는 켜진 마을을 생략한다.
// 콤보 단계마다 마을 창문·등불이 하나씩 켜지고, 반딧불이 늘어난다. 반짝이 별은 부채꼴·되돌림의 따뜻함을 보탠다.
// 2026-11-04: 마을은 화면보다 넓고(카메라가 따라감). 2026-11-12 새 기획: 빛 고임이 여러 개(update의 pools) — 루미 주변(LP 비례),
// 중앙 광원(광도 비례), 켜진 등불. 맵 전체 광도(systems/villageMood MapLight)가 켜진 마을 드러남(lit)과 어둠 덮개(gloom)를 정한다.
// 마스크·시간대 덮개·섬광은 화면 크기로 화면에 붙여 두고(scrollFactor 0), 마스크에 찍을 때 카메라 스크롤만큼 뺀다.
import Phaser from 'phaser';
import { Rng } from '../core/rng';
import { TextureKeys } from '../core/TextureKeys';
import { GameData, type NightPhase, type StageDef } from '../data';
import { follow } from '../systems/facing';
import { FAN_TEXTURE_RADIUS } from '../art/effects';
import { texScale } from '../core/textureRes';
import { WORLD_LIGHTS, type VillageLight } from '../art/village';
import { expandRatio } from '../systems/LightSystem';
import type { Vec } from '../systems/fan';
import { WorldCuller } from './WorldCuller';

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
/** 반딧불 무리 이벤트의 점 수 */
const SWARM_DOTS = 16;
const FAN_SPARKLES = 12;
/** 빛 고임의 늘 켜진 웅덩이는 글로우 반경의 이 비율만큼만: 쏜 부채꼴이 주인공이 되게 */
const LIT_POOL_RATIO = 0.55;
const LIT_POOL_ALPHA = 0.85;
const RETURN_SPARKLES = 6;
/** 피격으로 맵 광도가 떨어질 때 덮는 어둠의 색과 따라가는 시간 (제안) */
const GLOOM_COLOR = 0x0a0818;
const GLOOM_DARKEN_TAU = 0.35;
const GLOOM_LIFT_TAU = 0.15;
const SPARKLE_POOL = 64;
/** 빛 고임 글로우의 기본 색 (테마가 바꾼다) */
const POOL_GLOW = 0xffc857;

/** 맵 3종 = 스테이지 테마 (2026-11-13 컨셉 시연판, 색은 전부 제안).
 *  어두운 마을·켜진 마을 그림에 곱하는 색(tint), 어두운 마을만 덮는 테마 막(veil), 피격 어둠 색, 빛 고임·반딧불 색.
 *  새 객체를 만들지 않고 기존 객체의 색·알파만 바꾼다 (setTheme 한 번, 매 프레임 비용 없음) */
interface ThemeLook {
  dark: number;
  lit: number;
  veil: number;
  veilAlpha: number;
  gloom: number;
  glow: number;
  firefly: number;
}
const THEMES: Record<StageDef['theme'], ThemeLook> = {
  // 빛의 마을: 지금 그대로
  'light-village': { dark: 0xffffff, lit: 0xffffff, veil: 0x2a2f5a, veilAlpha: 0, gloom: GLOOM_COLOR, glow: POOL_GLOW, firefly: 0xffd27a },
  // 경계: 차가운 라벤더 톤, 켜진 마을은 살짝 식힘
  border: { dark: 0xbcb4f0, lit: 0xe6dcff, veil: 0x3a3570, veilAlpha: 0.14, gloom: 0x0e0b24, glow: 0xffd28c, firefly: 0xd2c8ff },
  // 어둠의 마을: 더 어둡고 보랏빛, 켜진 마을도 덜 따뜻하게
  'dark-village': { dark: 0x8c78c0, lit: 0xcab4ec, veil: 0x0f0a22, veilAlpha: 0.34, gloom: 0x150a2a, glow: 0xf2c49a, firefly: 0xb9a2ff },
};

/** 빛 고임 하나: 마을 좌표, 반지름, 세기(0~1) */
export interface LightPool {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  /** 따뜻한 글로우 진하기 배율 (기본 1). 빛의 마을처럼 마을만 은은히 드러내는 고임은 낮게 (2026-11-18) */
  glow?: number;
}

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
  /** 빛 자국만큼 드러난 켜진 마을 (화면 크기, WebGL만 — Canvas 렌더러에서는 켜진 마을을 생략) */
  private readonly litTexture: Phaser.GameObjects.RenderTexture | null = null;
  /** 빛 고임마다 하나씩 쓰는 글로우 */
  private readonly glows: Phaser.GameObjects.Image[] = [];
  /** 판이 끝날 때 빛 고임이 사그라드는 배율 */
  private dim = 1;
  private readonly flash: Phaser.GameObjects.Rectangle;
  private readonly fans: Fan[] = [];
  private readonly lights: LitPoint[] = [];
  private readonly fireflies: Firefly[] = [];
  /** 반딧불 무리(랜덤 이벤트, 2026-11-18): 한 자리에 모였다가 시간이 다 되면 흩어진다 */
  private readonly swarmDots: (Firefly & { life: number })[] = [];
  private readonly sparkles: Phaser.GameObjects.Image[] = [];
  private readonly rng = new Rng(777);
  private shadeColor = Phaser.Display.Color.ValueToColor(PHASE_SHADE.dusk.color);
  private flood = 0;
  /** 맵 전체 광도로 켜진 마을이 전체에 드러나는 정도 */
  private dawning = 0;
  /** 피격으로 마을을 덮는 어둠 (지금 값 → 목표로 부드럽게) */
  private gloom = 0;
  private gloomTarget = 0;
  private readonly gloomLayer: Phaser.GameObjects.Rectangle;
  private time = 0;
  /** 테마가 색을 바꾸는 두 겹의 마을 그림과 어두운 마을만 덮는 막 */
  private readonly darkLayer: Phaser.GameObjects.Image;
  private readonly litLayer: Phaser.GameObjects.Image;
  private readonly themeVeil: Phaser.GameObjects.Rectangle;
  private glowTint = POOL_GLOW;
  /** 구획 막 (2026-11-18): 중앙 광원에서 멀수록 어두운 막 — 어둠의 마을은 더 어둡다(테마별 진하기) */
  private readonly zoneVeil: Phaser.GameObjects.Image;
  private theme: StageDef['theme'] = 'light-village';
  /** 화면 밖 창문 빛·반딧불 끄기 (2026-11-20 휴대폰 렉) */
  private readonly culler = new WorldCuller();

  constructor(
    private readonly scene: Phaser.Scene,
    /** 루미의 현재 위치 (콤보 펄스의 별이 터지는 곳) */
    private readonly focus: Vec,
  ) {
    // 화면에 붙은 층(밤 색조·빛 마스크·번쩍임)은 지금 화면 크기로 만들고, 화면 방식이 바뀌면 resize()로 맞춘다 (2026-11-06 가로 화면)
    const W = scene.scale.width;
    const H = scene.scale.height;
    this.darkLayer = scene.add.image(0, 0, TextureKeys.villageDark).setOrigin(0).setScale(texScale(TextureKeys.villageDark)).setDepth(-1000);
    this.shade = scene.add.rectangle(0, 0, W, H, PHASE_SHADE.dusk.color, 0).setOrigin(0).setScrollFactor(0).setDepth(-950);
    // 테마 막: 어두운 마을 위·켜진 마을 아래 (빛이 닿은 곳은 막 위로 드러난다). 빛의 마을에선 숨김
    this.themeVeil = scene.add.rectangle(0, 0, W, H, 0x000000, 1).setOrigin(0).setScrollFactor(0).setDepth(-945).setVisible(false);

    // 구획 막: 어두운 마을 위·켜진 마을 아래 — 빛 고임(루미·광원·등불)이 닿은 곳은 막 위로 드러난다
    const zc = GameData.game.zones;
    this.zoneVeil = scene.add
      .image(GameData.game.central.x, GameData.game.central.y, zoneVeilTexture(scene, zc.lightRadius, zc.darkRadius, ZONE_VEIL_REACH))
      .setScale((ZONE_VEIL_REACH * 2) / ZONE_VEIL_TEX)
      .setDepth(-940)
      .setAlpha(zc.veil['light-village'] ?? 0.3);
    // 2026-11-20 휴대폰 가로 버벅임: BitmapMask(전체 화면 3번 더 그림 + 그릴 대상 3번 바꿈)와 빛 자국마다 대상을 바꾸던 것을 없앴다.
    // 이제 화면 크기 텍스처 하나(litTexture)에 매 프레임 한 번에: 지움 → 빛 자국(흰 알파) → 켜진 마을을 '알파만큼만 남김' 섞기(DST_ALPHA, ZERO)로.
    // 결과 = 켜진 마을 × 빛 자국 알파 — 예전 마스크와 같은 식. 그 텍스처를 어두운 마을 위(깊이 -900)에 그대로 올린다
    this.litLayer = scene.make.image({ x: 0, y: 0, key: TextureKeys.villageLit }, false).setOrigin(0).setScale(texScale(TextureKeys.villageLit));
    if (scene.renderer.type === Phaser.WEBGL) {
      this.litLayer.setBlendMode(keepByDestAlpha(scene.renderer as Phaser.Renderer.WebGL.WebGLRenderer));
      this.litTexture = scene.add.renderTexture(0, 0, W, H).setOrigin(0).setScrollFactor(0).setDepth(-900);
    }
    // 표시 목록에 넣지 않은 그림이라 씬이 끝날 때 직접 지운다
    const litLayer = this.litLayer;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => litLayer.destroy());

    for (const def of WORLD_LIGHTS) this.lights.push(this.makeLight(def));
    for (let i = 0; i < Math.min(FIREFLIES_MAX, FIREFLIES_BASE + FIREFLIES_PER_LIGHT * WORLD_LIGHTS.length); i++) this.fireflies.push(this.makeFirefly());
    for (const p of this.lights) {
      this.culler.add(p.pane);
      this.culler.add(p.glow);
    }
    // 반딧불은 제자리 둘레를 맴돈다(±40)
    for (const f of this.fireflies) this.culler.add(f.dot, 48);
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
    this.themeVeil.setSize(width, height);
    this.litTexture?.resize(width, height);
  }

  /** 맵 3종 = 스테이지 테마. 'light-village'는 지금 그대로, 'border'는 차가운 라벤더, 'dark-village'는 더 어둡고 보랏빛.
   *  판을 만든 뒤 한 번 부른다 (여러 번 불러도 같다) */
  setTheme(theme: StageDef['theme']): void {
    const look = THEMES[theme] ?? THEMES['light-village'];
    this.theme = theme;
    this.darkLayer.setTint(look.dark);
    this.litLayer.setTint(look.lit);
    this.themeVeil.setFillStyle(look.veil, 1).setAlpha(look.veilAlpha).setVisible(look.veilAlpha > 0);
    this.gloomLayer.setFillStyle(look.gloom, 1);
    this.glowTint = look.glow;
    this.zoneVeil.setAlpha(GameData.game.zones.veil[theme] ?? 0.3);
    for (const g of this.glows) g.setTint(look.glow);
    for (const f of this.fireflies) f.dot.setTint(look.firefly);
  }

  /** 지금 테마 */
  get currentTheme(): StageDef['theme'] {
    return this.theme;
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
      const x = origin.x + Math.cos(a) * r;
      const y = origin.y + Math.sin(a) * r;
      const delay = (r / range) * LIGHT.expandSec * 1000;
      this.sparkle(x, y, Math.cos(a) * 14, Math.sin(a) * 14 - 6, this.rng.range(0.35, 0.65), this.rng.range(420, 620), delay);
    }
  }

  // --- 시간대·끝 연출 ---

  /** 맵 전체 광도 (systems/villageMood MapLight): lit = 켜진 마을이 드러나는 정도, gloom = 어둠 덮개 */
  setMood(lit: number, gloom: number): void {
    this.dawning = lit;
    this.gloomTarget = gloom;
  }

  /** 회복·부활: 마을이 한 번 크게 환해진다 */
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

  /** 모든 등불이 켜짐(전체 활성 버프): 마을이 한 번 환해지고 at 둘레로 별이 흩어진다 */
  celebrate(at: Vec, durationSec: number): void {
    this.flood = Math.max(this.flood, 0.8);
    this.scene.tweens.add({ targets: this, flood: 0, duration: durationSec * 1000, ease: 'Sine.easeIn' });
    this.flash.setAlpha(0.22);
    this.scene.tweens.add({ targets: this.flash, alpha: 0, duration: durationSec * 1000, ease: 'Sine.easeOut' });
    for (let i = 0; i < 18; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const r = this.rng.range(60, 300);
      this.sparkle(
        at.x + Math.cos(a) * r,
        at.y + Math.sin(a) * r,
        Math.cos(a) * 20,
        Math.sin(a) * 20 - 10,
        this.rng.range(0.5, 0.9),
        this.rng.range(500, 800),
        this.rng.range(0, 200),
      );
    }
  }

  /** 반딧불 무리: at 둘레(radius 안)에 반딧불 점이 모여 durationSec 동안 머문다 */
  swarm(at: Vec, radius: number, durationSec: number): void {
    for (let i = 0; i < SWARM_DOTS; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const r = Math.sqrt(this.rng.range(0, 1)) * radius * 0.75;
      const home = { x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r };
      const dot = this.scene.add
        .image(home.x, home.y, TextureKeys.glow)
        .setTint(0xffe08a)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(this.rng.range(14, 20) / 256)
        .setAlpha(0)
        .setDepth(4050);
      this.swarmDots.push({ dot, home, t: this.rng.range(0, 100), speed: this.rng.range(0.5, 0.9), life: durationSec });
    }
  }

  /** 콤보 단계: 마을이 한 번 따뜻하게 환해진다 (깜빡임 아님: 한 번의 완만한 펄스) */
  pulse(): void {
    // 잠깐 머물렀다(0.18초) 천천히 가라앉는다: 눈에 남되 깜빡이지 않게
    this.flood = Math.max(this.flood, 0.6);
    this.scene.tweens.add({ targets: this, flood: 0, delay: 180, duration: 750, ease: 'Sine.easeIn' });
    this.burstAt(this.focus.x, this.focus.y - 20, 10, 1);
  }

  /** 아침(스테이지 끝): 마을 전체가 켜진다 */
  dawn(durationSec: number): void {
    this.setPhase('dawn');
    this.scene.tweens.add({ targets: this, flood: 1, duration: durationSec * 1000, ease: 'Sine.easeInOut' });
  }

  /** 오늘은 여기까지: 빛 고임이 사그라들고 집집의 창문만 남는다 */
  fadeOut(durationSec: number): void {
    this.scene.tweens.add({ targets: this, flood: 0, dim: 0.25, duration: durationSec * 1000, ease: 'Sine.easeIn' });
  }

  update(dt: number, pools: readonly LightPool[]): void {
    this.time += dt;
    this.culler.update(this.scene.cameras.main);
    // 어두워질 땐 천천히, 회복으로 밝아질 땐 빨리
    const tau = this.gloomTarget > this.gloom ? GLOOM_DARKEN_TAU : GLOOM_LIFT_TAU;
    this.gloom += (this.gloomTarget - this.gloom) * follow(dt, tau);
    this.gloomLayer.setAlpha(this.gloom);
    while (this.glows.length < pools.length) {
      this.glows.push(this.scene.add.image(0, 0, TextureKeys.glow).setTint(this.glowTint).setBlendMode(Phaser.BlendModes.ADD).setDepth(-860));
    }
    this.glows.forEach((g, i) => {
      const p = pools[i];
      g.setVisible(!!p && p.radius > 0);
      if (p) g.setPosition(p.x, p.y).setScale((p.radius * 2) / 256).setAlpha(GLOW_ALPHA * p.alpha * (p.glow ?? 1) * this.dim);
    });

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

    for (let i = this.swarmDots.length - 1; i >= 0; i--) {
      const f = this.swarmDots[i];
      f.t += dt * f.speed;
      f.life -= dt;
      // 천천히 나타나고(따라가기), 끝 1.5초 동안 사라지며 위로 흩어진다 (깜빡임 아님: 완만한 숨쉬기)
      const fade = Math.min(1, f.life / 1.5);
      const target = Math.max(0, fade) * (0.6 + 0.35 * Math.sin(f.t * 2.3));
      f.dot.setAlpha(f.dot.alpha + (target - f.dot.alpha) * Math.min(1, dt * 1.5));
      f.dot.setPosition(f.home.x + Math.sin(f.t) * 22 + Math.sin(f.t * 0.37) * 10, f.home.y + Math.cos(f.t * 0.8) * 16 - Math.max(0, -f.life) * 30);
      if (f.life < -1) {
        f.dot.destroy();
        this.swarmDots.splice(i, 1);
      }
    }

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

    const rt = this.litTexture;
    if (!rt) return;
    // 한 번에 그린다. Phaser 3.90의 DynamicTexture는 beginDraw마다 따로 받는 버퍼를 지우고, endDraw에서 그것을 텍스처로 화면 크기만큼 옮겨 그린다
    // → 예전처럼 stamp마다 begin/end를 하면 빛 자국 하나에 전체 화면 지우기 + 옮겨 그리기가 한 번씩 (휴대폰 GPU가 가장 힘들어하는 일)
    const renderer = this.scene.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
    rt.beginDraw();
    // 2026-11-20: 그리는 도중 예외가 나도 꼭 끝낸다 — 안 끝내면 그 뒤 프레임이 모두 받는 버퍼에 그려져 화면이 멎는다
    try {
      const base = Math.max(this.flood, this.dawning);
      if (base > 0) {
        const white = this.scene.textures.getFrame('__WHITE');
        rt.stamp('__WHITE', undefined, 0, 0, { originX: 0, originY: 0, scaleX: rt.width / white.width, scaleY: rt.height / white.height, alpha: base, skipBatch: true });
      }
      // 화면에 붙어 있으므로 마을 좌표에서 카메라 스크롤을 뺀 자리에 찍는다
      const cam = this.scene.cameras.main;
      for (const p of pools) {
        if (p.radius <= 0) continue;
        rt.stamp(TextureKeys.glowMask, undefined, p.x - cam.scrollX, p.y - cam.scrollY, {
          scale: (p.radius * 2 * LIT_POOL_RATIO) / 256,
          alpha: p.alpha * LIT_POOL_ALPHA * this.dim,
          skipBatch: true,
        });
      }
      for (const f of this.fans) {
        const r = f.range * expandRatio(f.age, expand);
        const fade = f.age <= expand ? 1 : 1 - (f.age - expand) / LIT_AFTERGLOW_SEC;
        rt.stamp(TextureKeys.fanMask, undefined, f.ox - cam.scrollX, f.oy - cam.scrollY, {
          originX: 0,
          originY: 0.5,
          rotation: f.angle,
          scale: r / FAN_TEXTURE_RADIUS,
          alpha: Math.max(0, fade),
          skipBatch: true,
        });
      }
      // 켜진 마을: 빛 자국의 알파만큼만 남는다
      rt.batchDraw(this.litLayer, -cam.scrollX, -cam.scrollY);
    } finally {
      // endDraw의 옮겨 그리기는 마지막 섞기 방식을 그대로 쓴다 → '그대로 덮어쓰기'로 두면 텍스처를 따로 지울 필요도 없다
      renderer.setBlendMode(blendModes(renderer).copy);
      rt.endDraw();
      renderer.setBlendMode(Phaser.BlendModes.NORMAL);
    }
  }
}

/** 켜진 마을용 섞기 두 가지 (렌더러마다 한 번만 만든다)
 *  keep = 이미 그려진 알파만큼만 남김(결과 = 그림 × 그 자리 알파, 예전 마스크와 같은 식), copy = 그대로 덮어쓰기 */
const BLENDS = new WeakMap<Phaser.Renderer.WebGL.WebGLRenderer, { keep: number; copy: number }>();
function blendModes(r: Phaser.Renderer.WebGL.WebGLRenderer): { keep: number; copy: number } {
  let m = BLENDS.get(r);
  if (!m) {
    const gl = r.gl;
    m = { keep: r.addBlendMode([gl.DST_ALPHA, gl.ZERO], gl.FUNC_ADD), copy: r.addBlendMode([gl.ONE, gl.ZERO], gl.FUNC_ADD) };
    BLENDS.set(r, m);
  }
  return m;
}
const keepByDestAlpha = (r: Phaser.Renderer.WebGL.WebGLRenderer): number => blendModes(r).keep;

/** 구획 막 그림 크기·덮는 반지름(마을 모서리까지 약 1840) */
const ZONE_VEIL_TEX = 512;
const ZONE_VEIL_REACH = 1900;

/** 구획 막: 가운데(빛의 마을)는 비고, 경계에서 짙어져 어둠의 마을은 가득 — 한 번만 굽는다 */
function zoneVeilTexture(scene: Phaser.Scene, lightR: number, darkR: number, reach: number): string {
  const key = `zone-veil-${lightR}-${darkR}`;
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, ZONE_VEIL_TEX, ZONE_VEIL_TEX);
  if (!tex) return key;
  const ctx = tex.getContext();
  const r = ZONE_VEIL_TEX / 2;
  const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, 'rgba(10,8,28,0)');
  grad.addColorStop(Math.min(0.99, lightR / reach), 'rgba(10,8,28,0)');
  grad.addColorStop(Math.min(0.995, darkR / reach), 'rgba(10,8,28,0.6)');
  grad.addColorStop(1, 'rgba(10,8,28,1)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, ZONE_VEIL_TEX, ZONE_VEIL_TEX);
  tex.refresh();
  return key;
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
