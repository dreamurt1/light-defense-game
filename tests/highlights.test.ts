import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';
import { BannerQueue, cutApplies, fillText, lineDuration, markup, pickCut, plain, type CutMorning } from '../src/systems/highlights';

// 2026-11-27 하이라이트 컷 (docs/plan/order-highlight-cuts-26-1127.md)
const C = GameData.cuts;
const morning = (over: Partial<CutMorning> = {}): CutMorning => ({ outcome: 'victory', bossCalmed: false, rescuedNow: [], party: ['lumi'], ...over });

describe('그림 컷 — 조건·우선순위·처음 한 번만', () => {
  it('컷 4개: 토리 구출 · 셋이 모임 · 노월 진정 · 첫 완전 승리', () => {
    expect(cutApplies('cut-tori', morning({ rescuedNow: ['tori'], party: ['lumi', 'tori'] }))).toBe(true);
    expect(cutApplies('cut-three', morning({ rescuedNow: ['doto'], party: ['lumi', 'tori', 'doto'] }))).toBe(true);
    // 토리로 나서서 도토만 되찾음 — 루미가 없으니 '셋'이 아님
    expect(cutApplies('cut-three', morning({ rescuedNow: ['doto'], party: ['tori', 'doto'] }))).toBe(false);
    // 이미 셋이어도 이번 밤에 되찾은 게 없으면 아님
    expect(cutApplies('cut-three', morning({ party: ['lumi', 'tori', 'doto'] }))).toBe(false);
    expect(cutApplies('cut-nowol', morning({ bossCalmed: true }))).toBe(true);
    expect(cutApplies('cut-bright', morning({ outcome: 'complete' }))).toBe(true);
    expect(cutApplies('cut-bright', morning())).toBe(false);
  });

  it('한 아침에 하나 — 노월 → 셋 → 토리 → 환해짐, 본 것은 건너뜀', () => {
    const all = morning({ outcome: 'complete', bossCalmed: true, rescuedNow: ['tori'], party: ['lumi', 'tori'] });
    expect(pickCut(all, [], C.cutOrder)).toBe('cut-nowol');
    expect(pickCut(all, ['cut-nowol'], C.cutOrder)).toBe('cut-tori');
    expect(pickCut(all, ['cut-nowol', 'cut-tori'], C.cutOrder)).toBe('cut-bright');
    expect(pickCut(all, ['cut-nowol', 'cut-tori', 'cut-bright'], C.cutOrder)).toBeNull();
    expect(pickCut(morning(), [], C.cutOrder)).toBeNull();
  });

  it('Progress.seenCuts: 처음이면 true, 두 번째는 false — 테스트 판은 run:morning이 오지 않음(런 흐름 밖)', async () => {
    const { Progress } = await import('../src/core/Progress');
    Progress.reset();
    expect(Progress.data.seenCuts).toEqual([]);
    expect(Progress.markSeen('cut-tori')).toBe(true);
    expect(Progress.markSeen('cut-tori')).toBe(false);
    expect(Progress.hasSeen('cut-tori')).toBe(true);
    Progress.reset();
    expect(Progress.hasSeen('cut-tori')).toBe(false);
  });

  it('문장표 그대로 — 제목·대사·노월 대사는 game.json calmLine에서', () => {
    expect(Object.fromEntries(Object.entries(C.cuts).map(([id, c]) => [id, c.title]))).toEqual({
      'cut-tori': '토리와 다시',
      'cut-three': '셋이 다시 모였어요',
      'cut-nowol': '노월이 마음을 열었어요',
      'cut-bright': '마을이 환해졌어요',
    });
    expect(plain(fillText(C.cuts['cut-tori'].lines[0].text, { keeper: '루미' }))).toBe('루미..! 빛이 따뜻해');
    expect(fillText(C.cuts['cut-nowol'].lines[0].text, { calmLine: GameData.game.boss.calm.calmLine })).toBe('…조금은 믿어 볼게');
    expect(fillText(C.cuts['cut-nowol'].lines[0].text, { calmLine: GameData.game.boss.angry.calmLine })).toBe('…이 빛, 생각보다 따뜻하네');
    // cut-bright는 그림 없음
    expect(C.cuts['cut-bright'].art).toBeNull();
  });

  it('금지어 없음 · 대사는 1~2줄', () => {
    const texts = [...Object.values(C.cuts).flatMap((c) => [c.title, ...c.lines.map((l) => l.text)]), ...Object.values(C.lines).flatMap((l) => [l.text, l.sub ?? ''])];
    for (const t of texts) expect(t).not.toMatch(/죽|처치|킬|실패|zzz/i);
    for (const c of Object.values(C.cuts)) expect(c.lines.length).toBeGreaterThanOrEqual(1), expect(c.lines.length).toBeLessThanOrEqual(2);
  });
});

