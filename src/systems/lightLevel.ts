// 광도 4단계 (순수 로직, 2026-11-12 새 기획). 0~100 연속값을 낮음·중간·밝음·크게 밝음으로 나눈다.
// 경계는 game.json lightLevels.bands (제안). 광도는 0이 되지 않는다(최소 '낮음').
export type LightBand = 0 | 1 | 2 | 3;

/** 0 = 낮음, 1 = 중간, 2 = 밝음, 3 = 크게 밝음 */
export function bandOf(value: number, bands: readonly [number, number, number]): LightBand {
  if (value >= bands[2]) return 3;
  if (value >= bands[1]) return 2;
  if (value >= bands[0]) return 1;
  return 0;
}

/** 완전 승리 기준 단계 '밝음' */
export const BAND_BRIGHT: LightBand = 2;
