import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';
import { albumCount, storySeen, unlocked, type AlbumProgress } from '../src/systems/album';

// 2026-11-27 16:33 밤의 기억 앨범 (docs/plan/order-memory-album-26-1127.md)
const E = GameData.album;
const P = (over: Partial<AlbumProgress> = {}): AlbumProgress => ({ bestNight: 0, seenCuts: [], ...over });
const byId = (id: string) => E.find((e) => e.id === id)!;

describe('밤의 기억 — 10칸·글', () => {
  it('이야기 카드 6(이야기 순서) + 하이라이트 컷 4, 제목·힌트는 지시서 그대로', () => {
    expect(E.map((e) => e.id)).toEqual(['story-01', 'story-04', 'story-02', 'story-03', 'story-05', 'story-06', 'cut-tori', 'cut-three', 'cut-nowol', 'cut-bright']);
    expect(E.map((e) => e.title)).toEqual(['마을', '두 목소리', '광원이 꺼진 밤', '친구를 잃음', '파편', '아침', '토리와 다시', '셋이 다시 모였어요', '노월이 마음을 열었어요', '마을이 환해졌어요']);
    expect(byId('cut-tori').hint).toBe('토리를 되찾으면 열려요');
    expect(byId('cut-three').hint).toBe('도토까지 되찾으면 열려요');
    expect(byId('cut-nowol').hint).toBe('노월을 진정시키면 열려요');
    expect(byId('cut-bright').hint).toBe('완전 승리를 하면 열려요');
    for (const e of E.slice(0, 6)) expect(e.hint).toBe('이야기를 보면 열려요');
    for (const e of E) expect(`${e.title}${e.hint}`).not.toMatch(/죽|처치|킬|실패/);
  });

  it('컷 id는 cuts.json에 있고, 이야기 종류는 이야기 카드 6장', () => {
    for (const e of E.filter((x) => x.cut)) expect(GameData.cuts.cuts[e.cut as keyof typeof GameData.cuts.cuts]).toBeDefined();
    expect(E.filter((x) => x.story).map((x) => x.story)).toEqual(['villages', 'voices', 'source', 'lost', 'shard', 'dawn']);
  });
});

describe('밤의 기억 — 열림 규칙', () => {
  it('이야기 카드: storySeen이면 열림, 없으면(옛 저장) 밤 1을 넘겼거나 튜토리얼을 마쳤으면', () => {
    expect(storySeen(P())).toBe(false);
    expect(storySeen(P({ storySeen: true }))).toBe(true);
    expect(storySeen(P({ bestNight: 1 }))).toBe(true);
    expect(storySeen(P({ tutorialDone: true }))).toBe(true);
    // 값이 있으면 그 값이 먼저
    expect(storySeen(P({ storySeen: false, bestNight: 3 }))).toBe(false);
    expect(unlocked(byId('story-03'), P({ storySeen: true }))).toBe(true);
  });

  it('컷: seenCuts에 그 id가 있을 때만 — 이야기를 봐도 컷은 안 열림', () => {
    for (const id of ['cut-tori', 'cut-three', 'cut-nowol', 'cut-bright']) {
      expect(unlocked(byId(id), P({ storySeen: true }))).toBe(false);
      expect(unlocked(byId(id), P({ seenCuts: [id] }))).toBe(true);
    }
  });

  it('세기: 처음 0/10 → 이야기 6/10 → 컷 셋 더 9/10', () => {
    expect(albumCount(E, P())).toEqual({ open: 0, total: 10 });
    expect(albumCount(E, P({ storySeen: true }))).toEqual({ open: 6, total: 10 });
    expect(albumCount(E, P({ storySeen: true, seenCuts: ['cut-tori', 'cut-three', 'cut-bright', 'line-parade-first'] }))).toEqual({ open: 9, total: 10 });
  });
});
