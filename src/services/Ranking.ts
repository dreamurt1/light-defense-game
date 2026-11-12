// 랭킹 인터페이스. M1~M4는 LocalRanking(localStorage), M5에서 Firestore RemoteRanking이 같은 모양으로 붙는다.
import type { CharacterId } from '../data';
import type { Outcome } from '../core/events';

export type RankingPeriod = 'day' | 'week' | 'all';

/** 점수 제출 본문 (CLAUDE.md 7절 필드) */
export interface ScoreSubmission {
  playerId: string;
  nickname: string;
  score: number;
  survivedSec: number;
  characterId: CharacterId;
  equipmentId: string | null;
  maxCombo: number;
  seed: number;
  clientVersion: string;
  outcome: Outcome;
  continued?: boolean;
}

export interface RankingRow {
  rank: number;
  nickname: string;
  score: number;
  survivedSec: number;
  characterId: CharacterId;
  outcome: Outcome;
  continued: boolean;
  createdAt: number;
}

export interface Ranking {
  submit(entry: ScoreSubmission): Promise<{ rank: number }>;
  top(period: RankingPeriod, limit?: number): Promise<RankingRow[]>;
  me(playerId: string, period: RankingPeriod): Promise<{ rank: number; best: RankingRow } | null>;
}
