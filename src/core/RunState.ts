// 한 판 단위로 씬과 UI가 공유하는 상태. scene.start 인자로 넘기지 않고 이 객체 하나를 본다.
import type { CharacterId } from '../data';
import type { RunResult } from './events';
import { makeSeed } from './rng';

export const DEFAULT_NICKNAME = '이름 없는 등불지기';

export const RunState = {
  /** 루미가 기본. 토리·도토는 구출 후 해금(Phase 5) */
  characterId: 'lumi' as CharacterId,
  /** 지금 스테이지 (stages.json). 스테이지 진행은 Phase 5 */
  stageId: 'stage-1',
  nickname: DEFAULT_NICKNAME,
  seed: makeSeed(),
  lastResult: null as RunResult | null,
  /** 홈의 `테스트` 판 (2026-11-14 라이언: 각 스테이지 실제 체험판 · 트라이얼 'trial' = 고정된 적 연습장, 끝없음). 진행·지난 밤들에 남지 않음 */
  test: false,
  /** 트라이얼에서 고른 등불지기 (2026-11-18 라이언: 테스트 > 트라이얼에서 루미·토리·도토를 골라 봄 — 잠김과 상관없이).
   *  선택 화면의 characterId는 건드리지 않는다: 잠긴 친구가 정식 판으로 새지 않게. 테스트 판에서만 쓰임 */
  trialCharacterId: null as CharacterId | null,

  /** 이번 판에 실제로 뛰는 등불지기 */
  get keeperId(): CharacterId {
    return this.test && this.trialCharacterId ? this.trialCharacterId : this.characterId;
  },

  newRun(): void {
    this.seed = makeSeed();
    this.lastResult = null;
  },
};
