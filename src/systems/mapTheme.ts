// 테마별 지도 모양 (2026-11-18, 기획서 4절 '맵 3종 = 스테이지 테마', Phase 5) — 순수 로직.
// map.json의 기본 배치(빛의 마을) 위에 테마마다 장애물·풀숲을 더한다: 경계 = 울타리·바위·풀숲(숨을 곳),
// 어둠의 마을 = 돌담 미로·바위·풀숲. 오두막은 마을 그림에 바닥이 구워져 있어 더하지 않는다.
export interface LayoutRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ThemeLayout<O extends LayoutRect> {
  obstacles?: O[];
  bushes?: LayoutRect[];
}

export function layoutFor<O extends LayoutRect>(
  base: { obstacles: O[]; bushes: LayoutRect[]; themes?: Record<string, ThemeLayout<O>> },
  theme: string,
): { obstacles: O[]; bushes: LayoutRect[] } {
  const t = base.themes?.[theme];
  return { obstacles: [...base.obstacles, ...(t?.obstacles ?? [])], bushes: [...base.bushes, ...(t?.bushes ?? [])] };
}
