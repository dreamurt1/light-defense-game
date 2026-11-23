// 돌려보낸 패시브 너머의 어둠 (2026-11-23 밤 나들이 v3, NIGHT_RUN.md 5-1절) — 순수 로직.
// 옛 '분노'(맞은 패시브가 쫓아와 들이받음, 2번 맞힐 때마다 호스틸 2마리)는 없앴다. 이제 패시브는 반격하지 않고,
// 세 번 맞혀 돌려보내면 곧바로 그 주민 너머(루미 반대쪽) banishHostileDist에서 그 밤 로스터의 호스틸 banishHostileCount마리가 나온다.
import type { Vec } from './fan';
import type { Rect } from './obstacles';

export interface BanishCfg {
  banishHostileCount: number;
  banishHostileDist: number;
}

/** 나란히 설 때 사이 간격 (여러 마리일 때) */
const SPREAD = 90;

/** 돌려보낸 주민 너머의 자리들 (걷는 영역 안으로 자름) */
export function beyondSpots(at: Vec, player: Vec, cfg: BanishCfg, area: Rect): Vec[] {
  const dx = at.x - player.x;
  const dy = at.y - player.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const n = Math.max(0, Math.floor(cfg.banishHostileCount));
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  return Array.from({ length: n }, (_, i) => {
    const spread = (i - (n - 1) / 2) * SPREAD;
    return {
      x: clamp(at.x + ux * cfg.banishHostileDist - uy * spread, area.x, area.x + area.w),
      y: clamp(at.y + uy * cfg.banishHostileDist + ux * spread, area.y, area.y + area.h),
    };
  });
}
