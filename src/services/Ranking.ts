// 랭킹 인터페이스. M1~M4는 LocalRanking(localStorage), M5에서 Firestore RemoteRanking이 같은 모양으로 붙는다.
import type { CharacterId } from '../data';
import type { Outcome } from '../core/events';
import type { RunPath } from '../systems/nightRules';

/** 런의 끝 (2026-11-23 밤 나들이): over = 오늘은 여기까지, home = 아침에 집으로. 옛 기록은 victory·complete도 있음 */
export type RankOutcome = Outcome | 'home';

export type RankingPeriod = 'day' | 'week' | 'all';

/** 점수 제출 본문 (CLAUDE.md 7절 필드) */
export interface ScoreSubmission {
  playerId: string;
  nickname: string;
  score: number;
  survivedSec: number;
  characterId: CharacterId;
  /** 2026-11-12 새 기획: 장착물 대신 스테이지 — 2026-11-23부터 런은 'night' */
  stageId: string;
  /** 아침을 맞은 밤 수 (2026-11-23) */
  nights: number;
  /** 두 길 */
  path: RunPath;
  /** 이번 런에 얻은 별가루 */
  dust: number;
  maxCombo: number;
  seed: number;
  clientVersion: string;
  outcome: RankOutcome;
  continued?: boolean;
}

export interface RankingRow {
  rank: number;
  nickname: string;
  score: number;
  survivedSec: number;
  characterId: CharacterId;
  outcome: RankOutcome;
  continued: boolean;
  createdAt: number;
  nights: number;
  path: RunPath;
}

export interface Ranking {
  submit(entry: ScoreSubmission): Promise<{ rank: number }>;
  top(period: RankingPeriod, limit?: number): Promise<RankingRow[]>;
  me(playerId: string, period: RankingPeriod): Promise<{ rank: number; best: RankingRow } | null>;
}
