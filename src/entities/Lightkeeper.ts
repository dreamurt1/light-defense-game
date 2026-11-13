// 등불지기 루미 (2026-11-04 전면 재구성, 2026-11-06 정지·걷기는 ChatGPT 8방향 팩).
// 360° 어느 쪽으로든 걷고, 바라보는 쪽을 8방위 모습으로 보여 준다. 바라보는 쪽은 걷는 방향이고(빛 스틱·마우스로 끄는
// 동안에도 그대로, 멈춰 있으면 마지막 방향), 빛을 보내는 순간(공격 동작 동안)에만 그 방향을 본다(2026-11-06 라이언 지시).
// 툭툭 바뀌지 않게 부드럽게 돌아간다(영문 지시서 'smooth directional transitions').
// 그림은 정지·걷기 두 가지이고, 공격·피격·부활은 그 선명한 그림 위에 동작 효과(systems/keeperMotion)를 더한다
// (2026-11-06: 시트의 작은 공격·피격·부활 그림은 확대되면 깨져 보여 쓰지 않음). 연출: 넉아웃(등불이 꺼질 때 잠듦).
// 2026-11-12 새 기획: 루미는 등불을 들지 않고 스스로 빛을 쏜다(라이언 답변). 하트를 잃으면 잠들고(KO) 중앙 광원 옆에서 부활한다.
import Phaser from 'phaser';
import { TextureKeys } from '../core/TextureKeys';
import { texScale } from '../core/textureRes';
import { GameData, type CharacterDef } from '../data';
import { CELL, FEET_Y } from '../art/lumiSheet';
import { dirOf, follow, turnToward, type Dir } from '../systems/facing';
import type { Vec } from '../systems/fan';
import { MOTION_SEC, REST, motionPose, type MotionKind, type Pose } from '../systems/keeperMotion';
import { prefersReducedMotion } from '../ui/dom';

// 아래 수치는 모두 제안: 기획서에 없음
/** 시트 칸(디자인 64)을 게임 안 크기로: 그림 한 칸 128×128 (2026-11-06 라이언 지시. 이전 80, 영문 지시서 권장 64) */
const DISPLAY = 2;
/** 몸 가운데(pos)에서 발끝까지. PlayScene이 장애물·풀숲을 이 발 위치로 판정한다 (손·그림자·먼지 값과 함께 칸 크기에 비례) */
export const KEEPER_FOOT_Y = 32;
const FOOT_Y = KEEPER_FOOT_Y;
/** 바라보는 각도가 따라가는 반응 시간 */
const TURN_TAU = 0.06;
/** 걸을 때 발밑 먼지 ('게임 내 연출 예시 – 이동') */
const DUST_EVERY = 0.16;
const DUST_POOL = 10;
/** 피격 흰 번쩍임 */
const FLASH_MS = 70;
/** 걷기 9fps가 맞춰진 이동 속도: 더 빨리 걸으면 걷기 동작도 같은 비율로 빨라져 발이 미끄러져 보이지 않는다 */
const WALK_TUNED_SPEED = 150;
const WALK_RATE = GameData.game.keeper.moveSpeed / WALK_TUNED_SPEED;

/** 지금 하는 동작: 공격은 쏜 방향을 본다 */
interface Action {
  kind: MotionKind;
  t: number;
  angle: number;
}

export class Lightkeeper {
  readonly pos: Vec;
  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly dust: Phaser.GameObjects.Image[] = [];
  private readonly scale: number;
  /** 등불지기별 8방향 시트(`${id}-8dir`)와 애니메이션 접두사(`${id}-`). 시트가 없으면 루미 것을 쓴다 */
  private readonly tex: string;
  private readonly prefix: string;
  private faceAngle = Math.PI / 2;
  private dir: Dir = 's';
  private action: Action | null = null;
  /** 이번 프레임 동작 값 (손 위치에도 더한다) */
  private pose: Pose = { ...REST };
  private sleeping = false;
  private moving = false;
  private dustT = 0;
  private veil = 1;

  constructor(
    scene: Phaser.Scene,
    readonly def: CharacterDef,
    x: number,
    y: number,
  ) {
    this.scene = scene;
    this.pos = { x, y };
    this.shadow = scene.add.image(x, y + FOOT_Y, TextureKeys.footShadow).setScale(1.68, 1.76).setDepth(y - 1);
    // 2026-11-13: 등불지기마다 같은 규격(lumi-8dir과 같은 줄·칸)의 시트. 토리·도토는 임시 코드 그림(src/art/keeperSprites.ts)
    const own = `${def.id}-8dir`;
    this.tex = scene.textures.exists(own) ? own : TextureKeys.lumi;
    this.prefix = this.tex === own ? `${def.id}-` : 'lumi-';
    this.scale = DISPLAY * texScale(this.tex);
    this.sprite = scene.add
      .sprite(x, y + FOOT_Y, this.tex, 0)
      .setOrigin(0.5, FEET_Y / CELL)
      .setScale(this.scale)
      .setDepth(y);
    for (let i = 0; i < DUST_POOL; i++) {
      this.dust.push(scene.add.image(0, 0, TextureKeys.glow).setTint(0xc9b8f0).setAlpha(0).setVisible(false));
    }
    this.refresh(true);
  }

  get depth(): number {
    return this.pos.y;
  }

  get facing(): Dir {
    return this.dir;
  }

  /** 지금 하는 동작 (확인용) */
  get motion(): MotionKind | null {
    return this.action?.kind ?? null;
  }

