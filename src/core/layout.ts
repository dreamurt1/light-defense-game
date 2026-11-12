// 화면 방식 (순수 로직, 2026-11-06 라이언 지시: 가로 화면 — PC 꽉 찬 화면 + 휴대폰 가로).
// 휴대폰(굵은 포인터)은 기기 방향을 따르고, PC는 설정(기본 가로)을 따른다.
// 보이는 범위는 '프레임만 바뀐다': 짧은 변을 540 단위로 고정하고 긴 변만 화면 비율에 맞춘다.
// 그래서 같은 휴대폰을 돌려도 루미·이웃·장애물은 같은 크기이고 보이는 창만 바뀐다.

export type Layout = 'portrait' | 'landscape';
/** PC에서 고르는 화면 방향 (휴대폰은 기기 방향) */
export type OrientationPref = Layout;

export interface ViewRules {
  /** 세로: 540×960 고정 */
  portrait: { width: number; height: number };
  /** 가로: 짧은 변(높이) 고정, 긴 변(폭)은 화면 비율 — 너무 좁거나 넓으면 이 범위로 자르고 띠를 둔다 */
  landscape: { height: number; minWidth: number; maxWidth: number };
}

/**
 * 휴대폰은 기기 방향. PC는 설정이 '가로'(기본)면 창에 맞춤 — 창이 가로로 길면 가로, 세로로 길면(좁은 창·세로 모니터) 세로로 꽉 채운다.
 * 설정이 '세로'면 창 모양과 상관없이 가운데 9:16
 */
export function pickLayout(o: { coarse: boolean; width: number; height: number; pref: OrientationPref }): Layout {
  if (o.coarse || o.pref === 'landscape') return o.width > o.height ? 'landscape' : 'portrait';
  return 'portrait';
}

/** 게임이 보여 줄 논리 크기(마을 단위). width·height = 지금 화면(창) 크기 */
export function viewSize(layout: Layout, width: number, height: number, rules: ViewRules): { width: number; height: number } {
  if (layout === 'portrait') return { ...rules.portrait };
  const { height: h, minWidth, maxWidth } = rules.landscape;
  // 짝수로 맞춰 가운데 정렬이 반 픽셀로 흐려지지 않게
  const w = Math.round((h * width) / Math.max(1, height) / 2) * 2;
  return { width: Math.min(maxWidth, Math.max(minWidth, w)), height: h };
}
