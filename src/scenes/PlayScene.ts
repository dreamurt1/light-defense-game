// 한 스테이지를 조립만 한다. 판정은 시스템, 연출은 엔티티·DOM UI가 이벤트로 받아 처리한다.
// 2026-11-12 새 기획(XMind 1112): 맵 가운데 중앙 광원(최후 보루)과 외곽 등불 스테이션을 지키고 켠다.
// 루미는 HP·하트·LP를 갖고 스스로 빛을 쏜다(손 등불 없음). 약 100초 뒤 아침이 오면 끝(70%부터 클라이맥스).
// 조작은 2026-11-04 두 스틱(빛 스틱 DOM ui/Sticks.ts, PC 마우스)이고 입력은 input:* 이벤트로 들어온다.
import Phaser from 'phaser';
import { bus, type RunResult } from '../core/events';
import { Rng } from '../core/rng';
import { RunState } from '../core/RunState';
import { characterById, enemyById, GameData, IMPLEMENTED_ENEMIES, nightConfig, stageById, type EnemyId, type StageDef } from '../data';
import { Creature } from '../entities/enemies/Creature';
import { Items } from './play/Items';
import { Boss } from './play/Boss';
import { StageRules } from './play/StageRules';
import { followCamera, freeze, HudFeed, keepSafe, makeRoam, panForResult } from './play/sceneKit';
import { VillageStage } from '../entities/VillageStage';
import { KEEPER_FOOT_Y, Lightkeeper } from '../entities/Lightkeeper';
import { AimGuide } from '../entities/AimGuide';
import { EdgeArrows } from '../entities/EdgeArrows';
import { MapProps } from '../entities/MapProps';
import { LightFx } from '../entities/LightFx';
import type { LightStation } from '../entities/LightStation';
import { DesktopControls } from '../input/DesktopControls';
import type { Enemy, EnemyContext, EnemyStep } from '../entities/enemies/Enemy';
import { ComboSystem, isComboMilestone } from '../systems/ComboSystem';
import { NightClock } from '../systems/NightClock';
import { ScoreCalculator } from '../systems/ScoreCalculator';
import { LightSystem } from '../systems/LightSystem';
import { Spawner } from '../systems/Spawner';
import type { Vec } from '../systems/fan';
import { autoAimAngle, dragAim } from '../systems/aimStick';
import { stepMove, strongerInput, walkArea } from '../systems/movement';
import { bushAt, pushOut, type Rect } from '../systems/obstacles';
import { follow } from '../systems/facing';
import { Vitals } from '../systems/vitals';
import { LightPoints } from '../systems/lightPoints';
import { judgeStage, type EndReason, type StageOutcome } from '../systems/stageOutcome';
import { prefersReducedMotion } from '../ui/dom';
import { EnemyField } from './play/EnemyField';
import { Sources } from './play/Sources';

const CFG = GameData.game;
/** 오늘은 여기까지 연출 (입력 막고 빛이 사그라듦) */
const OVER_SEC = 1.5;
/** 아침 연출 (마을 전체가 2초간 켜짐) */
const DAWN_SEC = 2;
/** 프레임이 길게 끊겨도 한 번에 너무 많이 진행하지 않게 */
const MAX_DT = 1 / 20;
const WALK_AREA = walkArea(CFG.world.width, CFG.world.height, CFG.keeper.walkInset);
/** 루미 몸 가운데에서 발까지: 장애물·풀숲은 발 위치로 판정한다 (2.5D) */
const FEET_Y = KEEPER_FOOT_Y;
/** 풀숲 가장자리에서 이만큼 들어가야 숨는다 (제안) */
const BUSH_INSET = 16;
/** 이동 입력이 따라붙는 반응 시간: 출발·정지가 부드럽게 (제안) */
const MOVE_TAU = 0.1;
const HURT_SHAKE = { ms: 120, intensity: 0.004 };
/** 무적 깜빡임: 초당 2.5회의 완만한 맥박 (깜빡임 초당 3회 이하 규칙) */
const INVULN_PULSE_HZ = 2.5;
/** 모든 등불이 켜졌을 때 환해지는 시간 */
const CELEBRATE_SEC = 0.9;
const FRIEND_MARK = { lift: 98, drop: 22 }; // 빛을 잃은 친구를 가리키는 노란 화살표 끝 (초상 꼭대기 위·발밑 아래, 연출 값)

