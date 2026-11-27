// 하이라이트 컷 (2026-11-27 13:00 기획 세션·라이언 확정, docs/plan/order-highlight-cuts-26-1127.md) — 순수 규칙.
//  - 그림 컷: 아침 화면 직전, 조건에 맞는 컷 중 아직 안 본 것 하나(우선순위 cuts.json cutOrder: 노월 → 셋 → 토리 → 환해짐)
//  - 초상 배너: 밤 중 한 줄, 겹치면 줄 세워 하나씩(판을 멈추지 않음)
//  - 글: *낱말* = 호박빛 강조, {이름} = 채울 값
import type { CharacterId } from '../data';

export type CutId = 'cut-tori' | 'cut-three' | 'cut-nowol' | 'cut-bright';
export type LineId = 'line-parade-first' | 'line-tori' | 'line-doto' | 'line-witch' | 'line-gift';

export interface CutMorning {
  /** 이번 밤 결과 */
  outcome: 'victory' | 'complete' | 'over';
  bossCalmed: boolean;
  /** 이번 밤에 되찾은 친구 */
  rescuedNow: readonly CharacterId[];
  /** 아침 뒤 함께하는 등불지기(고른 주인공 + 되찾은 친구) */
  party: readonly CharacterId[];
}

const ALL_THREE: readonly CharacterId[] = ['lumi', 'tori', 'doto'];

/** 이 아침에 조건이 맞는가 */
export function cutApplies(id: CutId, m: CutMorning): boolean {
  if (id === 'cut-nowol') return m.bossCalmed;
  if (id === 'cut-three') return m.rescuedNow.length > 0 && ALL_THREE.every((c) => m.party.includes(c));
  if (id === 'cut-tori') return m.rescuedNow.includes('tori');
  return m.outcome === 'complete';
}

/** 이 아침에 띄울 컷 하나 (없으면 null) — 조건이 맞고 아직 안 본 것 중 우선순위가 가장 높은 것 */
export function pickCut(m: CutMorning, seen: readonly string[], order: readonly CutId[]): CutId | null {
  return order.find((id) => !seen.includes(id) && cutApplies(id, m)) ?? null;
}

/** {이름} 채우기 (없는 이름은 그대로 지움) */
export function fillText(text: string, vars: Readonly<Record<string, string>>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');
}

/** *낱말* → 강조 조각 */
export function markup(text: string): { text: string; em: boolean }[] {
  return text
    .split(/(\*[^*]+\*)/)
    .filter((s) => s.length > 0)
    .map((s) => (s.startsWith('*') && s.endsWith('*') && s.length > 2 ? { text: s.slice(1, -1), em: true } : { text: s, em: false }));
}

/** 강조 표시를 뺀 글 (읽기·비교용) */
export function plain(text: string): string {
  return markup(text)
    .map((p) => p.text)
    .join('');
}

/** 배너가 떠 있는 시간 */
export function lineDuration(hasSub: boolean, cfg: { lineMs: number; lineMsWithSub: number }): number {
  return hasSub ? cfg.lineMsWithSub : cfg.lineMs;
}

/** 배너 줄 세우기: 떠 있는 게 없으면 바로, 있으면 뒤에(가장 오래된 것부터 버려 max개까지) */
export class BannerQueue<T> {
  private readonly waiting: T[] = [];
  private current: T | null = null;

  constructor(private readonly max = 3) {}

  get showing(): T | null {
    return this.current;
  }

  get pending(): number {
    return this.waiting.length;
  }

  /** 새 배너 — 지금 띄울 것이면 돌려줌 */
  push(item: T): T | null {
    if (this.current === null) {
      this.current = item;
      return item;
    }
    this.waiting.push(item);
    while (this.waiting.length > this.max) this.waiting.shift();
    return null;
  }

  /** 지금 배너가 끝남 — 다음 것(있으면)을 돌려줌 */
  done(): T | null {
    this.current = this.waiting.shift() ?? null;
    return this.current;
  }

  clear(): void {
    this.waiting.length = 0;
    this.current = null;
  }
}
