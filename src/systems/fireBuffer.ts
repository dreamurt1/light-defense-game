// 빛 입력 예약 (2026-11-27 라이언: 노트북 터치패드로 톡톡 탭하면 공격이 잘 안 먹힘 — "터치했을 때도 바로바로").
// 원인: 빛 대기(0.4초) 중에 들어온 탭은 그냥 버려졌다(헤드리스 재현: 0.15초 간격 두 번 탭 → 한 번만 나감).
// → 대기 중 탭은 기억해 두었다가 대기가 끝나는 순간 쏜다. 마지막 한 번만 기억(밀린 빛이 줄줄이 나가지 않게), windowSec이 지나면 버림.
export class FireBuffer<T> {
  private pending: { req: T; left: number } | null = null;

  constructor(private readonly windowSec: number) {}

  get has(): boolean {
    return this.pending !== null;
  }

  /** 빛이 대기 중이라 못 쏜 요청: 남은 대기가 창 안이면 기억하고 true (새 요청이 앞 것을 덮음) */
  hold(req: T, cooldownLeft: number): boolean {
    if (cooldownLeft > this.windowSec) return false;
    this.pending = { req, left: this.windowSec };
    return true;
  }

  /** 매 프레임: 빛이 준비되면 기억한 요청을 돌려주고 비움, 창이 지나면 버림 */
  take(dt: number, ready: boolean): T | null {
    const p = this.pending;
    if (!p) return null;
    if (ready) {
      this.pending = null;
      return p.req;
    }
    p.left -= dt;
    if (p.left <= 0) this.pending = null;
    return null;
  }

  clear(): void {
    this.pending = null;
  }
}
