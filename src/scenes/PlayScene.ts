// 한 판(하룻밤)을 조립만 한다. 판정은 시스템, 연출은 엔티티·DOM UI가 이벤트로 받아 처리한다.
// 2026-11-04 두 스틱 조작: 등불지기가 등불을 들고 넓은 마을을 걷고(카메라가 따라감),
// 빛 스틱(DOM, ui/Sticks.ts) 또는 PC 마우스로 겨눠 쏜다. 입력은 input:* 이벤트로 들어온다.
// 마을에는 지나갈 수 없는 장애물과 숨을 수 있는 풀숲이 있다(data/map.json, 브롤스타즈식).
import Phaser from 'phaser';
import { bus, type RunResult } from '../core/events';
import { Rng } from '../core/rng';
import { RunState } from '../core/RunState';
import { characterById, enemyById, GameData, type EnemyId } from '../data';
import { VillageStage } from '../entities/VillageStage';
import { Lantern } from '../entities/Lantern';
import { KEEPER_FOOT_Y, Lightkeeper } from '../entities/Lightkeeper';
import { AimGuide } from '../entities/AimGuide';
import { EdgeArrows } from '../entities/EdgeArrows';
import { MapProps } from '../entities/MapProps';
import { LightFx } from '../entities/LightFx';
import { DesktopControls } from '../input/DesktopControls';
import { Bat } from '../entities/enemies/Bat';
import type { Enemy } from '../entities/enemies/Enemy';
import { ComboSystem, isComboMilestone } from '../systems/ComboSystem';
import { NightClock } from '../systems/NightClock';
import { ScoreCalculator } from '../systems/ScoreCalculator';
import { LightSystem } from '../systems/LightSystem';
import { Spawner, type SpawnRequest } from '../systems/Spawner';
import type { Vec } from '../systems/fan';
import { autoAimAngle, dragAim } from '../systems/aimStick';
import { stepMove, strongerInput, walkArea } from '../systems/movement';
import { bushAt, pushOut } from '../systems/obstacles';
import { follow } from '../systems/facing';
import { prefersReducedMotion } from '../ui/dom';

const CFG = GameData.game;
/** 아직 구현된 악당. M2에서 늘어난다 */
const IMPLEMENTED: readonly EnemyId[] = ['bat'];
/** 등불이 꺼지는 연출 (스킬: 1.5초 입력 막고 불씨 하나) */
const GAME_OVER_SEC = 1.5;
/** 새벽 연출 (스킬: 하늘 가장자리가 2초간 DAWN으로) */
const DAWN_SEC = 2;
/** 탭 사이 프레임이 길게 끊겨도 한 번에 너무 많이 진행하지 않게 */
const MAX_DT = 1 / 20;
/**
 * 판이 끝나면 결과 판이 등불을 가리지 않게 월드를 민다 (제안: 기획서에 없음).
 * 세로: 결과 판이 아래에서 올라오므로 등불을 위로. 가로: 결과 판이 오른쪽에 서므로 등불을 왼쪽으로(화면 폭 비율)
 */
const END_PAN = { portraitY: 230, landscapeX: 0.22 };
const END_PAN_MS = 700;
/** 카메라가 등불지기를 따라가는 부드러움 (제안: 기획서에 없음) */
const FOLLOW_LERP = 0.14;
/** 화면 밖에서 이웃이 나타나는 거리: 보이는 영역 가장자리에서 이만큼 바깥 (제안) */
const SPAWN_OUTSIDE = 56;
const WALK_AREA = walkArea(CFG.world.width, CFG.world.height, CFG.keeper.walkInset);
/** 등불지기 몸 가운데에서 발까지: 장애물·풀숲은 발 위치로 판정한다 (2.5D) */
const FEET_Y = KEEPER_FOOT_Y;
/** 풀숲 가장자리에서 이만큼 들어가야 숨는다 (제안) */
const BUSH_INSET = 16;
// 2026-11-04 루미 재구성 (영문 지시서 2·5절). 모두 제안: 기획서에 없음
/** 이동 입력이 따라붙는 반응 시간: 출발·정지가 부드럽게 */
const MOVE_TAU = 0.1;
/** 등불이 맞으면 루미가 이웃 반대쪽으로 밀리는 거리 */
const HURT_KNOCKBACK = 14;
/** 피격 화면 흔들림 */
const HURT_SHAKE = { ms: 120, intensity: 0.004 };
/** 대광원 원형 표시가 퍼지는 반지름 */
const BURST_RING = 320;