describe('글 — 강조·채우기', () => {
  it('*낱말* = 강조 조각, 나머지는 그대로', () => {
    expect(markup('이제 *셋*이야')).toEqual([
      { text: '이제 ', em: false },
      { text: '셋', em: true },
      { text: '이야', em: false },
    ]);
    expect(markup('그냥 글')).toEqual([{ text: '그냥 글', em: false }]);
    expect(plain('등불이 *모두* 켜졌어요')).toBe('등불이 모두 켜졌어요');
  });
  it('{이름} 채우기, 없는 이름은 비움', () => {
    expect(fillText('{keeper}..!', { keeper: '도토' })).toBe('도토..!');
    expect(fillText('{x}가', {})).toBe('가');
  });
});

describe('초상 배너 — 시간·줄 세우기·트리거 5개', () => {
  it('2.5초, 둘째 줄이 있으면 3.5초', () => {
    expect(lineDuration(false, C)).toBe(2500);
    expect(lineDuration(true, C)).toBe(3500);
  });

  it('겹치면 줄 세워 하나씩, 너무 많으면 오래된 것부터 버림', () => {
    const q = new BannerQueue<string>(2);
    expect(q.push('a')).toBe('a');
    expect(q.push('b')).toBeNull();
    expect(q.push('c')).toBeNull();
    expect(q.push('d')).toBeNull();
    expect(q.pending).toBe(2);
    expect(q.done()).toBe('c');
    expect(q.done()).toBe('d');
    expect(q.done()).toBeNull();
    expect(q.showing).toBeNull();
    expect(q.push('e')).toBe('e');
    q.clear();
    expect(q.showing).toBeNull();
  });

  it('배너 5개 = 첫 행렬(처음 한 번) · 토리 · 도토 · 노월 · 작은 화해, 초상은 모두 있는 시트 얼굴 칸', () => {
    expect(Object.keys(C.lines).sort()).toEqual(['line-doto', 'line-gift', 'line-parade-first', 'line-tori', 'line-witch']);
    expect(C.lines['line-parade-first']).toMatchObject({ portrait: 'owl', text: '우린 지나가는 거야..', sub: '비켜 주면 지키는 길, 돌려보내면 넓히는 길', once: true });
    expect(C.lines['line-gift'].text).toBe('…고마워');
    for (const l of Object.values(C.lines)) expect(C.portraits[l.portrait]).toBeDefined();
    for (const k of ['witch', 'witch-angry', 'moth', 'firefly']) expect(C.portraits[k]).toBeDefined();
    for (const p of Object.values(C.portraits)) {
      const [x, y, n] = p.crop;
      expect(x + n).toBeLessThanOrEqual(p.frame);
      expect(y + n).toBeLessThanOrEqual(p.frame);
    }
  });

  it('배너 신호가 판에서 온다 — 행렬 묶음의 첫 주민(parade:enter)', () => {
    const src = import.meta.glob(['../src/scenes/play/Parade.ts', '../src/ui/PortraitLine.ts'], { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
    const parade = src['../src/scenes/play/Parade.ts'];
    expect(parade).toMatch(/g\.spawned === 1\) bus\.emit\('parade:enter'/);
    const line = src['../src/ui/PortraitLine.ts'];
    for (const ev of ['parade:enter', 'friend:rescued', 'witch:spawn', 'run:event']) expect(line).toContain(`bus.on('${ev}'`);
  });
});
