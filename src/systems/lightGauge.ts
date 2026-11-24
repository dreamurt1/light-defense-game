// 적 "빛 게이지" · 마지막 하트 위험 링 — 순수 판정 (2026-11-24 15:03 기획 세션 지시서 order-enemy-light-gauge, 라이언 확정)
//  - 빛 게이지: 호스틸·잃어버린 주민만(패시브·노월·어둠 구슬 제외). 빛에 맞아 HP가 줄었는데 아직 0이 아닐 때만
//    showMs 동안 보이고 fadeMs로 사라짐(다시 맞으면 처음부터). 채움 = 1 − HP/maxHP(받은 빛만큼 차오름, 숫자 없음).
//  - 위험 링: 하트 1개 + HP ≤ hpRatio, 쓰러짐·무적 중엔 끔. 불투명도 0.35~0.7을 pulseMs 주기로 숨 쉬듯.
//  주인공 머리 위 HP는 넣지 않는다(HUD 하트·HP 막대·피격 연출이 이미 같은 정보).

export interface EnemyGaugeCfg {
  enabled: boolean;
  showMs: number;
  fadeMs: number;
  width: number;
  height: number;
  offsetY: number;
  kinds: string[];
}

export interface DangerRingCfg {
  enabled: boolean;
  hpRatio: number;
  radius: number;
  pulseMs: number;
}

/** 링 불투명도 범위 (지시서: 0.35~0.7) */
export const RING_ALPHA_MIN = 0.35;
export const RING_ALPHA_MAX = 0.7;
/** 켜지고 꺼질 때 페이드 (지시서: 0.3초) */
export const RING_FADE_MS = 300;

/** 이 종류의 적에 게이지를 쓰나 (노월은 kind 'boss'라 빠짐, 어둠 구슬은 적이 아님) */
export function gaugeFor(kind: string, cfg: EnemyGaugeCfg): boolean {
  return cfg.enabled && cfg.kinds.includes(kind);
}

/** 채움 비율 = 받은 빛의 비율 (0~1) */
export function gaugeFill(hp: number, maxHp: number): number {
  if (maxHp <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - hp / maxHp));
}

/** 맞은 뒤 지난 시간(ms)에 따른 불투명도: showMs까지 1, 다음 fadeMs 동안 1→0, 그 뒤 0 */
export function gaugeAlpha(sinceHitMs: number, cfg: Pick<EnemyGaugeCfg, 'showMs' | 'fadeMs'>): number {
  if (sinceHitMs < 0) return 0;
  if (sinceHitMs <= cfg.showMs) return 1;
  if (cfg.fadeMs <= 0) return 0;
  return Math.max(0, 1 - (sinceHitMs - cfg.showMs) / cfg.fadeMs);
}

/** 맞은 직후 게이지를 보일지: 게이지 쓰는 종 + HP가 남음(0이면 퇴장·구출 연출이 대신함) */
export function gaugeShowsAfterHit(kind: string, hpAfter: number, cfg: EnemyGaugeCfg): boolean {
  return gaugeFor(kind, cfg) && hpAfter > 0;
}

export interface KeeperVitals {
  hearts: number;
  hp: number;
  maxHp: number;
  /** 쓰러짐 또는 부활 무적 (Vitals.invulnerable) */
  invulnerable: boolean;
}

/** 위험 링을 켤지: 하트 1개 + HP ≤ hpRatio, 무적·쓰러짐 중엔 끔 */
export function dangerRingOn(v: KeeperVitals, cfg: Pick<DangerRingCfg, 'enabled' | 'hpRatio'>): boolean {
  if (!cfg.enabled || v.invulnerable || v.hearts !== 1 || v.maxHp <= 0) return false;
  return v.hp / v.maxHp <= cfg.hpRatio;
}

/** 숨쉬기 불투명도 (t ms): 0.35에서 시작해 pulseMs/2에 0.7, pulseMs에 다시 0.35 */
export function dangerPulse(tMs: number, pulseMs: number): number {
  const phase = pulseMs > 0 ? (tMs % pulseMs) / pulseMs : 0;
  const k = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
  return RING_ALPHA_MIN + (RING_ALPHA_MAX - RING_ALPHA_MIN) * k;
}

/** 켜짐 정도(0~1)를 목표로 fadeMs에 걸쳐 옮김 — 링이 켜지고 꺼질 때 */
export function fadeToward(level: number, on: boolean, dtMs: number, fadeMs = RING_FADE_MS): number {
  const step = fadeMs > 0 ? dtMs / fadeMs : 1;
  return on ? Math.min(1, level + step) : Math.max(0, level - step);
}