export class PlayScene extends Phaser.Scene {
  private stage!: VillageStage;
  private keeper!: Lightkeeper;
  /** 중앙 광원·등불 스테이션·맵 전체 광도 */
  private sources!: Sources;
  private field!: EnemyField;
  private vitals!: Vitals;
  private lp!: LightPoints;
  private combo!: ComboSystem;
  private clock!: NightClock;
  private score!: ScoreCalculator;
  private light!: LightSystem;
  private stageDef!: StageDef;
  private obstacles: Rect[] = [];
  private rescued = 0;
  private retreated = 0;
  private paused = false;
  private ended = false;
  /** 홈의 `테스트` 판(개발 모드만): 적을 만들지 않고 시계를 돌리지 않는다 */
  private test = false;
  private unsubscribe: (() => void)[] = [];
  private aimGuide!: AimGuide;
  private fx!: LightFx;
  private moveVec: Vec = { x: 0, y: 0 };
  private edgeArrows!: EdgeArrows;
  private desktop!: DesktopControls;
  private stickMove: Vec = { x: 0, y: 0 };
  /** 빛 스틱으로 겨누는 방향과 끈 정도(0~1). 겨누지 않으면 null */
  private stickAim: { angle: number; power: number } | null = null;
  private props!: MapProps;
  private settingsOpen = false;
  /** 루미가 들어가 있는 풀숲 번호 (-1 = 밖) */
  private bushIn = -1;
  /** 빛을 쏜 뒤 풀숲 속에서도 드러나 있는 남은 시간 */
  private revealLeft = 0;
  /** 숨은 루미를 놓친 적이 맴돌 다음 지점 */
  private roamPoint = makeRoam(new Rng(1), WALK_AREA);
  private time_ = 0;
  private hud = new HudFeed();
  // 2026-11-13 컨셉 시연판: 아이템 · 노월 · 스테이지 규칙(패시브·자비·친구·은신·튜토리얼)
  private items!: Items;
  private boss: Boss | null = null;
  private rules!: StageRules;
  /** 연습장·튜토리얼: 시계가 멈추고 판이 끝나지 않는다(하트·광원이 바닥나지 않음) */
  private safe = false;

  constructor() {
    super('Play');
  }

