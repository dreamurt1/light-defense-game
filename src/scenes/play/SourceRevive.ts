// 하트로 광원 되살리기 (2026-11-24 다듬기 1차, 라이언 확정 — 지시서 order-night-run-v3-tune-26-1124 3절)
// PlayScene을 600줄 아래로 유지하려고 떼어 낸 조립 조각. 판정은 systems/stageOutcome.ts canReviveSource.
//  - 중앙 광원 HP가 0이 되는 순간 하트가 남아 있으면: 하트 −1, 광원 HP hpRatio(40%), 무적 invulnSec,
//    빛기둥(루미 부활과 같은 fx-respawn)과 함께 1.5초 동안 광원 둘레 pushRadius 안의 적을 밀어냄(0·0.5·1.0초 세 번)
//  - 한 밤에 maxPerNight(1)번. 루미 자신의 마지막 하트는 쓰지 않는다(하트 2개 이상일 때만)
//  - 이야기: 루미는 광원의 파편이라 제 빛(하트)으로 광원을 깨운다
//  - 안내 한 줄(기획 세션 문구 '광원이 잠들면 루미의 하트로 한 번 깨울 수 있어요'): 튜토리얼은 건너뛸 수 없는 6단계라 단계를 늘리지 않고,
//    런의 밤에서 광원이 처음 '낮음'(광도 25 아래)으로 떨어졌을 때 되살릴 수 있으면 그 밤에 한 번 띄운다
import { bus } from '../../core/events';
import { GameData } from '../../data';
import type { Enemy } from '../../entities/enemies/Enemy';
import type { CentralSource } from '../../entities/CentralSource';
import type { LightFx } from '../../entities/LightFx';
import { canReviveSource } from '../../systems/stageOutcome';
import type { Vitals } from '../../systems/vitals';

const CFG = GameData.game;
/** 밀어내는 시간과 간격 (지시서 1.5초) */
const PUSH_SEC = 1.5;
const PUSH_EVERY = 0.5;
/** 광원 판정 점에서 받침 바닥까지 (entities/CentralSource FOOT_BELOW) */
const FOOT_BELOW = 50;

export class SourceRevive {
  /** 이번 밤에 되살린 횟수 */
  used = 0;
  private pushLeft = 0;
  private pushTimer = 0;
  private hinted = false;

  /** @param allowed 런의 밤일 때만 (튜토리얼·트라이얼은 없음) */
  constructor(private readonly allowed: boolean) {}

  /** 광원이 꺼진 이 프레임에 되살릴 수 있으면 되살린다 @returns 되살렸으면 true */
  tryRevive(central: CentralSource, vitals: Vitals, fx: LightFx, enemies: readonly Enemy[]): boolean {
    const cfg = CFG.run.sourceRevive;
    if (!central.state.out || !canReviveSource(cfg, { allowed: this.allowed, hearts: vitals.hearts, used: this.used })) return false;
    this.used += 1;
    vitals.spendHeart();
    central.state.revive(cfg.hpRatio, cfg.invulnSec);
    central.revived();
    fx.respawn(central.pos.x, central.pos.y + FOOT_BELOW);
    this.pushLeft = PUSH_SEC;
    this.pushTimer = 0;
    this.push(central, enemies);
    bus.emit('central:revived', { hearts: vitals.hearts });
    return true;
  }

  /** 되살린 뒤 1.5초 동안 둘레의 적을 밀어낸다 */
  update(dt: number, central: CentralSource, enemies: readonly Enemy[], vitals: Vitals): void {
    if (!this.hinted && !central.state.out && central.state.light < CFG.lightLevels.bands[0]) {
      this.hinted = true;
      const cfg = CFG.run.sourceRevive;
      if (canReviveSource(cfg, { allowed: this.allowed, hearts: vitals.hearts, used: this.used })) bus.emit('central:reviveHint');
    }
    if (this.pushLeft <= 0) return;
    this.pushLeft -= dt;
    this.pushTimer += dt;
    if (this.pushTimer < PUSH_EVERY || this.pushLeft <= 0) return;
    this.pushTimer = 0;
    this.push(central, enemies);
  }

  private push(central: CentralSource, enemies: readonly Enemy[]): void {
    const at = central.pos;
    const r = CFG.run.sourceRevive.pushRadius;
    for (const e of enemies) {
      if (Math.hypot(e.x - at.x, e.y - at.y) > r) continue;
      e.hitByLight(0, CFG.player.respawnPush, CFG.light.stunSec * 2, { from: at, home: at });
    }
  }
}
