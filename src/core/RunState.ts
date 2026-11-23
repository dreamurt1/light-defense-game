// 한 판 단위로 씬과 UI가 공유하는 상태. scene.start 인자로 넘기지 않고 이 객체 하나를 본다.
// 2026-11-23 밤 나들이 v3: 정식 판 = 런(stageId 'night', run = 런 상태 — systems/nightRun.ts). 밤 n의 규칙은 systems/nightRules.ts.
// 튜토리얼('tutorial')·트라이얼('trial')은 stages.json 그대로. 테스트 '밤 n 체험'도 stageId 'night' + test + 그 밤만 담은 run.
import type { CharacterId } from '../data';
import type { RunResult } from './events';
import { makeSeed } from './rng';
import { nightSeed } from '../systems/nightRules';
import type { RunData } from '../systems/nightRun';

export const DEFAULT_NICKNAME = '이름 없는 등불지기';
/** 런(연속 밤)의 판 */
export const NIGHT_STAGE = 'night';

export const RunState = {
  /** 루미가 기본. 토리·도토는 구출 후 해금 */
  characterId: 'lumi' as CharacterId,
  /** 'night' = 런의 밤, 'tutorial', 'trial' (stages.json) */
  stageId: NIGHT_STAGE as string,
  nickname: DEFAULT_NICKNAME,
  /** 이번 판(밤)의 seed. 런이면 런 seed와 밤 번호로 정해진다 */
  seed: makeSeed(),
  lastResult: null as RunResult | null,
  /** 홈의 `테스트` 판 (트라이얼 · 밤 n 체험). 진행·지난 밤들에 남지 않음 */
  test: false,
  /** 트라이얼에서 고른 등불지기 (2026-11-18 라이언). 선택 화면의 characterId는 건드리지 않는다: 잠긴 친구가 정식 판으로 새지 않게 */
  trialCharacterId: null as CharacterId | null,
  /** 지금 런 (정식 런·밤 n 체험). 튜토리얼·트라이얼이면 null */
  run: null as RunData | null,
  /** 테스트 메뉴에서 고른 맵 (밤 n 체험, Phase 10) */
  testMapId: null as string | null,

  /** 이번 판에 실제로 뛰는 등불지기 */
  get keeperId(): CharacterId {
    return this.test && this.trialCharacterId ? this.trialCharacterId : this.characterId;
  },

  /** 런의 밤인가 (정식 런 또는 밤 n 체험) */
  get isNight(): boolean {
    return this.stageId === NIGHT_STAGE && this.run !== null;
  },

  /** 기록이 남는 정식 런인가 */
  get isRealRun(): boolean {
    return this.isNight && !this.test;
  },

  /** 새 판: 런의 밤이면 그 밤의 seed(같은 밤을 다시 하면 같은 밤), 아니면 새 seed */
  newRun(): void {
    this.seed = this.isNight && this.run ? nightSeed(this.run.seed, this.run.night) : makeSeed();
    this.lastResult = null;
  },
};