  /** 이번 프레임 위치와 걷는 입력(길이 0~1) */
  moveTo(x: number, y: number, input: Vec, dt: number): void {
    this.pos.x = x;
    this.pos.y = y;
    const speed = Math.hypot(input.x, input.y);
    this.moving = speed > 0.08;
    const lock = this.action?.kind === 'attack' ? this.action.angle : null;
    // 끄기(겨누기)만 할 땐 걷는 방향 그대로: 쏘는 순간의 공격 동작 동안만 그쪽을 본다
    const target = lock ?? (this.moving ? Math.atan2(input.y, input.x) : null);
    if (target !== null) this.faceAngle = turnToward(this.faceAngle, target, follow(dt, TURN_TAU));
    const d = dirOf(this.faceAngle);
    const turned = d !== this.dir;
    this.dir = d;
    this.refresh(turned);
    // 걸음 빠르기에 맞춰 걷기 애니메이션 속도
    if (!this.sleeping) this.sprite.anims.timeScale = this.moving ? (0.6 + 0.5 * Math.min(1, speed)) * WALK_RATE : 1;

    this.stepAction(dt);
    const p = this.pose;
    this.sprite
      .setPosition(x + p.dx, y + FOOT_Y + p.dy)
      .setScale(this.scale * p.sx, this.scale * p.sy)
      .setRotation(p.rot)
      .setAlpha(this.veil * p.alpha)
      .setDepth(y);
    this.shadow.setPosition(x, y + FOOT_Y).setDepth(y - 1);
    this.updateDust(dt, input);
  }

  /** 빛을 보낸다: 그쪽을 바로 보고, 지금 모습(정지·걷기) 그대로 웅크렸다 내민다 */
  attack(angle: number): void {
    if (this.sleeping) return;
    this.faceAngle = angle;
    this.dir = dirOf(angle);
    this.refresh(true);
    this.start('attack', angle);
  }

  /** 등불이 맞았을 때: 움찔하며 흔들리고 짧게 하얗게 번쩍인다 (다시 맞으면 처음부터) */
  hurt(): void {
    if (this.sleeping || this.action?.kind === 'respawn') return;
    this.start('hit', this.faceAngle);
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(FLASH_MS, () => this.sprite.clearTint());
  }

  /** 스테이지 시작·하트를 잃은 뒤: 정면 정지 모습으로 빛 속에 나타난다 (빛기둥은 LightFx) */
  respawn(): void {
    this.sleeping = false;
    this.faceAngle = Math.PI / 2;
    this.dir = 's';
    this.refresh(true);
    this.start('respawn', this.faceAngle);
  }

  /** 하트를 잃음·오늘은 여기까지: 그 자리에 잠든다 */
  ko(): void {
    this.sleeping = true;
    this.action = null;
    this.pose = { ...REST };
    // 판이 끝나 moveTo가 더는 불리지 않으므로 동작 중이던 모양을 여기서 되돌린다
    this.sprite.setPosition(this.pos.x, this.pos.y + FOOT_Y).setScale(this.scale).setRotation(0).setAlpha(this.veil);
    this.sprite.anims.timeScale = 1;
    this.sprite.play(`${this.prefix}ko`);
    for (const d of this.dust) d.setVisible(false);
  }

  /** 풀숲에 숨으면 반투명하게 (1 = 그대로) */
  setVeil(alpha: number): void {
    this.veil = alpha;
    this.sprite.setAlpha(alpha * this.pose.alpha);
    this.shadow.setAlpha(alpha);
  }

  /** 움직임 줄이기 설정이면 동작은 건너뛴다 (번쩍임은 남김) */
  private start(kind: MotionKind, angle: number): void {
    this.action = prefersReducedMotion() ? null : { kind, t: 0, angle };
    this.pose = this.action ? motionPose(kind, 0, angle) : { ...REST };
  }

  private stepAction(dt: number): void {
    const a = this.action;
    if (!a) return;
    a.t += dt;
    const p = a.t / MOTION_SEC[a.kind];
    this.pose = motionPose(a.kind, p, a.angle);
    if (p >= 1) this.action = null;
  }

  /** 지금 상태(정지·걷기)·방향의 애니메이션을 튼다. 같은 상태에서 방향만 바뀌면 진행 위치를 이어 간다 */
  private refresh(force: boolean): void {
    if (this.sleeping) return;
    const state = this.moving ? 'walk' : 'idle';
    const key = `${this.prefix}${state}-${this.dir}`;
    const cur = this.sprite.anims.currentAnim;
    if (!force && cur?.key === key) return;
    if (cur?.key === key && this.sprite.anims.isPlaying) return;
    const sameState = cur?.key.startsWith(`${this.prefix}${state}-`) ?? false;
    const progress = sameState ? this.sprite.anims.getProgress() : 0;
    this.sprite.play(key);
    if (sameState && progress > 0) this.sprite.anims.setProgress(progress);
  }

  private updateDust(dt: number, input: Vec): void {
    for (const d of this.dust) {
      if (!d.visible) continue;
      d.alpha -= dt * 1.6;
      d.setScale(d.scale + dt * 0.05);
      if (d.alpha <= 0) d.setVisible(false);
    }
    if (!this.moving || this.sleeping || this.veil < 1) return;
    this.dustT += dt;
    if (this.dustT < DUST_EVERY) return;
    this.dustT = 0;
    const d = this.dust.find((p) => !p.visible);
    if (!d) return;
    const len = Math.hypot(input.x, input.y) || 1;
    // 걷는 반대쪽 발밑에 작은 흙먼지
    d.setPosition(this.pos.x - (input.x / len) * 16 + (Math.random() - 0.5) * 10, this.pos.y + FOOT_Y - 3)
      .setScale(29 / 256)
      .setAlpha(0.45)
      .setDepth(this.pos.y - 2)
      .setVisible(true);
  }
}