  create(): void {
    const keeperDef = characterById(RunState.characterId);
    this.stageDef = stageById(RunState.stageId);
    const rng = new Rng(RunState.seed);
    Object.assign(this, { rescued: 0, retreated: 0, paused: false, ended: false, test: RunState.test, bushIn: -1, revealLeft: 0, time_: 0 });
    this.stickMove = { x: 0, y: 0 };
    this.moveVec = { x: 0, y: 0 };
    this.stickAim = null;
    this.hud = new HudFeed();
    this.roamPoint = makeRoam(new Rng(RunState.seed + 17), WALK_AREA);

    // 첫 화면은 중앙 광원과 주인공을 비춘다(XMind): 루미는 광원 바로 아래에서 시작
    this.sources = new Sources(this, rng, this.stageDef.stations);
    const start = this.homeSpot;
    this.keeper = new Lightkeeper(this, keeperDef, start.x, start.y);
    this.stage = new VillageStage(this, this.keeper.pos);
    this.props = new MapProps(this);
    this.obstacles = [...this.props.obstacles, ...this.sources.footprints];
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
    cam.centerOn(start.x, (start.y + CFG.central.y) / 2);

    this.vitals = new Vitals(CFG.player, CFG.stage.hearts);
    this.lp = new LightPoints(CFG.lp);
    this.combo = new ComboSystem(CFG.combo, bus);
    this.clock = new NightClock(nightConfig(this.stageDef), bus);
    this.score = new ScoreCalculator(CFG.combo, CFG.score);
    this.light = new LightSystem(CFG.light, this.keeper.pos, keeperDef.lightRange, CFG.light.cooldownSec * keeperDef.lightCooldownMultiplier, bus);
    const spawner = new Spawner(
      this.stageDef,
      CFG.stage.climaxAt,
      GameData.enemies,
      rng,
      // 적은 지금 화면 가장자리 밖에서 나온다: 화면 크기(세로·가로)가 바뀌면 onResize가 다시 맞춘다
      { width: this.scale.width, height: this.scale.height, margin: CFG.playfield.margin },
      IMPLEMENTED_ENEMIES,
    );
    this.field = new EnemyField(this, spawner, CFG.world, CFG.playfield.margin, new Rng(RunState.seed + 71));
    this.field.obstacles = this.obstacles;
    const sd = this.stageDef;
    this.safe = !!(sd.practice || sd.tutorial);
    this.items = new Items(this, sd, new Rng(RunState.seed + 31), keeperDef.trait === 'cheekPouch' ? (keeperDef.traitParams.itemEffectMultiplier ?? 1) : 1);
    this.boss = sd.boss ? new Boss(this, sd, this.field, { x: CFG.central.x, y: CFG.central.y }, new Rng(RunState.seed + 59)) : null;
    const host = { field: this.field, items: this.items, score: this.score, combo: this.combo, keeper: () => this.keeper.pos, litCount: () => this.sources.litCount };
    this.rules = new StageRules(host, sd, new Rng(RunState.seed + 47), WALK_AREA);
    this.stage.setTheme(sd.theme);
    this.input.keyboard?.on('keydown-Q', () => this.useItem(0));
    this.input.keyboard?.on('keydown-E', () => this.useItem(1));

    // 설정이 열려 있으면 ESC는 설정만 닫는다(SettingsSheet가 먼저 받아 preventDefault). 그때는 일시정지를 풀지 않는다
    this.input.keyboard?.on('keydown-ESC', (e: KeyboardEvent) => {
      if (!e.defaultPrevented && !this.settingsOpen) this.togglePause();
    });
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.pauseIfRunning, this);

    this.unsubscribe = [
      bus.on('ui:pause-toggle', () => this.togglePause()),
      bus.on('ui:restart', () => this.restart()),
      bus.on('ui:use-item', (e) => this.useItem(e.slot)),
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

    // 스테이지 시작: 루미가 빛기둥 속에 나타난다
    this.keeper.respawn();
    this.fx.respawn(this.keeper.pos.x, this.keeper.pos.y + FEET_Y);

    bus.emit('run:start', { seed: RunState.seed, characterId: keeperDef.id, stageId: this.stageDef.id, durationSec: this.stageDef.durationSec, test: this.test });
    bus.emit('score:change', { score: 0, gained: 0 });
    this.sources.emitStations();
    this.emitVitals();
    this.clock.start();
    this.rules.start();
    this.cameras.main.fadeIn(400, 18, 15, 36);
  }

  override update(_time: number, deltaMs: number): void {
    if (this.paused) return;
    const dt = Math.min(deltaMs / 1000, MAX_DT);
    this.time_ += dt;
    if (!this.ended) {
      this.walk(dt);
      this.tick(dt);
    }
    // 루미 주변 빛: LP에 비례, 스테이지가 흐를수록 넓어짐, 쓰러지면 '낮음'으로 사그라듦
    const a = CFG.aura;
    const trait = this.keeper.def.trait === 'nightEyes' ? (this.keeper.def.traitParams.auraMultiplier ?? 1) : 1;
    const aura = this.vitals.down ? a.glowMin * 0.5 : (a.glowMin + (a.glowMax - a.glowMin) * this.lp.ratio) * (1 + a.growWithProgress * this.clock.progress) * trait;
    this.stage.update(dt, this.sources.pools({ x: this.keeper.pos.x, y: this.keeper.pos.y, radius: aura, alpha: this.hidden ? 0.5 : 1 }));
  }

