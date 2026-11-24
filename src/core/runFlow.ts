// 런 흐름 (2026-11-23 밤 나들이 v3, NIGHT_RUN.md 4-3·4-4절) — 밤의 끝을 아침·런의 끝으로 잇는다(DOM 쪽, main.ts에서 한 번).
//  - 정식 런의 밤을 이김(game:clear) → 런에 쌓고(하트·완전 승리 보상·다음 밤) 저장 → run:morning → 아침 화면
//  - 정식 런의 밤을 짐(game:over) → 런의 끝: 저장을 지우고 최고 기록 → run:end → 결과 화면
//  - 아침의 '다음 밤으로' = nextNight, '집으로' = goHome → run:end
//  - 테스트 '밤 n 체험'·튜토리얼·트라이얼은 여기를 지나지 않는다(결과 화면이 game:* 를 바로 받음)
import { bus, type RunResult } from './events';
import { Progress } from './Progress';
import { NIGHT_STAGE, RunState } from './RunState';
import { clearRun, loadRun, saveRun } from './runSave';
import { makeSeed } from './rng';
import { GameData, type CharacterId } from '../data';
import { morningAfter, newRunData, recordNight, summarize, type NightOutcome, type RunData, type RunSummary } from '../systems/nightRun';
import { homeBonus } from '../systems/stardust';

/** 밤 결과 → 런에 쌓을 것 */
export function outcomeOf(r: RunResult): NightOutcome {
  return {
    outcome: r.outcome,
    score: r.score,
    survivedSec: r.survivedSec,
    heartsLeft: r.heartsLeft,
    rescued: r.rescued,
    retreated: r.retreated,
    stationsLit: r.stationsLit,
    maxCombo: r.maxCombo,
    mercy: r.mercy,
    itemsUsed: r.itemsUsed,
    banish: r.banish,
    dust: r.dust,
    xp: r.xp,
    level: r.level,
    friends: r.friends,
    witch: r.witch,
    mapId: r.mapId,
  };
}

function enterRun(run: RunData): void {
  RunState.run = run;
  RunState.characterId = run.characterId;
  RunState.stageId = NIGHT_STAGE;
  RunState.test = false;
  RunState.trialCharacterId = null;
  RunState.testMapId = null;
}

/** 새 런: 밤 1부터 (저장해 두어 밤 1 도중에 나가도 이어서 하기) */
export function startNewRun(characterId: CharacterId): void {
  const run = newRunData(makeSeed(), characterId, GameData.game.stage.hearts);
  enterRun(run);
  saveRun(run);
  // 첫 구간(빛의 마을)의 맵은 런을 시작하면 발견한 것으로 (발견한 지역 n/6, 2026-11-23)
  Progress.discover(GameData.nights.bands[0]?.maps ?? []);
  bus.emit('ui:start-run');
}

/** 저장된 런 (홈의 '이어서 하기') */
export function savedRun(): RunData | null {
  return loadRun();
}

/** 저장된 런을 그 밤의 처음부터 */
export function continueRun(): boolean {
  const run = loadRun();
  if (!run) return false;
  enterRun(run);
  bus.emit('ui:start-run');
  return true;
}

/** 아침의 '다음 밤으로' */
export function nextNight(): void {
  if (!RunState.isRealRun) return;
  bus.emit('ui:start-run');
}

function finish(summary: RunSummary): void {
  clearRun();
  const best = Progress.recordRun(summary.nights, summary.score);
  bus.emit('run:end', { summary, best });
}

/** 아침의 '집으로 (기록을 남겨요)' */
export function goHome(): void {
  const run = RunState.run;
  if (!run || !RunState.isRealRun) return;
  // 귀가 보너스 (2026-11-24 구조 보강 ①): 이번 나들이 별가루 +20%(올림·최소 1) — 광원이 잠든 런엔 없음
  const bonus = homeBonus(run.dustEarned, GameData.game.dust);
  Progress.addDust(bonus);
  const summary = summarize(run, 'home', 'home', RunState.lastResult?.survivedSec ?? 0);
  finish({ ...summary, dust: summary.dust + bonus, homeBonus: bonus });
}

export function installRunFlow(): void {
  bus.on('game:clear', (e) => {
    const before = RunState.run;
    if (!RunState.isRealRun || !before || e.result.reason === 'tutorial') return;
    const run = morningAfter(before, outcomeOf(e.result), GameData.game.run);
    RunState.run = run;
    // 별가루는 아침에 잔액으로 (런이 끝나도 남는다) — 저장보다 먼저: 새로고침해도 잃지 않게
    Progress.addDust(e.result.dust ?? 0);
    saveRun(run);
    bus.emit('run:morning', { result: e.result, before, run });
    // game:clear는 판의 프레임 안(시간 예약)에서 온다: 그 자리에서 씬을 멈추면 남은 프레임이 사라진 카메라를 읽는다 → 프레임이 끝난 뒤에
    setTimeout(() => bus.emit('ui:navigate', { to: 'morning' }), 0);
  });
  bus.on('game:over', (e) => {
    const before = RunState.run;
    if (!RunState.isRealRun || !before) return;
    const run = recordNight(before, outcomeOf(e.result));
    RunState.run = run;
    // 진 밤에 모은 별가루도 남긴다 (승리 보너스만 없음)
    Progress.addDust(e.result.dust ?? 0);
    finish(summarize(run, 'over', e.result.reason, e.result.survivedSec));
  });
}
