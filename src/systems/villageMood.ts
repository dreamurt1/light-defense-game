// 마을 분위기 (순수 로직, 2026-11-06 라이언 지시). 수치는 game.json village (제안: 기획서에 없음)
//  - 밝아짐: 밤이 흐를수록 켜진 마을이 전체에 드러난다. 거듭제곱이라 처음엔 천천히, 새벽에 가까울수록 빨리 밝아진다
//  - 어두워짐: 등불이 맞아 HP가 줄수록 마을이 어두워지고, 밤이 깊을수록 그 깊이가 깊다.
//    HP에 묶여 있어 회복하면 그만큼 다시 밝아진다

export interface MoodConfig {
  brightenMax: number;
  brightenPower: number;
  /** HP 0일 때 초저녁의 어두움 */
  gloomBase: number;
  /** 밤이 끝까지 흐르면 더해지는 어두움 */
  gloomGrowth: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** 켜진 마을이 전체에 드러나는 정도. progress = 밤 진행률 0~1 */
export function brightenAt(progress: number, cfg: MoodConfig): number {
  return cfg.brightenMax * Math.pow(clamp01(progress), cfg.brightenPower);
}

/** 마을을 덮는 어둠의 불투명도. hpRatio = 등불 HP 비율 0~1 */
export function gloomAt(hpRatio: number, progress: number, cfg: MoodConfig): number {
  return (1 - clamp01(hpRatio)) * (cfg.gloomBase + cfg.gloomGrowth * clamp01(progress));
}