  private tick(dt: number): void {
    if (!this.safe) this.clock.update(dt);
    const progress = this.clock.progress;

    // 광원들: 등불 점화·맵 전체 광도·중앙 광원
    for (const s of this.sources.update(dt, progress)) this.onStationLit(s);
    this.stage.setMood(this.sources.mapLight.lit, this.sources.mapLight.gloom);
    const central = this.sources.central;

    // 루미: HP·하트(중앙 광원 곁에서 빨리 회복), LP(광원 > 등불 > 들판)
    const near = (p: Vec, r: number) => Math.hypot(p.x - this.keeper.pos.x, p.y - this.keeper.pos.y) <= r;
    const nearCentral = near(central.pos, CFG.central.healRadius);
    if (this.vitals.update(dt, nearCentral)) this.respawnKeeper();
    if (!this.vitals.down) {
      const nearStation = this.sources.stations.some((s) => s.state.lit && near(s.pos, CFG.station.healRadius));
      this.lp.update(dt, nearCentral ? 'central' : nearStation ? 'station' : 'field');
    }
    this.light.rangeMultiplier = this.lp.effectiveness;
    if (this.safe) keepSafe(this.vitals, central.state);
    this.emitVitals();

    const calmed = !!this.boss?.calmed;
    const judged = judgeStage({
      timeUp: this.clock.isDawn || calmed,
      hearts: this.vitals.hearts,
      centralOut: central.state.out,
      centralLevel: central.state.value,
      stationLevels: this.sources.stationLevels,
      bands: CFG.lightLevels.bands,
    });
    const verdict = this.rules.verdict(judged, calmed, this.safe);
    if (verdict) {
      this.end(verdict.outcome, verdict.reason);
      return;
    }

    if (!this.stageDef.tutorial) this.field.spawn(dt, this.clock.t);
    for (const { enemy, hit } of this.field.step(dt, this.enemyContext())) this.applyHit(enemy, hit);
    this.rules.update(dt, progress, !this.hidden && !this.vitals.down);
    if (this.boss) for (const h of this.boss.update(dt, this.clock.t, this.sources.enemyTargets())) this.damageSource(h.target, h.damage, 'witch');
    const spots = [central.pos, ...this.sources.stations.filter((s) => s.state.lit).map((s) => s.pos)];
    for (let n = this.items.update(dt, this.keeper.pos, spots, this.obstacles, WALK_AREA).length; n > 0; n--) {
      const gained = this.score.addItem(this.combo.combo);
      bus.emit('score:change', { score: this.score.total, gained });
    }
    for (const e of this.items.updateHelpers(dt, this.keeper.pos, this.field.active)) this.hitEnemy(e, this.items.helperPower);

    // 빛: 적과 꺼진 등불을 맞힌다 (등불은 음수 uid)
    const enemies = this.field.active;
    for (const hit of this.light.update(dt, [...enemies, ...this.sources.lightTargets(), ...(this.boss?.lightTargets() ?? [])])) {
      if (this.boss?.owns(hit.uid)) this.hitBoss(hit.uid);
      else if (hit.uid < 0) this.igniteStation(this.sources.stationByUid(hit.uid));
      else {
        const e = enemies.find((t) => t.uid === hit.uid);
        if (e) this.hitEnemy(e);
      }
    }

    this.combo.update(dt);
    this.field.prune();
    const friend = this.rules.friend;
    this.edgeArrows.update(this.cameras.main, this.field.active, friend ? [...this.sources.beacons(), { x: friend.x, y: friend.y, ...FRIEND_MARK }] : this.sources.beacons());
  }

