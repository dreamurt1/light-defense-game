// 초당 60번 제한 바로잡기 (2026-11-20 라이언: 휴대폰 가로에서 프레임이 고르지 않음).
// Phaser 3.90 TimeStep.stepLimitFPS는 쌓인 시간이 1000/limit(16.667ms) '이상'일 때만 한 번 돌리고 0으로 되돌린다.
// 120Hz 화면의 두 번(8.33 + 8.33 = 16.66ms)은 그보다 아주 조금 짧아 늘 세 번(25ms)을 기다린다 → 실제 초당 40번, 간격도 들쭉날쭉.
// 문턱을 화면 주기의 배수 사이(제한 간격 × 0.6 ≈ 10ms)로 내린다: 60Hz → 매번, 90Hz → 매번(90), 120Hz → 두 번마다(60), 144Hz → 두 번마다(72).
// 뜻은 그대로(빠른 화면에서 초당 약 60번만 그려 발열·부담을 줄임), 세 번을 기다리는 일만 없앤다.
import type Phaser from 'phaser';

/** 제한 간격에 대한 문턱 비율 */
export const LIMIT_SLACK = 0.6;

/** 쌓인 시간(ms)이 이만큼이면 이번 화면에서 한 번 돌린다 */
export function limitReached(accMs: number, limitRateMs: number): boolean {
  return accMs >= limitRateMs * LIMIT_SLACK;
}

interface LimitStep {
  now: number;
  lastTime: number;
  rawDelta: number;
  time: number;
  delta: number;
  smoothStep: boolean;
  nextFpsUpdate: number;
  framesThisSecond: number;
  frame: number;
  _limitRate: number;
  smoothDelta(d: number): number;
  updateFPS(t: number): void;
  callback(time: number, delta: number): void;
}

/** 게임을 만들기 전에 한 번 (TimeStep.start가 이 함수를 묶어 두므로 그 전에) */
export function patchFrameLimit(TimeStep: typeof Phaser.Core.TimeStep): void {
  const proto = TimeStep.prototype as unknown as { stepLimitFPS(this: LimitStep, time: number): void };
  // Phaser 원본과 같고, 돌릴지 정하는 줄만 limitReached로
  proto.stepLimitFPS = function (this: LimitStep, time: number): void {
    this.now = time;
    let delta = Math.max(0, time - this.lastTime);
    this.rawDelta = delta;
    this.time += this.rawDelta;
    if (this.smoothStep) delta = this.smoothDelta(delta);
    this.delta += delta;
    if (time >= this.nextFpsUpdate) this.updateFPS(time);
    this.framesThisSecond++;
    if (limitReached(this.delta, this._limitRate)) {
      this.callback(time, this.delta);
      this.delta = 0;
    }
    this.lastTime = time;
    this.frame++;
  };
}
