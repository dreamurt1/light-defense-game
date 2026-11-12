// 게임의 모든 난수는 여기서만 뽑는다. 같은 seed면 같은 밤이 재현된다.

/** mulberry32: 32비트 seed 하나로 도는 작고 빠른 PRNG */
export class Rng {
  private state: number;

  constructor(readonly seed: number) {
    this.state = seed >>> 0;
  }

  /** [0, 1) */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** [min, max) 실수 */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** [min, max] 정수 */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('pick from empty list');
    return items[Math.floor(this.next() * items.length)];
  }

  /** 가중치 표에서 하나를 고른다. 가중치 합이 0이면 null */
  weighted<K extends string>(weights: Partial<Record<K, number>>): K | null {
    const entries = Object.entries(weights) as [K, number][];
    const total = entries.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
    if (total <= 0) return null;
    let roll = this.next() * total;
    for (const [key, w] of entries) {
      roll -= Math.max(0, w);
      if (roll < 0) return key;
    }
    return entries[entries.length - 1][0];
  }
}

/** 새 판의 seed. seed를 만드는 일만 플랫폼 난수를 쓴다 */
export function makeSeed(): number {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

/** 결과 화면 구석에 보여 줄 짧은 seed 표기 */
export function seedLabel(seed: number): string {
  return seed.toString(16).padStart(8, '0');
}
