// 자비 (순수 로직, 2026-11-12 라이언 확정: 어둠의 패시브 주민 대상 / 2026-11-13 컨셉 시연판).
// 루미가 패시브 주민 곁(radius 안)에 dwellSec 동안 머무는 동안 빛을 맞히지 않으면 자비 한 번(주민마다 한 번).
// 빛을 맞힌 주민(화남)은 자비를 줄 수 없다.
import type { Vec } from './fan';

export interface MercyCfg {
  radius: number;
  dwellSec: number;
}

export interface MercySubject extends Vec {
  uid: number;
  /** 빛에 맞아 화났는지 */
  upset: boolean;
}

export class MercyTracker {
  private readonly dwell = new Map<number, number>();
  private readonly done = new Set<number>();

  constructor(private readonly cfg: MercyCfg) {}

  /** @returns 이번에 자비를 준 주민 uid */
  update(dt: number, subjects: readonly MercySubject[], player: Vec | null): number[] {
    const out: number[] = [];
    if (!player) return out;
    for (const s of subjects) {
      if (s.upset || this.done.has(s.uid)) continue;
      if (Math.hypot(s.x - player.x, s.y - player.y) > this.cfg.radius) continue;
      const t = (this.dwell.get(s.uid) ?? 0) + dt;
      this.dwell.set(s.uid, t);
      if (t >= this.cfg.dwellSec) {
        this.done.add(s.uid);
        out.push(s.uid);
      }
    }
    return out;
  }

  granted(uid: number): boolean {
    return this.done.has(uid);
  }
}
