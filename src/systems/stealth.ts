// 풀숲 은신 시간 (순수 로직, 2026-11-13 라이언: 풀숲에 오래 있으면 적이 알고 공격한다).
// 풀숲 안에 maxSec 넘게 있으면 들킨다(exposed). 풀숲을 나가면 초기화되어 다시 들어가면 다시 숨는다.
export class Stealth {
  hiddenFor = 0;
  exposed = false;

  constructor(private readonly maxSec: number) {}

  /** @returns 이번 프레임에 들켰으면 true */
  update(dt: number, inBush: boolean): boolean {
    if (!inBush) {
      this.hiddenFor = 0;
      this.exposed = false;
      return false;
    }
    this.hiddenFor += dt;
    if (!this.exposed && this.hiddenFor >= this.maxSec) {
      this.exposed = true;
      return true;
    }
    return false;
  }

  /** 들키기까지 남은 비율 (1 = 막 숨음, 0 = 들킴) */
  get left(): number {
    return this.exposed ? 0 : Math.max(0, 1 - this.hiddenFor / this.maxSec);
  }
}
