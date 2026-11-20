// 잠긴 친구 칸의 실루엣 (2026-11-20 라이언): reference 폴더의 컨셉 그림(<이름>_Concept_Introduce)에서 모양만 따서 짙은 면색으로 칠한다.
// 초상(portrait-<id>)과 같은 상자(192 기준 x 10 · y 8 · 172×180, 발 = 아래 가운데)에 넣어, 구출하면 같은 자리에 제 모습이 선다.
// 물음표·라벤더 테두리 빛·자물쇠는 화면(CSS .locked-shade, SelectScreen)이 얹는다. 내보내기 = npm run assets
import { alphaBounds } from './cutout';
import { PORTRAIT } from './characters';
import { drawFriendPortrait, type FriendId } from './friends';
import type { Ctx } from './kit';

export const SHADE_RES = 3;
/** 초상과 같은 상자 (registry의 portrait art.box) */
export const SHADE_BOX = { x: 10, y: 8, w: 172, h: 180 } as const;

/** 컨셉 그림 (Vite가 저장소 뿌리에서 바로 준다 — 내보내기 페이지 전용) */
export const CONCEPT_URL: Record<FriendId, string> = {
  tori: '/reference/Tori_8_Direction_Pack/Tori_Concept_Introduce/tori_concept.png',
  doto: '/reference/Doto_8_Direction_Pack/Doto_Concept_Introduce/doto_concept.png',
};

/** 면색: 위 #1C1A3A → 아래(높이 70%부터) #0E0D20 — 아치·칸 바탕(#262A54 → #1A1C3A)보다 한 단계 짙게 */
const TOP = [0x1c, 0x1a, 0x3a] as const;
const BOTTOM = [0x0e, 0x0d, 0x20] as const;

/**
 * 컨셉 그림 가장자리의 옅은 빛(스티커 테두리 바깥 번짐)은 버리고 모양 경계만 또렷하게:
 * 투명도 24 이하 → 0, 180 이상 → 255, 그 사이는 곧게 잇는다
 */
export function shadeAlpha(a: number): number {
  return Math.round(Math.min(1, Math.max(0, (a - 24) / (180 - 24))) * 255);
}

/** 높이 비율 t(0 = 위, 1 = 아래)의 면색 */
export function shadeColor(t: number): [number, number, number] {
  const k = Math.min(1, Math.max(0, t / 0.7));
  return [0, 1, 2].map((i) => Math.round(TOP[i] + (BOTTOM[i] - TOP[i]) * k)) as [number, number, number];
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** 칠해진 그림(투명 배경)을 면색 실루엣으로 바꾼다 */
function paintShade(ctx: Ctx, w: number, h: number): void {
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;
  for (let y = 0; y < h; y++) {
    const [r, g, b] = shadeColor(y / h);
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = shadeAlpha(d[i + 3]);
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = a;
    }
  }
  ctx.putImageData(image, 0, 0);
}

/** 컨셉 그림 → 576×576 실루엣. 컨셉 그림이 없으면 null(코드 초상으로 대신) */
export async function composeLockedShade(id: FriendId): Promise<HTMLCanvasElement | null> {
  const img = await loadImage(CONCEPT_URL[id]);
  if (!img) return null;
  const src = document.createElement('canvas');
  src.width = img.naturalWidth;
  src.height = img.naturalHeight;
  const sctx = src.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  sctx.drawImage(img, 0, 0);
  const px = sctx.getImageData(0, 0, src.width, src.height);
  const r = alphaBounds({ data: px.data, width: src.width, height: src.height }, 24);
  if (!r) return null;

  const size = PORTRAIT.size * SHADE_RES;
  const out = document.createElement('canvas');
  out.width = size;
  out.height = size;
  const ctx = out.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  ctx.imageSmoothingQuality = 'high';
  const k = Math.min((SHADE_BOX.w * SHADE_RES) / r.w, (SHADE_BOX.h * SHADE_RES) / r.h);
  const w = r.w * k;
  const h = r.h * k;
  const cx = (SHADE_BOX.x + SHADE_BOX.w / 2) * SHADE_RES;
  const feet = (SHADE_BOX.y + SHADE_BOX.h) * SHADE_RES;
  ctx.drawImage(src, r.x, r.y, r.w, r.h, cx - w / 2, feet - h, w, h);
  paintShade(ctx, size, size);
  return out;
}

/** 컨셉 그림이 없을 때: 코드로 그린 초상의 모양을 같은 면색으로 (192 칸) */
export function drawShadeFallback(ctx: Ctx, id: FriendId): void {
  drawFriendPortrait(ctx, id, 'true');
  paintShade(ctx, PORTRAIT.size, PORTRAIT.size);
}