export class PlayScene extends Phaser.Scene {
  private stage!: VillageStage;
  private lantern!: Lantern;
  private keeper!: Lightkeeper;
  private combo!: ComboSystem;
  private clock!: NightClock;
  private score!: ScoreCalculator;
  private light!: LightSystem;
  private spawner!: Spawner;
  private enemies: Enemy[] = [];
  private pending: SpawnRequest[] = [];
  private returnedCount = 0;
  private paused = false;
  private ended = false;
  /** 홈의 `테스트` 판: 이웃을 만들지 않고 밤 시계를 돌리지 않는다 */
  private test = false;
  private burstPending = false;
  private unsubscribe: (() => void)[] = [];
  private aimGuide!: AimGuide;
  private fx!: LightFx;
  /** 부드럽게 따라붙은 이동 입력 */
  private moveVec: Vec = { x: 0, y: 0 };
  private edgeArrows!: EdgeArrows;
  private desktop!: DesktopControls;
  /** 이동 스틱 입력 (길이 0~1) */
  private stickMove: Vec = { x: 0, y: 0 };
  /** 빛 스틱으로 겨누는 방향과 끈 정도(0~1). 겨누지 않으면 null */
  private stickAim: { angle: number; power: number } | null = null;
  private props!: MapProps;
  /** 설정 시트가 열려 있음 */
  private settingsOpen = false;
  /** 등불지기가 들어가 있는 풀숲 번호 (-1 = 밖) */
  private bushIn = -1;
  /** 빛을 쏜 뒤 풀숲 속에서도 드러나 있는 남은 시간 */
  private revealLeft = 0;
  /** 숨은 등불지기를 못 본 이웃이 맴돌 지점을 고르는 난수 (판마다 seed로 재현) */
  private roamRng = new Rng(1);

  constructor() {
    super('Play');
  }

  create(): void {
    const keeperDef = characterById(RunState.characterId);
    const start = { x: CFG.lantern.x, y: CFG.lantern.y };
    const rng = new Rng(RunState.seed);

    this.enemies = [];
    this.pending = [];
    this.returnedCount = 0;
    this.paused = false;
    this.ended = false;
    this.test = RunState.test;
    this.burstPending = false;
    this.stickMove = { x: 0, y: 0 };
    this.moveVec = { x: 0, y: 0 };
    this.stickAim = null;
    this.bushIn = -1;
    this.revealLeft = 0;
    this.roamRng = new Rng(RunState.seed + 17);

    // 등불은 등불지기의 손에: Lantern.pos 한 객체를 무대(빛 고임)·이웃(등불을 쫓고 공격)이 함께 읽는다.
    // 빛(원뿔·부채꼴·판정)은 루미의 중심 keeper.pos에서 나간다 (2026-11-06 라이언 지시, 브롤스타즈처럼 캐릭터 중심)
    this.keeper = new Lightkeeper(this, keeperDef, start.x, start.y);
    this.lantern = new Lantern(this, { ...CFG.lantern, ...this.keeper.hand });
    this.stage = new VillageStage(this, this.lantern.pos);
    this.props = new MapProps(this);
    this.aimGuide = new AimGuide(this, CFG.light.fanDeg);
    this.fx = new LightFx(this);
    this.edgeArrows = new EdgeArrows(this);
    // PC: 마우스를 끌다 놓으면 커서 쪽으로, 루미 중심에서 커서까지의 거리만큼 (루미 몸 위에서 놓으면 취소)
    this.desktop = new DesktopControls(this, (point) => {
      const aim = this.mouseAim(point);
      if (aim) this.fire(aim.angle, aim.range);
    });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, CFG.world.width, CFG.world.height);
    cam.centerOn(start.x, start.y);