  private enemyContext(): EnemyContext {
    const p = this.keeper.pos;
    return {
      player: this.vitals.down ? null : { id: 'player', x: p.x, y: p.y, radius: CFG.keeper.radius, seen: !this.hidden },
      sources: this.sources.enemyTargets(),
      // 풀숲에 너무 오래 있어 들키면 더 멀리서도 알아챈다 (2026-11-13)
      aggroRadius: CFG.enemyAi.aggroRadius * (this.rules.stealth.exposed ? CFG.hide.exposedAggroMultiplier : 1),
      revealDist: CFG.hide.revealDist,
      retargetSec: CFG.enemyAi.retargetSec,
      detachRatio: CFG.enemyAi.detachRatio,
      lostSightSec: CFG.hide.lostSightSec,
      roam: this.roamPoint,
      roamSpeed: CFG.hide.roamSpeed,
      speedMultiplier: this.items.enemySpeedMultiplier,
    };
  }

  /** 적의 공격이 닿음: 주인공 HP / 중앙 광원 광도 / 등불 광도 */
  private applyHit(e: Enemy, hit: NonNullable<EnemyStep['hit']>): void {
    const climax = this.clock.climax;
    const to = hit.target === 'player' ? this.keeper.pos : this.sources.posOf(hit.target); // 몸박치기 효과 (2026-11-13)
    if (to) this.fx.slam(e.x + (to.x - e.x) * 0.45, e.y + (to.y - e.y) * 0.45 - 12);
    if (hit.target === 'player') {
      const res = this.vitals.hurt(hit.damage);
      if (res === 'none') return;
      this.sources.mapLight.hit('player', climax);
      bus.emit('player:hurt', { hp: this.vitals.hp, by: e.def.id });
      if (res === 'hurt') this.hurtKeeper(e);
      else this.knockOut(res === 'out');
      this.emitVitals(true);
      return;
    }
    this.damageSource(hit.target, hit.sourceDamage, e.def.id);
  }

  /** 중앙 광원 광도 / 등불 광도가 줄어든다 (적의 공격·노월의 구슬) */
  private damageSource(target: string, amount: number, by: EnemyId): void {
    if (this.sources.damage(target, amount, by, this.clock.climax)) this.emitVitals(true);
  }

  /** 노월·어둠 구슬에 빛이 닿음 */
  private hitBoss(uid: number): void {
    const r = this.boss?.hit(uid, this.keeper.def.lightPower * this.lp.effectiveness);
    const p = this.boss?.pos;
    if (!r) return;
    if (p && r !== 'orb') this.fx.impact(p.x, p.y - 40);
    if (r === 'hit') return;
    const points = r === 'orb' ? CFG.score.orbPop : enemyById('witch').score;
    const gained = this.score.addReturn(points, r === 'calmed' ? this.combo.registerReturn() : this.combo.combo);
    bus.emit('score:change', { score: this.score.total, gained });
  }

  /** 아이템 칸 (HUD 칸 · PC Q/E) */
  private useItem(slot: number): void {
    if (this.paused || this.ended || this.vitals.down) return;
    if (!this.items.use(slot, { vitals: this.vitals, lp: this.lp })) return;
    this.rules.signal('itemUsed');
    this.stage.healGlow();
    this.emitVitals(true);
  }

  /** 하트를 잃음: 그 자리에 잠들고, 하트가 남았으면 Vitals가 잠시 뒤 respawnKeeper를 부른다 */
  private knockOut(last: boolean): void {
    this.aimGuide.hide();
    this.keeper.ko();
    this.fx.sleep(this.keeper.pos.x, this.keeper.pos.y);
    if (!prefersReducedMotion()) this.cameras.main.shake(HURT_SHAKE.ms * 2, HURT_SHAKE.intensity);
    if (!last) bus.emit('player:down', { hearts: this.vitals.hearts });
  }

