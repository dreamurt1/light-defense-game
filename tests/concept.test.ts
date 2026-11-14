import { describe, expect, it } from 'vitest';
import { MercyTracker } from '../src/systems/mercy';
import { Stealth } from '../src/systems/stealth';
import { Effects, Inventory } from '../src/systems/inventory';
import { TutorialScript } from '../src/systems/tutorial';
import { GameData, STAGE_ORDER, stageById } from '../src/data';

describe('자비 (패시브 주민)', () => {
  it('곁에 dwellSec 머물면 한 번만', () => {
    const m = new MercyTracker({ radius: 200, dwellSec: 1.5 });
    const s = [{ uid: 1, x: 100, y: 0, upset: false }];
    expect(m.update(1, s, { x: 0, y: 0 })).toEqual([]);
    expect(m.update(0.6, s, { x: 0, y: 0 })).toEqual([1]);
    expect(m.update(5, s, { x: 0, y: 0 })).toEqual([]);
  });
  it('곁을 벗어나면 머문 시간이 처음부터', () => {
    const m = new MercyTracker({ radius: 200, dwellSec: 1.5 });
    const near = [{ uid: 1, x: 100, y: 0, upset: false }];
    const far = [{ uid: 1, x: 900, y: 0, upset: false }];
    m.update(1, near, { x: 0, y: 0 });
    m.update(1, far, { x: 0, y: 0 });
    expect(m.update(1, near, { x: 0, y: 0 })).toEqual([]);
    expect(m.update(0.6, near, { x: 0, y: 0 })).toEqual([1]);
  });
  it('멀거나 화났으면 없음', () => {
    const m = new MercyTracker({ radius: 200, dwellSec: 1 });
    expect(m.update(3, [{ uid: 1, x: 500, y: 0, upset: false }], { x: 0, y: 0 })).toEqual([]);
    expect(m.update(3, [{ uid: 2, x: 10, y: 0, upset: true }], { x: 0, y: 0 })).toEqual([]);
  });
});

describe('풀숲 은신 시간', () => {
  it('오래 있으면 들키고, 나가면 초기화', () => {
    const s = new Stealth(4);
    expect(s.update(3, true)).toBe(false);
    expect(s.update(1.1, true)).toBe(true);
    expect(s.exposed).toBe(true);
    expect(s.update(1, true)).toBe(false);
    s.update(0.1, false);
    expect(s.exposed).toBe(false);
    expect(s.hiddenFor).toBe(0);
  });
});

describe('아이템 칸·효과', () => {
  it('두 칸, 다 차면 못 줍고, 쓰면 빈다', () => {
    const inv = new Inventory(2);
    expect(inv.add('a')).toBe(true);
    expect(inv.add('b')).toBe(true);
    expect(inv.add('c')).toBe(false);
    expect(inv.take(0)).toBe('a');
    expect(inv.take(0)).toBe(null);
    expect(inv.add('c')).toBe(true);
    expect(inv.slots).toEqual(['c', 'b']);
  });
  it('효과 시간', () => {
    const e = new Effects();
    e.start('moveSpeed', 2);
    expect(e.active('moveSpeed')).toBe(true);
    expect(e.update(2.1)).toEqual(['moveSpeed']);
    expect(e.active('moveSpeed')).toBe(false);
  });
});

describe('튜토리얼', () => {
  it('조건 신호로만 넘어가고 끝난다', () => {
    const t = new TutorialScript();
    expect(t.signal('retreated')).toBe(false);
    for (const s of ['walked', 'retreated', 'lit', 'rescued', 'upset', 'itemUsed'] as const) expect(t.signal(s)).toBe(true);
    expect(t.done).toBe(true);
  });
});

describe('스테이지 진행 (컨셉 시연판)', () => {
  it('등불 1 → 4, 1스테이지는 등불 1개', () => {
    expect(STAGE_ORDER.map((id) => stageById(id).stations)).toEqual([1, 2, 3, 4]);
  });
  it('스폰 표의 적은 모두 데이터에 있고 구현됨', () => {
    for (const s of GameData.stages) {
      const ids = [...Object.keys(s.spawn.normal.weights), ...Object.keys(s.spawn.climax.weights), ...Object.keys(s.passive?.weights ?? {})];
      for (const id of ids) expect(GameData.enemies.find((e) => e.id === id)?.implemented, `${s.id}:${id}`).toBe(true);
    }
  });
  it('패시브 주민은 피해가 없다', () => {
    for (const e of GameData.enemies.filter((d) => d.kind === 'passive')) expect(e.damage).toBe(0);
  });
});

