// 스테이지 규칙 조각 (2026-11-13 컨셉 시연판): 어둠의 행렬·자비·돌려보냄(2026-11-23), 빛을 잃은 친구, 풀숲 은신 시간, 튜토리얼 단계.
// PlayScene을 600줄 아래로 유지하려고 떼어 낸 조립 조각이다(판정은 systems/mercy·stealth·tutorial).
import { bus } from '../../core/events';
import type { Rng } from '../../core/rng';
import { GameData, type StageDef } from '../../data';
import { Creature } from '../../entities/enemies/Creature';
import type { ComboSystem } from '../../systems/ComboSystem';
import type { Vec } from '../../systems/fan';
import { MercyTracker } from '../../systems/mercy';
import { beyondSpots } from '../../systems/anger';
import { Parade } from './Parade';
import type { Enemy } from '../../entities/enemies/Enemy';
import { enemyById, type EnemyId } from '../../data';
import type { Rect } from '../../systems/obstacles';
import type { ScoreCalculator } from '../../systems/ScoreCalculator';
import { Stealth } from '../../systems/stealth';
import { TutorialScript, type TutorialSignal } from '../../systems/tutorial';
import type { EndReason, StageOutcome } from '../../systems/stageOutcome';
import type { EnemyField } from './EnemyField';
import type { Items } from './Items';
import { RunEvents } from './RunEvents';
import type { Sources } from './Sources';

const CFG = GameData.game;
/** 튜토리얼 '걷기'를 마치는 거리 (game.json tutorial.walkGoal, 제안) */
const WALK_GOAL = CFG.tutorial.walkGoal;

export interface RulesHost {
  field: EnemyField;
  items: Items;
  score: ScoreCalculator;
  combo: ComboSystem;
  keeper: () => Vec;
  litCount: () => number;
  sources: Sources;
  /** 점수가 바뀜 → HUD (런이면 누적, scenes/play/NightRun.ts) */
  emitScore(gained: number): void;
}

export class StageRules {
  mercyCount = 0;
  readonly stealth = new Stealth(CFG.hide.maxHiddenSec);
  readonly tutorial: TutorialScript | null;
  /** 빛을 잃은 친구 (나타난 뒤 구출 전) */
  friend: Creature | null = null;
  private readonly mercy = new MercyTracker(CFG.mercy);
  /** 세 번 맞혀 돌려보낸 패시브 수 (두 길, 2026-11-23) */
  banishCount = 0;
  /** 어둠의 행렬 (2026-11-23) */
  readonly parade: Parade;
  private walked = 0;
  /** 랜덤 이벤트 (2026-11-18, scenes/play/RunEvents.ts) */
  readonly events: RunEvents;

  constructor(
    private readonly host: RulesHost,
    private readonly stage: StageDef,
    private readonly rng: Rng,
    private readonly area: Rect,
  ) {
    this.tutorial = stage.tutorial ? new TutorialScript() : null;
    this.parade = new Parade(host.field, stage, rng, area);
    this.events = new RunEvents({ field: host.field, items: host.items, sources: host.sources, keeper: host.keeper, mercyCount: () => this.mercyCount }, stage, rng);
  }

  start(): void {
    if (this.tutorial) this.enterStep();
  }

  /** 행렬·친구·자비 */
  update(dt: number, progress: number, playerVisible: boolean): void {
    const h = this.host;
    const p = h.keeper();
    this.parade.update(progress * this.stage.durationSec);
    this.events.update(dt, progress);
    const f = h.field.spawnFriend(progress, this.stage, p);
    if (f) this.friend = f;
    if (this.friend && !this.friend.targetable) this.friend = null;

    const calm = h.field.enemies.filter((e): e is Creature => e instanceof Creature && e.calm);
    for (const uid of this.mercy.update(dt, calm.map((c) => ({ uid: c.uid, x: c.x, y: c.y, upset: c.upset })), playerVisible ? p : null)) {
      const c = calm.find((e) => e.uid === uid);
      if (!c) continue;
      c.thank();
      this.parade.noteMercy(c);
      this.mercyCount += 1;
      const gained = h.score.addMercy(h.combo.combo);
      bus.emit('mercy:gain', { enemyId: c.def.id, x: c.x, y: c.y, score: gained });
      h.emitScore(gained);
      this.signal('mercy');
    }
  }

