// 주인공 잠든 모습 시트 (2026-11-24 2-C 1-3절, ChatGPT reference/Sleep_Pack/<id>_sleep.png — 512 투명, 누운 바닥 y 496, 가운데 256, 머리 오른쪽).
// 쓰러짐 = 기절·잠듦(X 눈 금지). 8방향 시트와 **같은 축척**으로 128 칸에 놓는다 — 칸 안 키 ÷ 팩 몸 높이:
//   루미 101 / 480(256 팩 몸 240 × 2) · 토리 115 / 448 · 도토 95 / 442 (friendSheet.ts FRIEND_PACKS와 같은 값)
// 그림이 없으면 null → 코드 그림(빈 칸) → Lightkeeper가 옆모습 대기 첫 칸을 눕혀 쓴다. 'z' 같은 글자는 띄우지 않는다(라이언 2026-11-24).
import { CELL, FEET_Y } from './lumiSheet';

export type SleepId = 'lumi' | 'tori' | 'doto';
const SCALE: Record<SleepId, number> = { lumi: 101 / 480, tori: 115 / 448, doto: 95 / 442 };
const PACK = { centerX: 256, baseY: 496 };

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** 128 칸 한 장(2배 해상도). 그림이 없으면 null */
export async function composeSleep(id: SleepId): Promise<HTMLCanvasElement | null> {
  const img = await loadImage(`/reference/Sleep_Pack/${id}_sleep.png`);
  if (!img) return null;
  const s = SCALE[id];
  const c = document.createElement('canvas');
  c.width = CELL;
  c.height = CELL;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, CELL / 2 - PACK.centerX * s, FEET_Y - PACK.baseY * s, img.naturalWidth * s, img.naturalHeight * s);
  return c;
}