    this.combo = new ComboSystem({ combo: CFG.combo, synergy: CFG.synergy }, bus);
    this.clock = new NightClock(CFG.night, bus);
    this.score = new ScoreCalculator(CFG.combo, CFG.score);
    this.light = new LightSystem(
      CFG.light,
      this.keeper.pos,
      keeperDef.lightRange,
      CFG.light.cooldownSec * keeperDef.lightCooldownMultiplier,
      bus,
    );
    this.spawner = new Spawner(
      GameData.waves,
      GameData.enemies,
      rng,
      // 이웃은 지금 화면 가장자리 밖에서 나온다: 화면 크기(세로·가로)가 바뀌면 onResize가 다시 맞춘다
      { width: this.scale.width, height: this.scale.height, margin: CFG.playfield.margin },
      IMPLEMENTED,
    );

    // 설정이 열려 있으면 ESC는 설정만 닫는다(SettingsSheet가 먼저 받아 preventDefault). 그때는 일시정지를 풀지 않는다
    this.input.keyboard?.on('keydown-ESC', (e: KeyboardEvent) => {
      if (!e.defaultPrevented && !this.settingsOpen) this.togglePause();
    });
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.pauseIfRunning, this);

    this.unsubscribe = [
      bus.on('ui:pause-toggle', () => this.togglePause()),
      bus.on('ui:restart', () => this.restart()),
      bus.on('synergy:burst', () => (this.burstPending = true)),
      bus.on('combo:change', (e) => {
        this.stage.setCombo(e.combo);
        if (e.reason === 'gain' && isComboMilestone(e.combo)) this.stage.pulse();
      }),
      bus.on('enemy:returned', (e) => this.stage.burstAt(e.x, e.y)),
      bus.on('input:move', (v) => (this.stickMove = v)),
      bus.on('input:aim', (e) => (this.stickAim = e.active ? { angle: e.angle, power: e.power } : null)),
      bus.on('input:fire', (e) => this.fire(e.angle, e.power === undefined ? Infinity : e.power * this.light.range)),
      bus.on('ui:settings', (e) => (this.settingsOpen = e.open)),
      bus.on('ui:layout', () => this.pauseIfRunning()),
      bus.on('lantern:heal', () => this.stage.healGlow()),
      bus.on('night:phase', (e) => {
        if (e.phase !== 'dawn') this.stage.setPhase(e.phase, e.t === 0);
      }),
    ];
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
      // 일시정지 중에 홈으로 나가도 다음 판이 멈춘 채 시작하지 않게
      this.time.paused = false;
      this.tweens.resumeAll();
      this.unsubscribe.forEach((off) => off());
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.pauseIfRunning, this);
    });

    // 새 밤: 루미가 빛기둥 속에 나타난다 (부활 연출)
    this.keeper.respawn();
    this.fx.respawn(this.keeper.pos.x, this.keeper.pos.y + FEET_Y);

    bus.emit('run:start', {
      seed: RunState.seed,
      characterId: keeperDef.id,
      hp: this.lantern.hp,
      maxHp: this.lantern.maxHp,
      durationSec: CFG.night.durationSec,
      test: this.test,
    });
    bus.emit('score:change', { score: 0, gained: 0 });
    this.clock.start();
    this.cameras.main.fadeIn(400, 18, 15, 36);
  }

  override update(_time: number, deltaMs: number): void {
    if (this.paused) return;
    const dt = Math.min(deltaMs / 1000, MAX_DT);

    if (!this.ended) {
      this.walk(dt);
      this.tick(dt);
    }

    // 풀숲에 숨으면 등불빛도 낮춘다
    this.stage.update(dt, this.lantern.glowRadius, this.lantern.flicker * (this.hidden ? 0.5 : 1));
    this.lantern.update(dt, this.light.cooldownSec > 0 ? this.light.cooldownLeft / this.light.cooldownSec : 0);
  }

  private tick(dt: number): void {
    // 테스트 판은 초저녁에 머문다: 새벽(클리어)도 이웃도 없다
    if (!this.test) this.clock.update(dt);
    this.stage.setMood(this.clock.t / CFG.night.durationSec, this.lantern.hp / this.lantern.maxHp);
    if (this.clock.isDawn) {
      this.clear();
      return;
    }

    if (this.burstPending) {
      this.burstPending = false;
      this.burst();
    }

    if (!this.test) this.spawn(dt);

    const lantern = { x: this.lantern.pos.x, y: this.lantern.pos.y, radius: CFG.lantern.radius };
    const hidden = this.hidden;
    for (const e of this.enemies) {
      // 숨은 등불지기는 아주 가까이 온 이웃만 알아챈다(브롤스타즈처럼). 나머지는 루미를 못 보고 마을을 맴돈다
      const sees = !hidden || Math.hypot(e.x - lantern.x, e.y - lantern.y) <= CFG.hide.revealDist;
      const step = e.step(dt, sees ? { lantern, speedMultiplier: 1 } : { lantern, roam: this.roamPoint, roamSpeed: CFG.hide.roamSpeed, speedMultiplier: 1 });
      if (step.firstContact) this.combo.registerLanternHit();
      if (step.damage > 0) {
        this.lantern.damage(step.damage);
        this.hurtKeeper(e);
        bus.emit('lantern:damage', { hp: this.lantern.hp, maxHp: this.lantern.maxHp, by: e.def.id });
      }
    }

    const targets = this.enemies.filter((e) => e.targetable);
    for (const hit of this.light.update(dt, targets)) {
      const e = targets.find((t) => t.uid === hit.uid);
      if (!e) continue;
      this.hitEnemy(e, this.keeper.def.lightPower, CFG.light.knockback, CFG.light.stunSec);
    }

    this.combo.update(dt);
    this.enemies = this.enemies.filter((e) => e.active);
    this.edgeArrows.update(this.cameras.main, this.enemies.filter((e) => e.targetable));

    if (this.lantern.isOut) this.gameOver();
  }

  /**
   * 카메라가 등불지기를 부드럽게 따라간다. Phaser의 startFollow는 그리기 직전에 스크롤을 바꿔
   * 이번 프레임 빛 마스크(VillageStage)가 한 프레임 늦게 어긋나므로, 여기서 직접 스크롤을 정한다.
   * 마을 밖은 보여 주지 않는다(가장자리에서 멈춤).
   */
  private followCamera(target: Vec, dt: number): void {
    const cam = this.cameras.main;
    const k = 1 - Math.pow(1 - FOLLOW_LERP, dt * 60);
    const maxX = CFG.world.width - cam.width;
    const maxY = CFG.world.height - cam.height;
    const tx = Math.min(maxX, Math.max(0, target.x - cam.width / 2));
    const ty = Math.min(maxY, Math.max(0, target.y - cam.height / 2));
    cam.setScroll(cam.scrollX + (tx - cam.scrollX) * k, cam.scrollY + (ty - cam.scrollY) * k);
  }

  /** 풀숲 속에 있고, 빛을 쏜 직후가 아니면 숨은 것 */
  private get hidden(): boolean {
    return this.bushIn >= 0 && this.revealLeft <= 0;
  }

  /**
   * 걷기: 이동 스틱·키보드 중 센 쪽으로 걷고(마을 밖·장애물 안으로는 못 감), 등불은 손을 따라가고,
   * 카메라는 등불지기를 따라간다(카메라도 마을 밖을 보여 주지 않는다). 풀숲에 들어가면 숨는다.
   */
  private walk(dt: number): void {
    const raw = strongerInput(this.stickMove, this.desktop.move);
    const k = follow(dt, MOVE_TAU);
    this.moveVec = { x: this.moveVec.x + (raw.x - this.moveVec.x) * k, y: this.moveVec.y + (raw.y - this.moveVec.y) * k };
    const input = this.moveVec;
    const stepped = stepMove(this.keeper.pos, input, CFG.keeper.moveSpeed, dt, WALK_AREA);
    const feet = pushOut({ x: stepped.x, y: stepped.y + FEET_Y }, CFG.keeper.radius, this.props.obstacles);
    const next = { x: feet.x, y: feet.y - FEET_Y };
    this.revealLeft = Math.max(0, this.revealLeft - dt);
    this.bushIn = bushAt(feet, this.props.bushes, BUSH_INSET);
    this.props.update(dt, this.bushIn);
    const veil = this.hidden ? CFG.hide.keeperAlpha : 1;
    this.keeper.setVeil(veil);
    this.lantern.veil = veil;
    // 빛 스틱이 우선, 아니면 PC 마우스 끌기. 원뿔 반지름은 끈 거리에 비례 (스틱: 사거리 × 끈 정도, 마우스: 커서까지 거리)
    const stick = this.stickAim;
    const drag = stick ? null : this.desktop.dragPoint();
    const mouse = drag ? this.mouseAim(drag) : null;
    const aim = stick?.angle ?? mouse?.angle ?? null;
    const reach = stick ? stick.power * this.light.range : (mouse?.range ?? this.light.range);
    this.keeper.moveTo(next.x, next.y, input, dt);
    const hand = this.keeper.hand;
    this.lantern.setPosition(hand.x, hand.y, this.keeper.lanternDepth);
    this.followCamera(next, dt);
    this.aimGuide.draw(this.keeper.pos, aim, reach, this.light.ready);
  }

  /** 맴돌 다음 지점: 지금 자리에서 roamMin~roamMax 떨어진 마을 안 아무 곳 (제안: 기획서에 없음) */
  private readonly roamPoint = (from: Vec): Vec => {
    const a = this.roamRng.range(0, Math.PI * 2);
    const d = this.roamRng.range(CFG.hide.roamMin, CFG.hide.roamMax);
    return {
      x: Math.min(WALK_AREA.x + WALK_AREA.w, Math.max(WALK_AREA.x, from.x + Math.cos(a) * d)),
      y: Math.min(WALK_AREA.y + WALK_AREA.h, Math.max(WALK_AREA.y, from.y + Math.sin(a) * d)),
    };
  };

  private mouseAim(point: Vec): { angle: number; range: number } | null {
    return dragAim(this.keeper.pos, point, this.light.range, CFG.controls.mouseCancelRadius);
  }

  private spawn(dt: number): void {
    const alive = this.enemies.filter((e) => e.targetable).length + this.pending.length;
    this.pending.push(...this.spawner.update(dt, this.clock.t, alive));
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const req = this.pending[i];
      req.delay -= dt;
      if (req.delay > 0) continue;
      this.pending.splice(i, 1);
      const at = this.spawnPoint(req);
      if (req.enemyId === 'bat') this.enemies.push(new Bat(this, enemyById('bat'), at.x, at.y));
    }
  }

  /** Spawner는 화면 크기 기준 가장자리 점을 준다: 지금 보이는 영역의 같은 자리에서 조금 바깥으로 밀고 마을 안으로 자른다 */
  private spawnPoint(req: SpawnRequest): Vec {
    const view = this.cameras.main.worldView;
    const x = view.x + req.x;
    const y = view.y + req.y;
    const dx = x - view.centerX;
    const dy = y - view.centerY;
    const len = Math.hypot(dx, dy) || 1;
    const m = CFG.playfield.margin;
    const place = (px: number, py: number): Vec => ({
      x: Math.min(CFG.world.width - m, Math.max(m, px)),
      y: Math.min(CFG.world.height - m, Math.max(m, py)),
    });
    const visible = (p: Vec) => p.x > view.x - 8 && p.x < view.right + 8 && p.y > view.y - 8 && p.y < view.bottom + 8;
    const ox = (dx / len) * SPAWN_OUTSIDE;
    const oy = (dy / len) * SPAWN_OUTSIDE;
    // 카메라가 마을 끝에 붙어 그쪽 바깥이 없으면, 화면 가운데를 기준으로 반대쪽 바깥에서 나온다
    const mx = 2 * view.centerX - x;
    const my = 2 * view.centerY - y;
    const candidates = [place(x + ox, y + oy), place(mx - ox, y + oy), place(x + ox, my - oy), place(mx - ox, my - oy)];
    return candidates.find((p) => !visible(p)) ?? candidates[0];
  }

  /**
   * 빛 스틱을 놓음(또는 PC 마우스를 끌다 놓음). angle이 null이면 가장 가까운 이웃에게, 아무도 없으면 바라보는 쪽으로.
   * reach = PC에서 커서까지의 거리 (사거리를 넘지 않음)
   */
  fire(angle: number | null, reach = Infinity): void {
    if (this.paused || this.ended) return;
    const origin = this.keeper.pos;
    const targets = this.enemies.filter((e) => e.targetable);
    const a = angle ?? autoAimAngle(origin, targets, this.light.range) ?? (this.keeper.hand.x >= this.keeper.pos.x ? 0 : Math.PI);
    const cast = this.light.tryCast(a, reach);
    if (!cast) return;
    // 빛을 보내면 풀숲 속에서도 잠깐 드러난다 (브롤스타즈처럼)
    this.revealLeft = CFG.hide.revealAfterFireSec;
    this.stage.addFan(origin, a, cast.range);
    this.keeper.attack(a);
    this.fx.shoot(origin, a, cast.range, CFG.light.fanDeg);
    bus.emit('light:cast', {
      x: origin.x + Math.cos(a) * cast.range,
      y: origin.y + Math.sin(a) * cast.range,
      angle: a,
      range: cast.range,
      characterId: this.keeper.def.id,
    });
  }

  /** 등불이 맞음: 피격 동작·흰 번쩍임, 이웃 반대쪽으로 살짝 밀림(장애물·마을 끝 판정), 짧은 화면 흔들림 */
  private hurtKeeper(from: Vec): void {
    const k = this.keeper;
    k.hurt();
    this.fx.hurt(k.pos.x, k.pos.y);
    const dx = k.pos.x - from.x;
    const dy = k.pos.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const stepped = stepMove(k.pos, { x: dx / len, y: dy / len }, HURT_KNOCKBACK, 1, WALK_AREA);
    const feet = pushOut({ x: stepped.x, y: stepped.y + FEET_Y }, CFG.keeper.radius, this.props.obstacles);
    k.pos.x = feet.x;
    k.pos.y = feet.y - FEET_Y;
    if (!prefersReducedMotion()) this.cameras.main.shake(HURT_SHAKE.ms, HURT_SHAKE.intensity);
  }

  private hitEnemy(e: Enemy, power: number, knockback: number, stunSec: number): void {
    this.fx.impact(e.x, e.y);
    const returned = e.hitByLight(power, knockback, stunSec, this.keeper.pos);
    bus.emit('enemy:hit', { uid: e.uid, enemyId: e.def.id, remainingHp: Math.max(0, e.hp) });
    if (!returned) return;
    this.returnedCount += 1;
    const combo = this.combo.registerReturn();
    const gained = this.score.addReturn(e.def.score, combo);
    bus.emit('enemy:returned', { enemyId: e.def.id, x: e.x, y: e.y, score: gained, combo });
    bus.emit('score:change', { score: this.score.total, gained });
  }

  /** 대광원: 전방위, 위력 3배, 넉백 200 */
  private burst(): void {
    this.stage.burst(CFG.light.burstFlashSec);
    // 원형 범위 표시 (영문 지시서의 원형 패턴 = 대광원)
    this.aimGuide.burst(this.keeper.pos, BURST_RING, CFG.light.burstFlashSec * 1000);
    const power = this.keeper.def.lightPower * CFG.light.burstPowerMultiplier;
    for (const e of this.enemies.filter((t) => t.targetable)) {
      this.hitEnemy(e, power, CFG.light.burstKnockback, CFG.light.stunSec);
    }
  }

  private togglePause(): void {
    if (this.ended) return;
    this.paused = !this.paused;
    // 끌던 마우스는 버린다: 다시 시작한 뒤 놓는 순간 빛이 나가지 않게
    this.desktop.cancel();
    if (this.paused) this.tweens.pauseAll();
    else this.tweens.resumeAll();
    this.time.paused = this.paused;
    bus.emit('run:pause', { paused: this.paused });
  }

  private pauseIfRunning(): void {
    if (!this.paused && !this.ended) this.togglePause();
  }

  private gameOver(): void {
    this.ended = true;
    this.aimGuide.hide();
    // 등불이 꺼지면 루미는 그 자리에 잠든다 (넉아웃 연출, 패배감 없이)
    this.keeper.ko();
    this.fx.sleep(this.keeper.pos.x, this.keeper.pos.y);
    this.edgeArrows.hide();
    this.lantern.extinguish(this, GAME_OVER_SEC);
    this.stage.fadeOut(GAME_OVER_SEC);
    const result = this.result('over');
    this.time.delayedCall(GAME_OVER_SEC * 1000, () => {
      this.panForResult();
      bus.emit('game:over', { result });
    });
  }

  private panForResult(): void {
    const cam = this.cameras.main;
    const landscape = cam.width > cam.height;
    const x = this.keeper.pos.x + (landscape ? cam.width * END_PAN.landscapeX : 0);
    const y = this.keeper.pos.y + (landscape ? 0 : END_PAN.portraitY);
    cam.pan(x, y, END_PAN_MS, 'Cubic.easeOut');
  }

  /**
   * 화면 크기가 바뀜 (세로 ↔ 가로, 창 크기): 화면에 붙은 층과 이웃이 나오는 가장자리를 새 크기로.
   * 판 중에 화면 방식이 바뀌면 잠깐 멈춘다(ui:layout, 제안: 기획서에 없음)
   */
  private onResize(gameSize: Phaser.Structs.Size): void {
    this.stage.resize(gameSize.width, gameSize.height);
    this.spawner.setArea(gameSize.width, gameSize.height);
    if (!this.ended) this.followCamera(this.keeper.pos, 1);
  }

  private clear(): void {
    this.ended = true;
    this.aimGuide.hide();
    this.edgeArrows.hide();
    const gained = this.score.addClear(this.lantern.hp);
    bus.emit('score:change', { score: this.score.total, gained });
    this.stage.dawn(DAWN_SEC);
    // 새벽이 오면 남은 이웃은 모두 스스로 돌아간다(점수 없음)
    for (const e of this.enemies.filter((t) => t.targetable)) e.hitByLight(e.hp, 0, CFG.light.stunSec, this.keeper.pos);
    const result = this.result('clear');
    this.time.delayedCall(DAWN_SEC * 1000, () => {
      this.panForResult();
      bus.emit('game:clear', { result });
    });
  }

  private result(outcome: RunResult['outcome']): RunResult {
    const result: RunResult = {
      outcome,
      score: this.score.total,
      survivedSec: Math.round(this.clock.t * 10) / 10,
      returnedCount: this.returnedCount,
      maxCombo: this.combo.maxCombo,
      characterId: this.keeper.def.id,
      equipmentId: RunState.equipmentId,
      seed: RunState.seed,
      witchReturned: false,
      continued: false,
    };
    RunState.lastResult = result;
    return result;
  }

  private restart(): void {
    if (this.paused) {
      this.tweens.resumeAll();
      this.time.paused = false;
    }
    RunState.newRun();
    this.scene.restart();
  }
}
