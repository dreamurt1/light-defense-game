// 진행 저장 — localStorage. 2026-11-23 밤 나들이 v3로 v2: 깬 스테이지 대신 최고 기록(아침을 맞은 밤 수·점수)·별가루·발견한 지역·가진 빛 색.
//  - 처음 하는 유저는 튜토리얼을 꼭 거친다(라이언 2026-11-13)
//  - 친구(토리·도토)는 런에서 되찾으면 열린다(영구 해금, 그대로)
//  - 챙겨 갈 아이템은 최고 밤 수로 열린다(items.json carryUnlock 'night-n', systems/unlocks.ts)
//  - 빛 색은 별가루로 산다(cosmetics.json price). 별가루는 런이 끝나도 남는다
//  - v1(깬 스테이지)에서 옮길 때 이미 열려 있던 준비물·빛 색은 잃지 않게: stage-1·2·3·4 → 최고 밤 2·4·6·6, 열린 빛 색 → 가진 색
//  - 시연용 '모두 열기'는 튜토리얼·친구·준비물·빛 색을 모두 연다
import { bus } from './events';
import { RunState } from './RunState';
import type { CharacterId } from '../data';

const KEY = 'ld.progress.v2';
const OLD_KEY = 'ld.progress.v1';

export interface ProgressData {
  tutorialDone: boolean;
  friends: CharacterId[];
  demo: boolean;
  /** 런에서 아침을 맞은 최고 밤 수 */
  bestNight: number;
  bestScore: number;
  /** 별가루 잔액 */
  dust: number;
  /** 발견한 격자 맵 id (Phase 10) */
  discovered: string[];
  /** 가진 빛 색 id (호박빛은 늘 가짐) */
  cosmetics: string[];
  /** 이미 본 하이라이트 컷·처음 한 번 배너 id (2026-11-27 — 런이 끝나도 남음, 테스트 판·튜토리얼은 남기지 않음) */
  seenCuts: string[];
}

export const EMPTY_PROGRESS: ProgressData = { tutorialDone: false, friends: [], demo: false, bestNight: 0, bestScore: 0, dust: 0, discovered: [], cosmetics: [], seenCuts: [] };

/** v1 → v2 (순수, 테스트용으로 내보냄) */
export function migrateProgressV1(old: { tutorialDone?: boolean; cleared?: string[]; friends?: CharacterId[]; demo?: boolean }): ProgressData {
  const cleared = old.cleared ?? [];
  const NIGHT_OF: Record<string, number> = { 'stage-1': 2, 'stage-2': 4, 'stage-3': 6, 'stage-4': 6 };
  const COLOR_OF: Record<string, string> = { 'stage-1': 'dawn', 'stage-2': 'mint', 'stage-3': 'moon', 'stage-4': 'star' };
  return {
    ...EMPTY_PROGRESS,
    tutorialDone: !!old.tutorialDone,
    friends: [...(old.friends ?? [])],
    demo: !!old.demo,
    bestNight: cleared.reduce((m, id) => Math.max(m, NIGHT_OF[id] ?? 0), 0),
    cosmetics: cleared.map((id) => COLOR_OF[id]).filter((c): c is string => !!c),
  };
}

function load(): ProgressData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...EMPTY_PROGRESS, ...(JSON.parse(raw) as Partial<ProgressData>) };
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      const migrated = migrateProgressV1(JSON.parse(old) as Parameters<typeof migrateProgressV1>[0]);
      localStorage.setItem(KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    // 깨진 저장·막힌 저장소: 처음부터
  }
  return { ...EMPTY_PROGRESS };
}

let data = load();

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // 저장이 막힌 브라우저: 이번 방문 동안만
  }
  bus.emit('progress:change');
}

export const Progress = {
  get data(): Readonly<ProgressData> {
    return data;
  },
  get tutorialDone(): boolean {
    return data.tutorialDone || data.demo;
  },
  /** 준비물 잠금 판정에 쓰는 최고 밤 수 (시연이면 모두) */
  get unlockNight(): number {
    return data.demo ? Number.MAX_SAFE_INTEGER : data.bestNight;
  },
  markTutorial(): void {
    if (data.tutorialDone) return;
    data = { ...data, tutorialDone: true };
    save();
  },
  rescue(id: CharacterId): void {
    if (data.friends.includes(id)) return;
    data = { ...data, friends: [...data.friends, id] };
    save();
  },
  /** 런의 끝: 최고 기록을 고친다. 갱신했으면 true */
  recordRun(nights: number, score: number): boolean {
    const better = nights > data.bestNight || score > data.bestScore;
    if (!better) return false;
    data = { ...data, bestNight: Math.max(data.bestNight, nights), bestScore: Math.max(data.bestScore, score) };
    save();
    return true;
  },
  addDust(n: number): void {
    if (n <= 0) return;
    data = { ...data, dust: data.dust + Math.round(n) };
    save();
  },
  /** 별가루를 쓴다. 모자라면 false */
  spendDust(n: number): boolean {
    if (n < 0 || data.dust < n) return false;
    data = { ...data, dust: data.dust - n };
    save();
    return true;
  },
  /** 처음 발견한 맵만 더하고 그 id들을 돌려준다 */
  discover(mapIds: readonly string[]): string[] {
    const fresh = mapIds.filter((id) => !data.discovered.includes(id));
    if (fresh.length) {
      data = { ...data, discovered: [...data.discovered, ...fresh] };
      save();
    }
    return fresh;
  },
  /** 빛 색을 가졌는가 (값 0 = 처음부터) */
  owns(colorId: string, price = 1): boolean {
    return price <= 0 || data.demo || data.cosmetics.includes(colorId);
  },
  /** 빛 색 사기: 별가루가 모자라면 false */
  /** 꾸미기 사기 (2026-11-24): 빛 색과 같은 목록에 종류를 붙인 id(systems/cosmetics.ts ownedId)로 */
  buyCosmetic(id: string, price: number): boolean {
    return this.buyColor(id, price);
  },

  buyColor(colorId: string, price: number): boolean {
    if (this.owns(colorId, price)) return true;
    if (data.dust < price) return false;
    data = { ...data, dust: data.dust - price, cosmetics: [...data.cosmetics, colorId] };
    save();
    return true;
  },
  /** 시연용: 모두 열기 */
  unlockAll(): void {
    data = { ...data, demo: true, tutorialDone: true };
    save();
  },
  /** 처음부터 (확인용) */
  reset(): void {
    data = { ...EMPTY_PROGRESS };
    save();
  },
  /** 하이라이트 컷을 이미 봤는가 (2026-11-27) */
  hasSeen(id: string): boolean {
    return data.seenCuts.includes(id);
  },
  /** 하이라이트 컷을 본 것으로 (처음이면 true) */
  markSeen(id: string): boolean {
    if (data.seenCuts.includes(id)) return false;
    data = { ...data, seenCuts: [...data.seenCuts, id] };
    save();
    return true;
  },
  isFriendOpen(id: CharacterId): boolean {
    return id === 'lumi' || data.demo || data.friends.includes(id);
  },
};

/** 판 결과를 진행에 남긴다 (main.ts에서 한 번). 테스트 판은 남기지 않는다. 런의 기록·별가루는 core/runFlow.ts */
export function watchProgress(): void {
  bus.on('game:clear', (e) => {
    if (!RunState.test && e.result.reason === 'tutorial') Progress.markTutorial();
  });
  bus.on('friend:rescued', (e) => {
    if (!RunState.test) Progress.rescue(e.characterId);
  });
}
