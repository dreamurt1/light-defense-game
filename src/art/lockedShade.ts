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

/** 컨셉 그림 → (192 × res)² 실루엣(기본 576×576). 컨셉 그림이 없으면 null(코드 초상으로 대신) */
export async function composeLockedShade(id: FriendId, res: number = SHADE_RES): Promise<HTMLCanvasElement | null> {
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

  const size = PORTRAIT.size * res;
  const out = document.createElement('canvas');
  out.width = size;
  out.height = size;
  const ctx = out.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  ctx.imageSmoothingQuality = 'high';
  const k = Math.min((SHADE_BOX.w * res) / r.w, (SHADE_BOX.h * res) / r.h);
  const w = r.w * k;
  const h = r.h * k;
  const cx = (SHADE_BOX.x + SHADE_BOX.w / 2) * res;
  const feet = (SHADE_BOX.y + SHADE_BOX.h) * res;
  ctx.drawImage(src, r.x, r.y, r.w, r.h, cx - w / 2, feet - h, w, h);
  paintShade(ctx, size, size);
  return out;
}

/** 라벤더 테두리 빛 #A89CD9 */
const RIM = '#A89CD9';

/**
 * 빛을 잃은 친구 (2026-11-24 라이언 — 이야기 카드·구출 직전 판 위): 잠긴 칸과 같은 실루엣에
 * 라벤더 테두리(선 rim px)와 옅은 번짐(rim × 2px, 192 기준)을 구워 어두운 밤 지도 위에서도 모양이 읽히게. 컨셉 그림이 없으면 null.
 * 화면(이야기 카드)용 = res 3·rim 1, 판 위용 = res 1·rim 2 (576을 92px로 줄이면 얇은 테두리가 점선처럼 끊겨서)
 */
export async function composeLostShade(id: FriendId, res: number = SHADE_RES, rim = 1): Promise<HTMLCanvasElement | null> {
  const shade = await composeLockedShade(id, res);
  if (!shade) return null;
  const size = shade.width;
  const tint = document.createElement('canvas');
  tint.width = size;
  tint.height = size;
  const t = tint.getContext('2d') as CanvasRenderingContext2D;
  t.drawImage(shade, 0, 0);
  t.globalCompositeOperation = 'source-in';
  t.fillStyle = RIM;
  t.fillRect(0, 0, size, size);
  const out = document.createElement('canvas');
  out.width = size;
  out.height = size;
  const ctx = out.getContext('2d') as CanvasRenderingContext2D;
  const px = res * rim; // 192 기준 rim px
  ctx.filter = `blur(${px * 2}px)`;
  ctx.globalAlpha = 0.55;
  ctx.drawImage(tint, 0, 0);
  ctx.filter = 'none';
  ctx.globalAlpha = 0.85;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) ctx.drawImage(tint, dx * px, dy * px);
  ctx.globalAlpha = 1;
  ctx.drawImage(shade, 0, 0);
  return out;
}

/** 컨셉 그림이 없을 때: 코드로 그린 초상의 모양을 같은 면색으로 (192 칸) */
export function drawShadeFallback(ctx: Ctx, id: FriendId): void {
  drawFriendPortrait(ctx, id, 'true');
  paintShade(ctx, PORTRAIT.size, PORTRAIT.size);
}