  /**
   * 행렬의 패시브가 빛에 맞음 (2026-11-23): 반격하지 않고 웅크린다(소리는 passive:upset, 튜토리얼 '지나치기' 단계도 끝남).
   * 세 번째면 돌려보냄 — 곧바로 그 주민 너머(루미 반대쪽) 어둠에서 그 밤 로스터의 호스틸이 나온다(game.json passive.banishHostile*).
   * 점수(150 × 배율)는 Hits가 매긴다
   */
  passiveHit(e: Enemy, banished: boolean): void {
    const c = e instanceof Creature ? e : null;
    bus.emit('passive:upset', { enemyId: e.def.id, x: e.x, y: e.y });
    this.signal('upset');
    if (!banished) {
      bus.emit('passive:cower', { enemyId: e.def.id, x: e.x, y: e.y, hits: c?.parade?.hits ?? 1 });
      return;
    }
    this.banishCount += 1;
    if (c) this.parade.noteBanish(c);
    bus.emit('passive:banished', { enemyId: e.def.id, x: e.x, y: e.y });
    if (this.tutorial) return;
    const hostiles = Object.keys(this.stage.spawn.normal.weights).filter((id) => enemyById(id as EnemyId).kind === 'hostile') as EnemyId[];
    for (const at of beyondSpots(e, this.host.keeper(), CFG.passive, this.area)) {
      this.host.field.spawnAt(hostiles.length ? hostiles[Math.floor(this.rng.range(0, hostiles.length)) % hostiles.length] : 'bat', at.x, at.y);
    }
  }

  /** 튜토리얼 '걷기' 거리 */
  walk(dist: number): void {
    if (!this.tutorial || this.tutorial.index !== 0) return;
    this.walked += dist;
    if (this.walked >= WALK_GOAL) this.signal('walked');
  }

  /** 튜토리얼 신호: 지금 단계의 조건이면 다음 단계로 */
  signal(s: TutorialSignal): void {
    if (!this.tutorial?.signal(s)) return;
    this.enterStep();
  }

  /** 판 끝 판정: 튜토리얼을 마침 / 연습장·튜토리얼은 끝나지 않음 / 노월을 진정시킴(이유 boss) / 그 밖은 judged 그대로 */
  verdict(judged: { outcome: StageOutcome; reason: EndReason } | null, bossCalmed: boolean, safe: boolean): { outcome: StageOutcome; reason: EndReason } | null {
    if (this.tutorialDone) return { outcome: 'victory', reason: 'tutorial' };
    if (safe) return null;
    if (judged && bossCalmed && judged.outcome !== 'over') return { outcome: judged.outcome, reason: 'boss' };
    return judged;
  }

  get tutorialDone(): boolean {
    return !!this.tutorial?.done;
  }

  private enterStep(): void {
    const t = this.tutorial;
    if (!t) return;
    const step = t.step;
    bus.emit('tutorial:step', { step: t.index, total: t.total, text: step?.text ?? '잘했어요! 이제 진짜 밤을 지킬 준비가 됐어요', done: !step });
    if (!step) return;
    const p = this.host.keeper();
    const f = this.host.field;
    if (step.spawn === 'bat') f.spawnAt('bat', p.x + 300, p.y - 160);
    else if (step.spawn === 'frog') f.spawnAt('frog', p.x - 300, p.y + 40);
    else if (step.spawn === 'owl') f.spawnAt('owl', p.x + 260, p.y + 20);
    else if (step.spawn === 'item') this.host.items.drop('firefly_jar', p.x + 110, p.y + 50);
    // 이미 이룬 조건이면 바로 넘어간다 (등불을 먼저 켠 경우)
    if (step.until.includes('lit') && this.host.litCount() > 0) this.signal('lit');
  }
}