  /** 중앙 광원 옆에서 HP 100%로 다시 나타난다 (라이언 답변) */
  private respawnKeeper(): void {
    const at = this.homeSpot;
    this.keeper.moveTo(at.x, at.y, { x: 0, y: 0 }, 0);
    this.keeper.respawn();
    this.fx.respawn(at.x, at.y + FEET_Y);
    this.stage.healGlow();
    this.moveVec = { x: 0, y: 0 };
    // 빛기둥이 둘레의 적을 밀어낸다 (피해 없음, 부활하자마자 둘러싸이지 않게 — 제안)
    for (const e of this.field.active) {
      if (Math.hypot(e.x - at.x, e.y - at.y) > CFG.player.respawnPushRadius) continue;
      e.hitByLight(0, CFG.player.respawnPush, CFG.light.stunSec * 2, { from: at, home: this.sources.central.pos });
    }
    bus.emit('player:respawn');
    this.emitVitals(true);
  }

  /** 중앙 광원 바로 아래 */
  private get homeSpot(): Vec {
    return { x: CFG.central.x, y: CFG.central.y + CFG.keeper.startOffsetY };
  }

  private igniteStation(s: LightStation | undefined): void {
    if (!s || !s.ignite()) return;
    // 남은 LP와 상관없이 켜지고, 쏜 뒤 LP가 준다 (XMind)
    this.lp.spend(CFG.lp.stationCost);
    this.fx.impact(s.pos.x, s.pos.y);
    const gained = this.score.addStation(this.combo.combo);
    bus.emit('score:change', { score: this.score.total, gained });
  }

  private onStationLit(s: LightStation): void {
    this.stage.burstAt(s.pos.x, s.pos.y, 10, 1);
    const allLit = this.sources.allLit;
    this.rules.signal('lit');
    bus.emit('station:lit', { x: s.pos.x, y: s.pos.y, allLit });
    this.sources.emitStations();
    if (allLit) this.stage.celebrate(this.keeper.pos, CELEBRATE_SEC);
  }

  /** 풀숲 속에 있고, 빛을 쏜 직후가 아니면 숨은 것 */
  private get hidden(): boolean {
    return this.bushIn >= 0 && this.revealLeft <= 0 && !this.rules.stealth.exposed;
  }

  /** 걷기: 이동 스틱·키보드 중 센 쪽으로(마을 밖·장애물 안으로는 못 감), 카메라가 따라간다. 쓰러져 있으면 멈춤 */
  private walk(dt: number): void {
    const down = this.vitals.down;
    const raw = down ? { x: 0, y: 0 } : strongerInput(this.stickMove, this.desktop.move);
    const k = follow(dt, MOVE_TAU);
    this.moveVec = { x: this.moveVec.x + (raw.x - this.moveVec.x) * k, y: this.moveVec.y + (raw.y - this.moveVec.y) * k };
    const input = this.moveVec;
    const stepped = stepMove(this.keeper.pos, input, CFG.keeper.moveSpeed * this.items.speedMultiplier, dt, WALK_AREA);
    const feet = pushOut({ x: stepped.x, y: stepped.y + FEET_Y }, CFG.keeper.radius, this.obstacles);
    const next = { x: feet.x, y: feet.y - FEET_Y };
    this.revealLeft = Math.max(0, this.revealLeft - dt);
    this.bushIn = bushAt(feet, this.props.bushes, BUSH_INSET);
    // 풀숲에 너무 오래 있으면 들킨다 (2026-11-13 라이언)
    if (this.rules.stealth.update(dt, this.bushIn >= 0)) bus.emit('stealth:exposed');
    this.rules.walk(Math.hypot(next.x - this.keeper.pos.x, next.y - this.keeper.pos.y));
    this.props.update(dt, this.bushIn);
    // 숨으면 반투명, 무적이면 완만하게 맥박
    const pulse = this.vitals.invulnLeft > 0 ? 0.6 + 0.4 * Math.cos(this.time_ * Math.PI * 2 * INVULN_PULSE_HZ) : 1;
    this.keeper.setVeil((this.hidden ? CFG.hide.keeperAlpha : 1) * pulse);
    this.keeper.moveTo(next.x, next.y, input, dt);
    followCamera(this.cameras.main, next, dt);
    // 빛 스틱이 우선, 아니면 PC 마우스 끌기. 원뿔 반지름은 끈 거리에 비례 (스틱: 사거리 × 끈 정도, 마우스: 커서까지 거리)
    const stick = this.stickAim;
    const drag = stick ? null : this.desktop.dragPoint();
    const mouse = drag ? this.mouseAim(drag) : null;
    const aim = down ? null : (stick?.angle ?? mouse?.angle ?? null);
    const reach = stick ? stick.power * this.light.range : (mouse?.range ?? this.light.range);
    this.aimGuide.draw(this.keeper.pos, aim, reach, this.light.ready);
  }

