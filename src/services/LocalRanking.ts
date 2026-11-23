// localStorage 랭킹. 최대 100행, 점수 → 아침을 맞은 밤 수 → 버틴 시간 → 먼저 등록한 순.
// 2026-11-23 밤 나들이 v3: 'ld.ranking.v3'(밤 수·길·별가루). 처음 읽을 때 v2 기록을 옮긴다 — 한 판 = 한 밤(승리면 1, 아니면 0), 길은 중립.
import type { Ranking, RankingPeriod, RankingRow, ScoreSubmission } from './Ranking';

/** 2026-11-12 새 기획으로 점수 체계가 바뀌어 새 칸에 쌓는다(옛 기록은 v1에 그대로 남음). 2026-11-23 v3 */
const STORAGE_KEY = 'ld.ranking.v3';
const V2_KEY = 'ld.ranking.v2';
const PLAYER_KEY = 'ld.player.v1';
export const MAX_ROWS = 100;

interface StoredRow extends ScoreSubmission {
  createdAt: number;
}

/** 주간 랭킹은 월요일 0시(로컬) 기준 */
export function periodStart(period: RankingPeriod, now: Date): number {
  if (period === 'all') return 0;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week') {
    const sinceMonday = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - sinceMonday);
  }
  return d.getTime();
}

export function compareRows(a: Pick<StoredRow, 'score' | 'nights' | 'survivedSec' | 'createdAt'>, b: Pick<StoredRow, 'score' | 'nights' | 'survivedSec' | 'createdAt'>): number {
  return b.score - a.score || (b.nights ?? 0) - (a.nights ?? 0) || b.survivedSec - a.survivedSec || a.createdAt - b.createdAt;
}

/** v2 한 줄 → v3 (한 판 = 한 밤) */
export function migrateRowV2(r: Omit<StoredRow, 'nights' | 'path' | 'dust'> & Partial<StoredRow>): StoredRow {
  return { ...r, nights: r.nights ?? (r.outcome === 'over' ? 0 : 1), path: r.path ?? 'mixed', dust: r.dust ?? 0 };
}

export class LocalRanking implements Ranking {
  constructor(
    private readonly storage: Pick<Storage, 'getItem' | 'setItem'>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async submit(entry: ScoreSubmission): Promise<{ rank: number }> {
    const createdAt = this.now().getTime();
    const rows = [...this.read(), { ...entry, createdAt }].sort(compareRows).slice(0, MAX_ROWS);
    this.write(rows);
    const index = rows.findIndex((r) => r.createdAt === createdAt && r.playerId === entry.playerId && r.score === entry.score);
    // 100위 밖으로 밀려 저장되지 않았으면 전체 순위로 계산해서 돌려준다
    const rank = index >= 0 ? index + 1 : rows.filter((r) => compareRows(r, { ...entry, createdAt }) < 0).length + 1;
    return { rank };
  }

  async top(period: RankingPeriod, limit = MAX_ROWS): Promise<RankingRow[]> {
    return this.inPeriod(period).slice(0, limit).map(toRow);
  }

  async me(playerId: string, period: RankingPeriod): Promise<{ rank: number; best: RankingRow } | null> {
    const rows = this.inPeriod(period);
    const index = rows.findIndex((r) => r.playerId === playerId);
    return index >= 0 ? { rank: index + 1, best: toRow(rows[index], index) } : null;
  }

  private inPeriod(period: RankingPeriod): StoredRow[] {
    const from = periodStart(period, this.now());
    return this.read().filter((r) => r.createdAt >= from).sort(compareRows);
  }

  private read(): StoredRow[] {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (raw === null) return this.migrate();
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as StoredRow[]) : [];
    } catch {
      return [];
    }
  }

  /** v3가 아직 없으면 v2 기록을 옮겨 v3로 쓴다 (한 번) */
  private migrate(): StoredRow[] {
    try {
      const old = this.storage.getItem(V2_KEY);
      const parsed: unknown = old ? JSON.parse(old) : [];
      const rows = Array.isArray(parsed) ? (parsed as StoredRow[]).map(migrateRowV2).sort(compareRows).slice(0, MAX_ROWS) : [];
      this.write(rows);
      return rows;
    } catch {
      return [];
    }
  }

  private write(rows: StoredRow[]): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(rows));
    } catch {
      // 저장 공간이 막힌 브라우저(사생활 보호 모드 등)에서는 조용히 넘어간다
    }
  }
}

function toRow(r: StoredRow, i: number): RankingRow {
  return {
    rank: i + 1,
    nickname: r.nickname,
    score: r.score,
    survivedSec: r.survivedSec,
    characterId: r.characterId,
    outcome: r.outcome,
    continued: r.continued ?? false,
    createdAt: r.createdAt,
    nights: r.nights ?? 0,
    path: r.path ?? 'mixed',
  };
}

/** 이 기기의 게스트 id. M5에서 Firebase 익명 로그인으로 바뀔 수 있다 */
export function localPlayerId(storage: Pick<Storage, 'getItem' | 'setItem'>): string {
  try {
    const existing = storage.getItem(PLAYER_KEY);
    if (existing) return existing;
    const id = `guest-${crypto.randomUUID()}`;
    storage.setItem(PLAYER_KEY, id);
    return id;
  } catch {
    return 'guest-local';
  }
}
