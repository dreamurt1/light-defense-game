// 진동 (2026-11-13 컨셉 시연판): navigator.vibrate가 있는 기기에서만(iOS 사파리는 없어 건너뜀).
// 설정의 '진동'을 따른다. 너무 잦지 않게 최소 간격을 둔다.
import { bus } from '../core/events';

const MIN_GAP_MS = 90;

export class Haptics {
  private enabled = true;
  private last = 0;
  private readonly supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  constructor() {
    if (!this.supported) return;
    bus.on('player:hurt', () => this.buzz(35));
    bus.on('station:lit', (e) => this.buzz(e.allLit ? [30, 60, 30, 60, 50] : [25, 50, 35]));
    bus.on('combo:change', (e) => {
      if (e.reason === 'gain' && e.combo > 0 && e.combo % 5 === 0) this.buzz(18);
    });
    bus.on('friend:rescued', () => this.buzz([30, 50, 30, 50, 60]));
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  private buzz(pattern: number | number[]): void {
    if (!this.enabled || !this.supported) return;
    const now = performance.now();
    if (now - this.last < MIN_GAP_MS) return;
    this.last = now;
    try {
      navigator.vibrate(pattern);
    } catch {
      // 사용자 입력 전 등 브라우저가 막으면 조용히 넘어간다
    }
  }
}
