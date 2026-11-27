// PC 넓은 화면 선명도 (2026-11-27 라이언: "PC 넓은 풀 화면에서 주인공 셋 포함 몹들이 해상도가 낮아 흐릿") —
// 그동안 캔버스를 짧은 변 540(논리)으로 그려 화면 크기로 늘렸다(1920×1080이면 2배로 늘림 → 흐릿). 그림 자체는 2배 해상도(res 2)로 구워져 있다.
// → 캔버스를 화면 실제 픽셀로(짧은 변 540 × 배율) 그리고, 카메라를 같은 배율로 확대해 보이는 크기는 그대로 둔다.
//  - 배율 = 화면 상자 짧은 변(CSS px) × 기기 배율 ÷ 540, 1~MAX_ZOOM(0.25 단위)
//  - 폰·태블릿(굵은 포인터)·가벼운 모드로 기억된 기기는 1 — 지금과 같음(GPU 채우기 부담, 태블릿 렉)
//  - 카메라는 가운데 기준으로 확대된다 → 화면에 붙은 층(scrollFactor 0)은 screenOffset만큼 옮겨 놓고, 보이는 마을의 왼쪽 위는 viewOrigin으로
import type Phaser from 'phaser';
import type { Vec } from '../systems/fan';

export const MAX_ZOOM = 2;
/** 게임의 짧은 변 (논리 px) */
export const LOGICAL_SHORT = 540;

/** 캔버스 배율 */
export function zoomFor(o: { coarse: boolean; lite: boolean; shortCss: number; dpr: number }): number {
  if (o.coarse || o.lite) return 1;
  const z = (o.shortCss * o.dpr) / LOGICAL_SHORT;
  return Math.max(1, Math.min(MAX_ZOOM, Math.round(z * 4) / 4));
}

/** 게임 크기에서 카메라 배율 (짧은 변 / 540) */
export function camZoom(width: number, height: number): number {
  return Math.max(1, Math.min(width, height) / LOGICAL_SHORT);
}

type Cam = Pick<Phaser.Cameras.Scene2D.Camera, 'width' | 'height' | 'displayWidth' | 'displayHeight' | 'scrollX' | 'scrollY'>;

/** 화면에 붙은 층(scrollFactor 0)의 왼쪽 위 — 가운데 기준 확대 보정 (배율 1이면 0) */
export function screenOffset(cam: Cam): Vec {
  return { x: (cam.width - cam.displayWidth) / 2, y: (cam.height - cam.displayHeight) / 2 };
}

/** 지금 보이는 마을의 왼쪽 위 — 이번 프레임 스크롤 기준(worldView는 그리기 직전에야 갱신돼 한 프레임 늦음) */
export function viewOrigin(cam: Cam): Vec {
  const o = screenOffset(cam);
  return { x: cam.scrollX + o.x, y: cam.scrollY + o.y };
}

/** 카메라에 배율을 건다 (게임 크기 기준) — 건 배율을 돌려준다 */
export function applyCamZoom(cam: Phaser.Cameras.Scene2D.Camera, width: number, height: number): number {
  const z = camZoom(width, height);
  cam.setZoom(z);
  return z;
}