describe('생명체 모습 방향 (2026-11-13)', () => {
  it('옆·앞·뒤를 고르고 경계에서는 지금 모습을 유지한다', async () => {
    const { critterView } = await import('../src/systems/critterView');
    expect(critterView({ x: 1, y: 0.1 }, 'side')).toBe('side');
    expect(critterView({ x: 0.2, y: 1 }, 'side')).toBe('front');
    expect(critterView({ x: 0.2, y: -1 }, 'side')).toBe('back');
    // 대각선 근처: 옆이던 것은 옆으로, 앞이던 것은 앞으로
    expect(critterView({ x: 0.7, y: 0.75 }, 'side')).toBe('side');
    expect(critterView({ x: 0.7, y: 0.75 }, 'front')).toBe('front');
    expect(critterView({ x: 0, y: 0 }, 'back')).toBe('back');
  });
});

describe('밸런스 안전장치 (2026-11-13 라이언: 첫 스테이지는 쉽게, 등불은 스테이지가 오를수록 많이)', () => {
  it('1스테이지 적의 초당 피해·동시 최대 상한', async () => {
    const { enemyById } = await import('../src/data');
    const s1 = stageById('stage-1');
    const ids = new Set([...Object.keys(s1.spawn.normal.weights), ...Object.keys(s1.spawn.climax.weights)]);
    for (const id of ids) {
      const e = enemyById(id as Parameters<typeof enemyById>[0]);
      expect(e.damage / e.damageTickSec, id).toBeLessThanOrEqual(4);
    }
    expect(s1.spawn.normal.maxAlive).toBeLessThanOrEqual(3);
  });
  it('1스테이지: 평소 동시 최대의 적이 모두 중앙 광원을 쳐도 20초 넘게 버틴다 (2026-11-14 광원 피해 상향의 상한, 제안)', async () => {
    const { enemyById } = await import('../src/data');
    const s1 = stageById('stage-1');
    const ids = Object.keys(s1.spawn.normal.weights) as Parameters<typeof enemyById>[0][];
    const worstPerSec = Math.max(...ids.map((id) => enemyById(id).sourceDamage / enemyById(id).damageTickSec));
    expect(worstPerSec * s1.spawn.normal.maxAlive * 20).toBeLessThan(GameData.game.central.maxHp);
  });
  it('1~3스테이지는 오를수록 클라이맥스 동시 최대가 줄지 않는다 (4스테이지는 노월 소환이 따로 더해짐)', () => {
    const climax = STAGE_ORDER.map((id) => stageById(id).spawn.climax.maxAlive);
    for (let i = 1; i < climax.length - 1; i++) expect(climax[i]).toBeGreaterThanOrEqual(climax[i - 1]);
  });
});

describe('가리는 물체 반투명 (2026-11-13 라이언: 장애물 뒤쪽의 루미가 잘 보이게)', () => {
  it('뒤에서 겹치면 반투명, 앞에 서거나 벗어나면 다시 불투명', async () => {
    const { Occluders } = await import('../src/entities/Occluders');
    const obj = { alpha: 1, setAlpha(v: number) { this.alpha = v; } };
    const occ = new Occluders();
    // 집: 마을 좌표 (100,0)~(260,200), 밑변 y 200
    occ.add([obj], 200, { x: 100, y: 0, w: 160, h: 200 });
    for (let i = 0; i < 30; i++) occ.update(1 / 30, { x: 180, y: 150 }); // 집 뒤(밑변보다 위)
    expect(obj.alpha).toBeLessThan(0.6);
    for (let i = 0; i < 30; i++) occ.update(1 / 30, { x: 180, y: 260 }); // 집 앞
    expect(obj.alpha).toBeGreaterThan(0.95);
    for (let i = 0; i < 30; i++) occ.update(1 / 30, { x: 600, y: 150 }); // 멀리
    expect(obj.alpha).toBeGreaterThan(0.95);
  });
});

