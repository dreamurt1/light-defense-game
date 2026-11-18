// 적의 필살기 (2026-11-18, 기획서 7절·XMind: 속도 스턴 · 체력 밀어냄 · 광도 · 방어) — 순수 로직
// 몸박치기가 맞는 순간 종마다 한 가지 효과를 더한다(수치는 enemies.json behaviorParams, 제안).
//  - slow  (박쥐):     맞은 등불지기가 잠깐 느려짐 — slowMultiplier배, slowSec초
//  - push  (웨어울프): 크게 밀어냄 — pushPx (보통 피격 밀림 대신)
//  - drain (뱀파이어): 빛을 빼앗음 — 등불지기 LP −drainLp, 등불·광원 피해 × drainSourceMultiplier
//  - guard (고슴도치): 몸을 말아 방어 — 빛 위력 guardMultiplier배, guardCooldownSec마다 (Creature가 처리)
// 종류별 빛 반응 lightReaction 'coverEyes'(웨어울프·뱀파이어): 빛에 맞으면 눈을 가려 스턴 coverEyesStun배 (Creature가 처리)
export interface SpecialEffect {
  slow?: { multiplier: number; sec: number };
  push?: number;
  drainLp?: number;
  sourceMultiplier: number;
}

type Params = Record<string, number | boolean | string> | undefined;

const num = (p: Params, key: string, fallback: number): number => {
  const v = p?.[key];
  return typeof v === 'number' ? v : fallback;
};

/** 그 적의 몸박치기가 맞을 때 더하는 효과 */
export function specialOf(p: Params): SpecialEffect {
  switch (p?.special) {
    case 'slow':
      return { slow: { multiplier: num(p, 'slowMultiplier', 0.75), sec: num(p, 'slowSec', 1) }, sourceMultiplier: 1 };
    case 'push':
      return { push: num(p, 'pushPx', 70), sourceMultiplier: 1 };
    case 'drain':
      return { drainLp: num(p, 'drainLp', 10), sourceMultiplier: num(p, 'drainSourceMultiplier', 1.5) };
    default:
      return { sourceMultiplier: 1 };
  }
}

/** 등불지기의 '속도 스턴': 더 센(느린) 쪽이 남고, 시간은 새로 맞은 만큼 */
export class KeeperSlow {
  private left = 0;
  private mult = 1;

  apply(multiplier: number, sec: number): void {
    this.mult = this.left > 0 ? Math.min(this.mult, multiplier) : multiplier;
    this.left = Math.max(this.left, sec);
  }

  update(dt: number): void {
    this.left = Math.max(0, this.left - dt);
    if (this.left === 0) this.mult = 1;
  }

  get multiplier(): number {
    return this.left > 0 ? this.mult : 1;
  }

  reset(): void {
    this.left = 0;
    this.mult = 1;
  }
}
