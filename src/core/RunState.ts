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
  /** 홈의 `테스트` 판 = 연습장(2026-11-13 라이언: 스타파크식 — 같은 마을, 적 적게, 끝나지 않음). stageId는 'practice' */
  test: false,

  newRun(): void {
    this.seed = makeSeed();
    this.lastResult = null;
  },
};
