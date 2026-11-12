// 빛 스틱을 놓으면 = 등불에서 그 방향으로 퍼지는 부채꼴 빛 (순수 로직).
// 부채꼴은 expandSec 동안 반지름 0 → range로 퍼지고, 앞쪽 가장자리가 닿는 순간 악당을 한 번씩 맞춘다.
// 등불지기가 등불을 들고 움직여도 빛은 쏜 자리에서 퍼진다(cast마다 원점을 기억).
import type { GameBus } from '../core/events';
import type { GameConfig } from '../data';
import { inFan, type Vec } from './fan';

export interface LightTarget {
  uid: number;
  x: number;
  y: number;
  radius: number;
}

export interface LightCast {
  id: number;
  /** 쏜 순간의 등불 위치 */
  origin: Vec;
  angle: number;
  range: number;
  elapsed: number;
  hit: Set<number>;
}

export interface LightHit {
  castId: number;
  uid: number;
}

/** 퍼지는 동안의 반지름 비율 (ease-out) */
export function expandRatio(elapsed: number, expandSec: number): number {
  const p = Math.min(1, Math.max(0, elapsed / expandSec));
  return 1 - (1 - p) * (1 - p);
}

export class LightSystem {
  cooldownLeft = 0;
  readonly casts: LightCast[] = [];
  /** 안개 등으로 줄어드는 사거리 배율(M2) */
  rangeMultiplier = 1;
  private nextId = 1;

  constructor(
    private readonly cfg: GameConfig['light'],
    /** 등불의 현재 위치(움직이는 객체를 그대로 받아 쏠 때마다 읽는다) */
    private readonly origin: Vec,
    /** 캐릭터 사거리 */
    public baseRange: number,
    /** 캐릭터·장착물 배율이 반영된 대기 시간 */
    public cooldownSec: number,
    private readonly bus?: GameBus,
  ) {}

  get ready(): boolean {
    return this.cooldownLeft <= 0;
  }

  get range(): number {
    return this.baseRange * this.rangeMultiplier;
  }

  /** 대기 중이면 null. reach를 주면 그만큼만 뻗는다(PC 마우스 끌기, 사거리를 넘지 않음) */
  tryCast(angle: number, reach = Infinity): LightCast | null {
    if (!this.ready) return null;
    this.cooldownLeft = this.cooldownSec;
    const range = Math.min(this.range, reach);
    const cast: LightCast = { id: this.nextId++, origin: { x: this.origin.x, y: this.origin.y }, angle, range, elapsed: 0, hit: new Set() };
    this.casts.push(cast);
    return cast;
  }

  currentRadius(cast: LightCast): number {
    return cast.range * expandRatio(cast.elapsed, this.cfg.expandSec);
  }

  update(dt: number, targets: readonly LightTarget[]): LightHit[] {
    if (this.cooldownLeft > 0) {
      this.cooldownLeft -= dt;
      if (this.cooldownLeft <= 0) {
        this.cooldownLeft = 0;
        this.bus?.emit('light:ready');
      }
    }

    const hits: LightHit[] = [];
    for (const cast of this.casts) {
      cast.elapsed += dt;
      const radius = this.currentRadius(cast);
      for (const t of targets) {
        if (cast.hit.has(t.uid)) continue;
        if (inFan(cast.origin, cast.angle, this.cfg.fanDeg, radius, t, t.radius)) {
          cast.hit.add(t.uid);
          hits.push({ castId: cast.id, uid: t.uid });
        }
      }
    }
    for (let i = this.casts.length - 1; i >= 0; i--) {
      if (this.casts[i].elapsed >= this.cfg.expandSec) this.casts.splice(i, 1);
    }
    return hits;
  }

  reset(): void {
    this.cooldownLeft = 0;
    this.casts.length = 0;
  }
}
