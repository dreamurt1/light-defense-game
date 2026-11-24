// 빛 레벨 ★ (2026-11-23 밤 나들이 v3, NIGHT_RUN.md 6-1절) — 순수 로직. 런 안에서만 자란다(영구 성장 없음).
//  - 경험치: 구출 3 · 호스틸 돌려보냄 2 · 등불 켜기 2 · 자비 2 · 패시브 돌려보냄 1 (game.json growth.xp)
//  - ★L → ★L+1에 xpToNext[L-1](2026-11-24 다듬기 1차: 10·15·25·40·60·85·115·150·190, 누적 690), 최대 ★maxLevel
//  - ★최대에 닿은 뒤 남는 경험치는 overflowDustPerXp(50)마다 별가루 +1 — 최대 레벨의 xp = 다음 별가루까지 쌓은 양
//  - 레벨마다: 빛 위력 +5% · 사거리 +2%(최대 ×1.2) · 최대 LP +5 · 토리 이동 +1% · 도토 아이템 효과 +3%
import type { CharacterId, GameConfig } from '../data';

export type GrowthCfg = GameConfig['growth'];
export type XpSource = keyof GrowthCfg['xp'];

export interface GrowthState {
  level: number;
  /** 다음 레벨까지 쌓은 경험치 */
  xp: number;
}

/** 이 레벨에서 다음 레벨까지 필요한 경험치 (최대 레벨이면 Infinity) */
export function xpNeed(level: number, cfg: GrowthCfg): number {
  if (level >= cfg.maxLevel) return Infinity;
  return cfg.xpToNext[Math.min(cfg.xpToNext.length - 1, Math.max(0, level - 1))];
}

/** 경험치를 더한다. ups = 오른 레벨 수, dust = ★최대 뒤 남은 경험치로 얻은 별가루 */
export function addXp(s: GrowthState, gain: number, cfg: GrowthCfg): GrowthState & { ups: number; dust: number } {
  let { level, xp } = s;
  let ups = 0;
  xp += Math.max(0, gain);
  while (level < cfg.maxLevel && xp >= xpNeed(level, cfg)) {
    xp -= xpNeed(level, cfg);
    level += 1;
    ups += 1;
  }
  let dust = 0;
  if (level >= cfg.maxLevel) {
    const per = cfg.overflowDustPerXp;
    if (per > 0) {
      dust = Math.floor(xp / per);
      xp -= dust * per;
    } else xp = 0;
  }
  return { level, xp, ups, dust };
}

export interface GrowthEffects {
  /** 빛 위력 배율 */
  lightPower: number;
  /** 사거리 배율 (상한 lightRangeCap) */
  lightRange: number;
  /** 최대 LP에 더함 */
  lpMax: number;
  /** 이동 배율 (토리만) */
  move: number;
  /** 아이템 효과 배율 (도토만) */
  itemEffect: number;
}

export function growthEffects(level: number, characterId: CharacterId, cfg: GrowthCfg): GrowthEffects {
  const k = Math.max(0, Math.min(cfg.maxLevel, level) - 1);
  const p = cfg.perLevel;
  return {
    lightPower: 1 + p.lightPower * k,
    lightRange: Math.min(p.lightRangeCap, 1 + p.lightRange * k),
    lpMax: p.lpMax * k,
    move: characterId === 'tori' ? 1 + p.toriMove * k : 1,
    itemEffect: characterId === 'doto' ? 1 + p.dotoItemEffect * k : 1,
  };
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** from → to로 오른 효과 한 줄 (아침 화면): '빛 위력 +10% · 사거리 +4% · 최대 LP +10' */
export function growthLine(from: number, to: number, characterId: CharacterId, cfg: GrowthCfg): string {
  if (to <= from) return '';
  const a = growthEffects(from, characterId, cfg);
  const b = growthEffects(to, characterId, cfg);
  const parts = [`빛 위력 +${pct(b.lightPower - a.lightPower)}`];
  if (b.lightRange > a.lightRange) parts.push(`사거리 +${pct(b.lightRange - a.lightRange)}`);
  parts.push(`최대 LP +${b.lpMax - a.lpMax}`);
  if (b.move > a.move) parts.push(`이동 +${pct(b.move - a.move)}`);
  if (b.itemEffect > a.itemEffect) parts.push(`아이템 효과 +${pct(b.itemEffect - a.itemEffect)}`);
  return parts.join(' · ');
}