describe('테스트 판 (2026-11-14 라이언: 홈 테스트 → 모든 스테이지 중 골라 바로)', () => {
  it('끝없는 판은 트라이얼뿐 — 각 스테이지 체험판은 모두 끝이 있다', () => {
    expect(GameData.stages.filter((s) => s.endless).map((s) => s.id)).toEqual(['trial']);
    const trial = stageById('trial');
    expect(trial.spawn.normal.maxAlive).toBe(0);
    expect(trial.spawn.climax.maxAlive).toBe(0);
    expect(trial.passive).toBeUndefined();
    expect(trial.boss).toBeUndefined();
  });

  it('트라이얼: 연습장답게 시작 자리 가까이 모아 둔다 — 네 모서리 표적·작은 무리, 장애물·고정된 등불과 떨어짐 (2026-11-14 라이언, 브롤스타즈 훈련 동굴 참고)', () => {
    const G = GameData.game;
    const start = { x: G.central.x, y: G.central.y + G.keeper.startOffsetY };
    const trial = stageById('trial');
    const list = trial.dummies?.list ?? [];
    const dist = list.map((d) => Math.hypot(d.x - start.x, d.y - start.y));
    expect(Math.max(...dist)).toBeLessThan(450); // 너무 멀리 흩지 않는다
    // 시작 자리 네 모서리 (약 200)
    const corners = list.filter((d) => Math.hypot(d.x - start.x, d.y - start.y) < 250);
    expect(new Set(corners.map((d) => Math.sign(d.x - start.x) + ',' + Math.sign(d.y - start.y))).size).toBe(4);
    // 작은 무리: 같은 종 넷 이상이 한 줄로 가까이
    const bats = list.filter((d) => d.enemyId === 'bat');
    const row = bats.filter((d) => bats.filter((o) => o !== d && Math.hypot(o.x - d.x, o.y - d.y) < 80).length > 0);
    expect(row.length).toBeGreaterThanOrEqual(4);
    // 공격하는 적과 패시브(자비 연습)가 모두 있다
    expect(list.some((d) => GameData.enemies.find((e) => e.id === d.enemyId)?.kind === 'passive')).toBe(true);
    const lamp = GameData.map.stations[trial.stationSpots?.[0] ?? -1];
    expect(lamp).toBeDefined();
    const rects = [...GameData.map.obstacles, ...GameData.map.bushes];
    for (const d of list) {
      expect(Math.hypot(d.x - lamp.x, d.y - lamp.y), d.enemyId).toBeGreaterThan(G.station.ward.maxRadius + 60);
      expect(Math.hypot(d.x - G.central.x, d.y - G.central.y), d.enemyId).toBeGreaterThan(150);
      for (const r of rects) {
        const gap = Math.hypot(Math.max(r.x - d.x, 0, d.x - (r.x + r.w)), Math.max(r.y - d.y, 0, d.y - (r.y + r.h)));
        expect(gap, d.enemyId).toBeGreaterThan(40);
      }
    }
  });

  it('테스트 판의 깬 스테이지·구출한 친구는 진행에 남지 않고, 정식 판은 남는다', async () => {
    const { Progress, watchProgress } = await import('../src/core/Progress');
    const { RunState } = await import('../src/core/RunState');
    const { bus } = await import('../src/core/events');
    type Clear = Parameters<typeof bus.emit<'game:clear'>>[1];
    const clear = (stageId: string) => ({ result: { stageId, reason: 'time', outcome: 'victory' } }) as unknown as Clear;
    Progress.reset();
    watchProgress();
    RunState.test = true;
    bus.emit('game:clear', clear('stage-2'));
    bus.emit('friend:rescued', { characterId: 'tori' });
    expect(Progress.data.cleared).toEqual([]);
    expect(Progress.data.friends).toEqual([]);
    RunState.test = false;
    bus.emit('game:clear', clear('stage-2'));
    expect(Progress.data.cleared).toContain('stage-2');
    Progress.reset();
  });
});
