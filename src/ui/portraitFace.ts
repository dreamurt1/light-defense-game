// 초상 배너의 얼굴 (2026-11-27 하이라이트 컷): 이미 있는 시트에서 얼굴 칸을 잘라 작은 캔버스에 — 새 그림 없음.
// 자를 자리는 cuts.json portraits([x, y, 한 변], 칸 안 픽셀). 그림은 한 번만 불러 둔다.
import { GameData } from '../data';

const images = new Map<string, Promise<HTMLImageElement>>();

function load(file: string): Promise<HTMLImageElement> {
  let p = images.get(file);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`초상 그림을 못 불러옴: ${file}`));
      img.src = `assets/${file}`;
    });
    // 실패한 그림은 다음에 다시 시도
    p.catch(() => images.delete(file));
    images.set(file, p);
  }
  return p;
}

/** 판이 시작될 때 미리 불러 둔다 (배너가 뜨는 순간 비어 보이지 않게) */
export function preloadFaces(): void {
  for (const d of Object.values(GameData.cuts.portraits)) void load(d.file).catch(() => undefined);
}

/** 얼굴 캔버스 (그림이 오면 그려짐 — 못 불러오면 빈 원) */
export function faceCanvas(key: string, px = 112): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = px;
  c.height = px;
  c.className = 'pline__canvas';
  c.setAttribute('aria-hidden', 'true');
  const d = GameData.cuts.portraits[key];
  if (!d) return c;
  load(d.file)
    .then((img) => {
      const ctx = c.getContext('2d');
      if (!ctx) return;
      const [x, y, n] = d.crop;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, d.frame * d.index + x, y, n, n, 0, 0, px, px);
      c.dataset.drawn = '1';
    })
    .catch(() => undefined);
  return c;
}