  private mouseAim(point: Vec): { angle: number; range: number } | null {
    return dragAim(this.keeper.pos, point, this.light.range, CFG.controls.mouseCancelRadius);
  }

  /**
   * 빛 스틱을 놓음(또는 PC 마우스를 끌다 놓음). angle이 null이면 반자동: 사거리 안 가장 가까운 적,
   * 없으면 쏘지 않는다(2026-11-12 라이언 답변). reach = 끈 거리만큼(사거리를 넘지 않음)
   */
  fire(angle: number | null, reach = Infinity): void {
    if (this.paused || this.ended || this.vitals.down) return;
    const origin = this.keeper.pos;
    const aimables = [...this.field.active.filter((e) => e.def.kind !== 'passive' && !e.def.friend), ...(this.boss?.lightTargets() ?? [])];
    const a = angle ?? autoAimAngle(origin, aimables, this.light.range);
    if (a === null) return;
    const cast = this.light.tryCast(a, reach);
    if (!cast) return;
    this.lp.spend(CFG.lp.castCost);
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

  /** 맞음(HP만 줄어듦): 피격 동작·흰 번쩍임, 적 반대쪽으로 살짝 밀림(장애물·마을 끝 판정), 짧은 화면 흔들림 */
  private hurtKeeper(from: Vec): void {
    const k = this.keeper;
    k.hurt();
    this.fx.hurt(k.pos.x, k.pos.y);
    const dx = k.pos.x - from.x;
    const dy = k.pos.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const stepped = stepMove(k.pos, { x: dx / len, y: dy / len }, CFG.player.hurtKnockback, 1, WALK_AREA);
    const feet = pushOut({ x: stepped.x, y: stepped.y + FEET_Y }, CFG.keeper.radius, this.obstacles);
    k.pos.x = feet.x;
    k.pos.y = feet.y - FEET_Y;
    if (!prefersReducedMotion()) this.cameras.main.shake(HURT_SHAKE.ms, HURT_SHAKE.intensity);
  }

  /** 빛이 적에게 닿음: 위력은 LP에 따라 약해진다. HP 0이면 무리별 퇴장(구출·돌려보냄) + 콤보·점수 */
  private hitEnemy(e: Enemy, power = this.keeper.def.lightPower * this.lp.effectiveness): void {
    this.fx.impact(e.x, e.y);
    const calmPassive = e instanceof Creature && e.calm;
    const returned = e.hitByLight(power, CFG.light.knockback, CFG.light.stunSec, { from: this.keeper.pos, home: this.sources.central.pos });
    bus.emit('enemy:hit', { uid: e.uid, enemyId: e.def.id, remainingHp: Math.max(0, e.hp) });
    if (calmPassive) {
      // 공격하지 않아야 할 주민을 맞힘: 화가 난다 (점수 없음)
      bus.emit('passive:upset', { enemyId: e.def.id, x: e.x, y: e.y });
      this.rules.signal('upset');
      return;
    }
    if (!returned || e.def.kind === 'passive') return;
    if (e.def.friend) bus.emit('friend:rescued', { characterId: e.def.friend });
    if (e.def.kind === 'lost') this.rescued += 1;
    else this.retreated += 1;
    this.rules.signal(e.def.kind === 'lost' ? 'rescued' : 'retreated');
    const combo = this.combo.registerReturn();
    const gained = this.score.addReturn(e.def.score, combo);
    bus.emit('enemy:returned', { enemyId: e.def.id, kind: e.def.kind, x: e.x, y: e.y, score: gained, combo });
    bus.emit('score:change', { score: this.score.total, gained });
  }

  /** HUD 갱신: 값이 바뀌었을 때만 (force = 피격 등 바로) */
  private emitVitals(force = false): void {
    this.hud.emit(this.vitals, this.lp, this.sources.central.state.value, force);
  }

  private togglePause(): void {
    if (this.ended) return;
    this.paused = !this.paused;
    // 끌던 마우스는 버린다: 다시 시작한 뒤 놓는 순간 빛이 나가지 않게
    this.desktop.cancel();
    freeze(this, this.paused);
    bus.emit('run:pause', { paused: this.paused });
  }

  private pauseIfRunning(): void {
    if (!this.paused && !this.ended) this.togglePause();
  }

  /** 스테이지 끝: 아침(기본·완전 승리) 또는 오늘은 여기까지(하트 소진·중앙 광원 꺼짐) */
  private end(outcome: StageOutcome, reason: EndReason): void {
    this.ended = true;
    this.aimGuide.hide();
    this.edgeArrows.hide();
    this.keeper.rest(); // 걸음을 멈추고 정면 정지 모습으로 (2026-11-13 라이언), 잠든 경우는 그대로
    if (outcome === 'over') {
      if (reason === 'central') {
        this.keeper.ko();
        this.fx.sleep(this.keeper.pos.x, this.keeper.pos.y);
      }
      this.stage.fadeOut(OVER_SEC);
      const result = this.result(outcome, reason);
      this.time.delayedCall(OVER_SEC * 1000, () => {
        panForResult(this.cameras.main, this.keeper.pos);
        bus.emit('game:over', { result });
      });
      return;
    }
    let gained = this.score.addClear();
    if (outcome === 'complete') gained += this.score.applyComplete();
    bus.emit('score:change', { score: this.score.total, gained });
    this.stage.dawn(DAWN_SEC);
    // 아침이 오면 남은 적은 모두 스스로 물러난다(점수 없음). 구출하지 못한 친구는 그대로 (달려가면 구출한 것처럼 보임)
    const home = this.sources.central.pos;
    for (const e of this.field.active) if (e.def.kind !== 'passive' && !e.def.friend) e.hitByLight(e.hp, 0, CFG.light.stunSec, { from: home, home });
    const result = this.result(outcome, reason);
    this.time.delayedCall(DAWN_SEC * 1000, () => {
      panForResult(this.cameras.main, this.keeper.pos);
      bus.emit('game:clear', { result });
    });
  }

  /** 화면 크기가 바뀜 (세로 ↔ 가로, 창 크기): 화면에 붙은 층과 적이 나오는 가장자리를 새 크기로 */
  private onResize(gameSize: Phaser.Structs.Size): void {
    this.stage.resize(gameSize.width, gameSize.height);
    this.field.setArea(gameSize.width, gameSize.height);
    if (!this.ended) followCamera(this.cameras.main, this.keeper.pos, 1);
  }

  private result(outcome: StageOutcome, reason: EndReason): RunResult {
    const result: RunResult = {
      outcome,
      reason,
      stageId: this.stageDef.id,
      score: this.score.total,
      survivedSec: Math.round(this.clock.t * 10) / 10,
      rescued: this.rescued,
      retreated: this.retreated,
      stationsLit: this.sources.litCount,
      stationsTotal: this.sources.stations.length,
      heartsLeft: this.vitals.hearts,
      maxCombo: this.combo.maxCombo,
      characterId: this.keeper.def.id,
      seed: RunState.seed,
      continued: false,
      mercy: this.rules.mercyCount,
      itemsUsed: this.items.used,
      bossCalmed: !!this.boss?.calmed,
    };
    RunState.lastResult = result;
    return result;
  }

  private restart(): void {
    if (this.paused) freeze(this, false);
    RunState.newRun();
    this.scene.restart();
  }
}
