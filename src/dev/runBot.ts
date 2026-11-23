// 개발 전용: 밸런스 측정용 자동 런 (2026-11-23 밤 나들이 v3, NIGHT_RUN.md 8절). 빌드에는 들어가지 않는다(autoplay.ts에서만).
//   ?autoplay=run&skill=0.5&seed=7      런을 밤 1부터 끝날 때까지(상한 밤 15 — 넘으면 '집으로') 자동으로 돈다
//   &speed=4                             빨리 감기: 한 화면에 판을 4번 진행하고 한 번만 그린다(dt는 그대로라 판정이 같다)
//   &cap=15                              상한 밤 (기본 15)
// 아침마다: 별가루가 되면 여분 하트 → 등불 기름 순으로 사고 0.4초 뒤 '다음 밤으로'. 새 프로필(별가루 0)에서 시작한다.
// 결과는 window.__runLog = { nights: [밤마다], done, summary } — scripts/balance-run.mjs가 읽는다.
import Phaser from 'phaser';
import { bus } from '../core/events';
import { Progress } from '../core/Progress';
import { RunState } from '../core/RunState';
import { goHome, nextNight } from '../core/runFlow';
import { saveRun } from '../core/runSave';
import { GameData } from '../data';
import { buyPrep, canBuy } from '../systems/shop';

export interface RunLogNight {
  night: number;
  outcome: string;
  score: number;
  hearts: number;
  level: number;
  mapId: string | null;
  reason: string;
  survivedSec: number;
  bossCalmed: boolean;
  mercy: number;
  banish: number;
  witch: boolean;
  friends: string[];
  sec: number;
  /** 이번 밤 중앙 광원 HP 최저 비율(%) */
  centralLow: number;
}

export interface RunLog {
  skill: number;
  seed: number;
  nights: RunLogNight[];
  done: boolean;
  summary: { nights: number; score: number; path: string; reason: string; lastNight: number } | null;
  /** 실제로 걸린 시간(초) */
  wallSec: number;
}

declare global {
  interface Window {
    __runLog?: RunLog;
  }
}

/** 빨리 감기: Game.step을 감싸 판 진행(scene.update)만 n번, 그리기는 마지막 한 번 */
export function installSpeed(game: Phaser.Game, n: number): void {
  if (n <= 1) return;
  // 게임이 시작될 때 TimeStep이 game.step을 묶어 callback으로 갖고 있으므로 그 callback을 감싼다
  const g = game as unknown as { scene: { update(t: number, d: number): void }; events: Phaser.Events.EventEmitter; isPaused: boolean; pendingDestroy: boolean };
  const loop = game.loop as unknown as { callback(time: number, delta: number): void };
  const original = loop.callback.bind(game.loop);
  let vt = 0;
  loop.callback = (time: number, delta: number) => {
    if (g.pendingDestroy || g.isPaused) return original(time, delta);
    vt = Math.max(vt, time);
    for (let i = 0; i < n - 1; i++) {
      vt += delta;
      g.events.emit(Phaser.Core.Events.PRE_STEP, vt, delta);
      g.events.emit(Phaser.Core.Events.STEP, vt, delta);
      g.scene.update(vt, delta);
      g.events.emit(Phaser.Core.Events.POST_STEP, vt, delta);
    }
    vt += delta;
    original(vt, delta);
  };
}

/** 아침 자동 진행·기록 */
export function installRunBot(skill: number, seed: number, cap: number): void {
  const started = performance.now();
  const log: RunLog = { skill, seed, nights: [], done: false, summary: null, wallSec: 0 };
  window.__runLog = log;
  // 새 프로필처럼: 별가루 0에서
  Progress.spendDust(Progress.data.dust);

  bus.on('run:morning', (e) => {
    const r = e.result;
    log.nights.push({
      night: e.before.night,
      outcome: r.outcome,
      score: r.score,
      hearts: e.run.hearts,
      level: e.run.level,
      mapId: r.mapId ?? null,
      reason: r.reason,
      survivedSec: Math.round(r.survivedSec),
      bossCalmed: r.bossCalmed,
      mercy: r.mercy,
      banish: r.banish ?? 0,
      witch: !!r.witch,
      friends: [...(r.friends ?? [])],
      sec: Math.round((performance.now() - started) / 1000),
      centralLow: Math.round(((window as unknown as { __centralLowest?: () => number }).__centralLowest?.() ?? -0.01) * 100),
    });
    setTimeout(() => {
      const run = RunState.run;
      if (!run) return;
      if (run.night > cap) {
        goHome();
        return;
      }
      // 여분 하트 → 등불 기름 (살 수 있으면)
      let next = run;
      for (const id of ['spare_heart', 'lamp_oil']) {
        const def = GameData.shop.prep.find((p) => p.id === id);
        if (def && canBuy(def, next, Progress.data.dust) === 'ok' && Progress.spendDust(def.price)) next = buyPrep(def, next, GameData.game.run.maxHearts);
      }
      if (next !== run) {
        RunState.run = next;
        saveRun(next);
      }
      nextNight();
    }, 400);
  });
  bus.on('game:over', (e) => {
    const r = e.result;
    log.nights.push({
      night: RunState.run?.night ?? 0,
      outcome: r.outcome,
      score: r.score,
      hearts: 0,
      level: r.level ?? 0,
      mapId: r.mapId ?? null,
      reason: r.reason,
      survivedSec: Math.round(r.survivedSec),
      bossCalmed: r.bossCalmed,
      mercy: r.mercy,
      banish: r.banish ?? 0,
      witch: !!r.witch,
      friends: [...(r.friends ?? [])],
      sec: Math.round((performance.now() - started) / 1000),
      centralLow: Math.round(((window as unknown as { __centralLowest?: () => number }).__centralLowest?.() ?? -0.01) * 100),
    });
  });
  bus.on('run:end', (e) => {
    const s = e.summary;
    log.summary = { nights: s.nights, score: s.score, path: s.path, reason: s.reason, lastNight: s.night };
    log.done = true;
    log.wallSec = Math.round((performance.now() - started) / 1000);
  });
}
