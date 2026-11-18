// 구획 시야 (2026-11-18, 기획서 4절·Phase 2: 맵 안의 지역 구획 — 빛의 마을 · 경계 · 어둠의 마을) — 순수 로직.
// 중앙 광원에서의 거리로 구획을 나눈다: lightRadius 안 = 빛의 마을, darkRadius 밖 = 어둠의 마을, 그 사이 = 경계.
//  - 등불지기의 시야(주변 빛 반지름)가 구획마다 다르다: 빛의 마을 조금 넓게, 어둠의 마을 좁게 (vision 배율)
//  - 무대(VillageStage)는 바깥으로 갈수록 어두운 막을 깐다(테마마다 진하기 다름)
export type Zone = 'light' | 'border' | 'dark';

export interface ZoneCfg {
  lightRadius: number;
  darkRadius: number;
  vision: Record<Zone, number>;
}

export function zoneAt(center: { x: number; y: number }, p: { x: number; y: number }, cfg: ZoneCfg): Zone {
  const d = Math.hypot(p.x - center.x, p.y - center.y);
  return d < cfg.lightRadius ? 'light' : d > cfg.darkRadius ? 'dark' : 'border';
}

/** 구획 경계에서 시야가 툭 바뀌지 않게 거리로 부드럽게 잇는다 (빛의 마을 → 경계 → 어둠의 마을) */
export function visionAt(center: { x: number; y: number }, p: { x: number; y: number }, cfg: ZoneCfg): number {
  const d = Math.hypot(p.x - center.x, p.y - center.y);
  const { light, border, dark } = cfg.vision;
  if (d <= cfg.lightRadius) return light;
  if (d >= cfg.darkRadius) return dark;
  const mid = (cfg.lightRadius + cfg.darkRadius) / 2;
  return d < mid ? light + (border - light) * ((d - cfg.lightRadius) / (mid - cfg.lightRadius)) : border + (dark - border) * ((d - mid) / (cfg.darkRadius - mid));
}
