// 아이템 칸과 효과 시간 (순수 로직, 2026-11-13 컨셉 시연판 — Phase 4).
// 칸은 slots개(제안 2). 주우면 빈 칸에, 다 차 있으면 못 줍는다. 쓰면 1회 소모.
// 시간이 있는 효과(이동 빠르게·적 느리게·친구 소환)는 효과별 남은 시간을 센다(같은 효과를 또 쓰면 다시 채움).
export class Inventory {
  readonly slots: (string | null)[];

  constructor(size: number) {
    this.slots = Array.from({ length: size }, () => null);
  }

  get full(): boolean {
    return this.slots.every((s) => s !== null);
  }

  add(id: string): boolean {
    const i = this.slots.indexOf(null);
    if (i < 0) return false;
    this.slots[i] = id;
    return true;
  }

  take(slot: number): string | null {
    const id = this.slots[slot] ?? null;
    if (id !== null) this.slots[slot] = null;
    return id;
  }
}

export class Effects {
  private readonly left = new Map<string, number>();

  start(effect: string, sec: number): void {
    this.left.set(effect, Math.max(this.left.get(effect) ?? 0, sec));
  }

  update(dt: number): string[] {
    const ended: string[] = [];
    for (const [k, v] of this.left) {
      const n = v - dt;
      if (n <= 0) {
        this.left.delete(k);
        ended.push(k);
      } else this.left.set(k, n);
    }
    return ended;
  }

  active(effect: string): boolean {
    return (this.left.get(effect) ?? 0) > 0;
  }
}
