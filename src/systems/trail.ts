// 걸음 빛 (2026-11-24 상점 꾸미기, 라이언 확정) — 순수 로직: 걷는 동안 everyMs마다 발끝 아래 점 하나,
// lifeMs 동안 rise만큼 떠오르며 사라지고, 동시에 max개(넘으면 가장 오래된 것부터). 제자리·은신·쓰러짐·무적이면 남기지 않는다(있던 점도 지움).
// 그림은 scenes/play/Trail.ts가 이 점들을 같은 수의 그림으로 돌려쓴다. 겉모습만 — 적이 알아채는 것과 무관.

export interface TrailCfg {
  everyMs: number;
  /** 점 지름(px) — 점마다 size ~ size+1 */
  size: number;
  lifeMs: number;
  max: number;
  /** 사는 동안 떠오르는 높이(px) */
  rise: number;
  /** 좌우 흩어짐(±px) */
  spread: number;
}

export interface TrailDot {
  x: number;
  y: number;
  age: number;
  size: number;
}

export class TrailState {
  readonly dots: TrailDot[] = [];
  private acc = 0;

  constructor(
    private readonly cfg: TrailCfg,
    /** 0~1 난수 (흩어짐·크기) */
    private readonly rand: () => number,
  ) {}

  /** dtMs 진행. feet = 걷는 중이면 발끝 자리, 제자리면 null. off = 은신·쓰러짐·무적 */
  step(dtMs: number, feet: { x: number; y: number } | null, off: boolean): void {
    if (off) {
      this.dots.length = 0;
      this.acc = 0;
      return;
    }
    for (const d of this.dots) d.age += dtMs;
    while (this.dots.length > 0 && this.dots[0].age >= this.cfg.lifeMs) this.dots.shift();
    if (!feet) {
      this.acc = 0;
      return;
    }
    this.acc += dtMs;
    while (this.acc >= this.cfg.everyMs) {
      this.acc -= this.cfg.everyMs;
      this.dots.push({ x: feet.x + (this.rand() * 2 - 1) * this.cfg.spread, y: feet.y, age: 0, size: this.cfg.size + this.rand() });
      if (this.dots.length > this.cfg.max) this.dots.shift();
    }
  }

  /** 점의 지금 높이 오프셋(위로 −)과 불투명도 */
  look(d: TrailDot): { dy: number; alpha: number } {
    const t = Math.min(1, d.age / this.cfg.lifeMs);
    return { dy: -this.cfg.rise * t, alpha: 1 - t };
  }
}
