// 빛 반자동 (2026-11-18 라이언: "적이 근처에 있을 때 우측 스틱을 누르면 자동으로 그 적에게 공격") — 순수 로직
//  - 빛 스틱을 누른 채 끌지 않고 있으면(데드존 안) holdDelaySec 뒤부터, 빛이 준비될 때마다 한 발씩 쏘라고 알린다.
//    대상(사거리 안 가장 가까운 적, 없으면 쏘지 않음)은 PlayScene이 고른다.
//    바로 쏘지 않는 짧은 틈은 끌어서 겨누려던 손가락이 누르자마자 한 발을 먼저 쏘지 않게 하려는 것(제안 0.12초).
//  - 끌기 시작하면(겨눔) stop() → 반자동은 멈추고, 예전처럼 놓을 때 그 방향으로 쏜다.
//  - 누르는 동안 한 발이라도 쐈으면, 놓을 때의 '짧은 탭 = 자동 조준'은 쏘지 않는다(한 번 누름에 두 발 방지).
//  - PC: 스페이스를 누르고 있으면(key) 기다림 없이 같은 반자동.
export class AutoFire {
  private held = false;
  private heldSec = 0;
  private shots = 0;

  constructor(private readonly holdDelaySec: number) {}

  /** 빛 스틱을 누름 */
  press(): void {
    this.held = true;
    this.heldSec = 0;
    this.shots = 0;
  }

  /** 끌기 시작(겨눔) 또는 손가락을 뗌 */
  stop(): void {
    this.held = false;
  }

  /** 반자동으로 겨누는 중인가 (조준선 표시용) */
  holding(key = false): boolean {
    return key || (this.held && this.heldSec >= this.holdDelaySec);
  }

  /** 매 프레임: 이번에 반자동 한 발을 시도할지 (ready = 빛 대기가 끝났고 쓰러져 있지 않음) */
  update(dt: number, ready: boolean, key = false): boolean {
    if (this.held) this.heldSec += dt;
    return ready && this.holding(key);
  }

  /** 반자동 한 발이 실제로 나감 */
  fired(): void {
    this.shots++;
  }

  /** 놓을 때 짧은 탭 자동 조준을 해도 되나 (이번 누름에서 아직 안 쐈으면) */
  get tapAllowed(): boolean {
    return this.shots === 0;
  }
}
