// 빛이 맞힌 것 처리 (PlayScene을 600줄 아래로 유지하려고 2026-11-23 떼어 냄):
//  - 적: 위력은 LP에 따라 약해진다. HP 0이면 무리별 퇴장(구출·돌려보냄) + 콤보·점수
//  - 노월·어둠 구슬
//  - 꺼진 등불: 남은 LP와 상관없이 켜지고, 쏜 뒤 LP가 준다(XMind)
import { bus } from '../../core/events';
import { GameData, enemyById } from '../../data';
import type { Enemy } from '../../entities/enemies/Enemy';
import type { LightFx } from '../../entities/LightFx';
import type { Lightkeeper } from '../../entities/Lightkeeper';
import type { LightStation } from '../../entities/LightStation';
import type { ComboSystem } from '../../systems/ComboSystem';
import type { LightPoints } from '../../systems/lightPoints';
import type { ScoreCalculator } from '../../systems/ScoreCalculator';
import type { Boss } from './Boss';
import type { Sources } from './Sources';
import type { StageRules } from './StageRules';

const CFG = GameData.game;

export interface HitHost {
  fx: LightFx;
  keeper: Lightkeeper;
  lp: LightPoints;
  rules: StageRules;
  score: ScoreCalculator;
  combo: ComboSystem;
  sources: Sources;
  boss: Boss | null;
  /** 꺼진 등불 점화 시간 배율 (토리 빠른 발) */
  igniteMultiplier: number;
  /** 점수가 바뀜 → HUD (런 누적은 NightRun) */
  emitScore(gained: number): void;
}

export class Hits {
  /** 구출한 잃어버린 주민 */
  rescued = 0;
  /** 돌려보낸 어둠의 호스틸 */
  retreated = 0;

  constructor(private readonly h: HitHost) {}

  /** 지금 빛의 위력 */
  get power(): number {
    return this.h.keeper.def.lightPower * this.h.lp.effectiveness;
  }

  /** 빛이 적에게 닿음 */
  enemy(e: Enemy, power = this.power): void {
    const h = this.h;
    h.fx.impact(e.x, e.y);
    const returned = e.hitByLight(power, CFG.light.knockback, CFG.light.stunSec, { from: h.keeper.pos, home: h.sources.central.pos });
    bus.emit('enemy:hit', { uid: e.uid, enemyId: e.def.id, remainingHp: Math.max(0, e.hp) });
    // 어둠의 행렬(2026-11-23): 반격하지 않고 웅크림, 세 번째면 돌려보냄 — 어둠 점수 150 × 배율(별가루 없음), 그 너머의 호스틸은 StageRules
    if (e.def.kind === 'passive') {
      h.rules.passiveHit(e, returned);
      if (!returned) return;
      const combo = h.combo.registerReturn();
      const gained = h.score.addReturn(CFG.score.banishPassive, combo);
      bus.emit('enemy:returned', { enemyId: e.def.id, kind: e.def.kind, x: e.x, y: e.y, score: gained, combo });
      h.emitScore(gained);
      return;
    }
    if (!returned) return;
    if (e.def.friend) bus.emit('friend:rescued', { characterId: e.def.friend });
    if (e.def.kind === 'lost') this.rescued += 1;
    else this.retreated += 1;
    h.rules.signal(e.def.kind === 'lost' ? 'rescued' : 'retreated');
    const combo = h.combo.registerReturn();
    const gained = h.score.addReturn(e.def.score, combo);
    bus.emit('enemy:returned', { enemyId: e.def.id, kind: e.def.kind, x: e.x, y: e.y, score: gained, combo });
    h.emitScore(gained);
  }

  /** 노월·어둠 구슬에 빛이 닿음 */
  boss(uid: number): void {
    const h = this.h;
    const r = h.boss?.hit(uid, this.power);
    const p = h.boss?.pos;
    if (!r) return;
    if (p && r !== 'orb') h.fx.impact(p.x, p.y - 40);
    if (r === 'hit') return;
    const points = r === 'orb' ? CFG.score.orbPop : enemyById('witch').score;
    h.emitScore(h.score.addReturn(points, r === 'calmed' ? h.combo.registerReturn() : h.combo.combo));
  }

  /** 꺼진 등불에 빛이 닿음 */
  ignite(s: LightStation | undefined): void {
    const h = this.h;
    if (!s || !s.ignite(h.igniteMultiplier)) return;
    h.lp.spend(CFG.lp.stationCost);
    h.fx.impact(s.pos.x, s.pos.y);
    h.emitScore(h.score.addStation(h.combo.combo));
  }
}
