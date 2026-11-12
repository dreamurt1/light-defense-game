// 생성 그림(ChatGPT) 다듬기: 칠해진 배경 지우기, 그림 영역 찾기, 한 장에 나란히 그린 포즈 나누기.
// 캔버스 없이 픽셀 배열만 다루는 순수 함수라 Vitest로 확인한다. 가져오기는 src/dev/assetExport.ts.

export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type RGB = [number, number, number];

export interface Span {
  x0: number;
  /** 포함하지 않는 끝 */
  x1: number;
}

const alphaAt = (img: Pixels, i: number): number => img.data[i * 4 + 3];

/** 네 모서리가 모두 불투명하면 배경이 칠해진 그림이다(투명 배경으로 받지 못한 경우) */
export function hasOpaqueBackground(img: Pixels): boolean {
  const { width: w, height: h } = img;
  return [0, w - 1, (h - 1) * w, h * w - 1].every((i) => alphaAt(img, i) > 250);
}

/** 테두리 픽셀의 채널별 중앙값 = 배경색 */
export function borderColor(img: Pixels): RGB {
  const { width: w, height: h, data } = img;
  const r: number[] = [];
  const g: number[] = [];
  const b: number[] = [];
  const take = (i: number) => {
    r.push(data[i * 4]);
    g.push(data[i * 4 + 1]);
    b.push(data[i * 4 + 2]);
  };
  for (let x = 0; x < w; x++) {
    take(x);
    take((h - 1) * w + x);
  }
  for (let y = 1; y < h - 1; y++) {
    take(y * w);
    take(y * w + w - 1);
  }
  const median = (a: number[]) => a.sort((p, q) => p - q)[a.length >> 1];
  return [median(r), median(g), median(b)];
}

/**
 * 테두리에서 이어진 배경색 영역을 투명하게 지운다(그림 안쪽의 같은 색은 남는다).
 * 배경색과 tolerance 이내면 완전히 지우고, 그다음 feather만큼은 반투명으로 섞으며 배경색 번짐을 걷어 낸다.
 */
export function removeBackground(img: Pixels, tolerance = 42, feather = 36): void {
  removeColors(img, [borderColor(img)], tolerance, feather);
}

/**
 * 테두리에서 이어진, 주어진 배경색들(예: 체크무늬 두 색, 판 색 + 바닥 그림자 색) 중 하나에 가까운 영역을 지운다.
 * 가장자리는 가장 가까운 배경색을 빼 내며 반투명하게 섞는다.
 */
export function removeColors(img: Pixels, colors: readonly RGB[], tolerance = 42, feather = 36): void {
  const { width: w, height: h, data } = img;
  const nearest = (i: number): [number, RGB] => {
    let best = Infinity;
    let col = colors[0];
    for (const c of colors) {
      const d = Math.hypot(data[i * 4] - c[0], data[i * 4 + 1] - c[1], data[i * 4 + 2] - c[2]);
      if (d < best) {
        best = d;
        col = c;
      }
    }
    return [best, col];
  };
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 1; y < h - 1; y++) stack.push(y * w, y * w + w - 1);

  while (stack.length) {
    const i = stack.pop() as number;
    if (seen[i]) continue;
    seen[i] = 1;
    if (data[i * 4 + 3] === 0) {
      // 이미 투명한 곳은 지나간다 (투명 배경 그림)
      const x = i % w;
      if (x > 0) stack.push(i - 1);
      if (x < w - 1) stack.push(i + 1);
      if (i >= w) stack.push(i - w);
      if (i < w * (h - 1)) stack.push(i + w);
      continue;
    }
    const [d, [br, bg, bb]] = nearest(i);
    if (d >= tolerance + feather) continue;
    if (d <= tolerance) {
      data[i * 4 + 3] = 0;
      const x = i % w;
      if (x > 0) stack.push(i - 1);
      if (x < w - 1) stack.push(i + 1);
      if (i >= w) stack.push(i - w);
      if (i < w * (h - 1)) stack.push(i + w);
      continue;
    }
    // 가장자리: 색 거리만큼 남기고, 섞여 있던 배경색을 빼 낸다
    const a = (d - tolerance) / feather;
    data[i * 4 + 3] = Math.round(Math.min(data[i * 4 + 3], 255 * a));
    data[i * 4] = Math.round((data[i * 4] - br * (1 - a)) / a);
    data[i * 4 + 1] = Math.round((data[i * 4 + 1] - bg * (1 - a)) / a);
    data[i * 4 + 2] = Math.round((data[i * 4 + 2] - bb * (1 - a)) / a);
  }
}

/** 체크무늬(가짜 투명) 배경: 테두리 픽셀을 밝기로 둘로 나눠 두 색을 찾고 함께 지운다 */
export function removeCheckerboard(img: Pixels, tolerance = 26, feather = 30): void {
  const { width: w, height: h, data } = img;
  const border: RGB[] = [];
  const take = (i: number) => border.push([data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]);
  for (let x = 0; x < w; x++) {
    take(x);
    take((h - 1) * w + x);
  }
  for (let y = 1; y < h - 1; y++) {
    take(y * w);
    take(y * w + w - 1);
  }
  const lum = (c: RGB) => c[0] + c[1] + c[2];
  border.sort((a, b) => lum(a) - lum(b));
  const pick = (from: number, to: number): RGB => border[Math.floor((from + to) / 2)];
  const n = border.length;
  removeColors(img, [pick(0, n / 2), pick(n / 2, n)], tolerance, feather);
}

/**
 * 어두운 판 위에 그린 빛 효과를 투명도로 바꾼다(색 → 투명, GIMP color-to-alpha 방식).
 * 배경색과 같은 곳은 완전히 투명, 멀어질수록 불투명해지고 색은 배경을 빼 낸 원래 빛 색이 된다.
 */
export function colorToAlpha(img: Pixels, bg: RGB): void {
  const { data } = img;
  for (let i = 0; i < data.length; i += 4) {
    let a = 0;
    for (let k = 0; k < 3; k++) {
      const c = data[i + k];
      const b = bg[k];
      const r = c > b ? (c - b) / (255 - b || 1) : c < b ? (b - c) / (b || 1) : 0;
      if (r > a) a = r;
    }
    if (a <= 0) {
      data[i + 3] = 0;
      continue;
    }
    for (let k = 0; k < 3; k++) data[i + k] = Math.round(Math.min(255, Math.max(0, (data[i + k] - bg[k]) / a + bg[k])));
    data[i + 3] = Math.round(Math.min(data[i + 3], 255 * a));
  }
}

/** 큰 덩어리만 남긴다: 가장 큰 덩어리의 minRatio보다 작은 조각(남은 눈금선·먼지)은 지운다 */
export function keepMainBlobs(img: Pixels, minRatio = 0.08, threshold = 24): void {
  const { width: w, height: h, data } = img;
  const label = new Int32Array(w * h).fill(-1);
  const sizes: number[] = [];
  for (let start = 0; start < w * h; start++) {
    if (label[start] >= 0 || data[start * 4 + 3] <= threshold) continue;
    const id = sizes.length;
    let size = 0;
    const stack = [start];
    label[start] = id;
    while (stack.length) {
      const i = stack.pop() as number;
      size++;
      const x = i % w;
      const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i >= w ? i - w : -1, i < w * (h - 1) ? i + w : -1];
      for (const j of nb) {
        if (j < 0 || label[j] >= 0 || data[j * 4 + 3] <= threshold) continue;
        label[j] = id;
        stack.push(j);
      }
    }
    sizes.push(size);
  }
  if (!sizes.length) return;
  const min = Math.max(...sizes) * minRatio;
  for (let i = 0; i < w * h; i++) if (label[i] >= 0 && sizes[label[i]] < min) data[i * 4 + 3] = 0;
}

/** 발 가운데 x: 그림 아래쪽 15% 줄에 있는 불투명 픽셀의 평균 x (걷기 프레임마다 꼬리 때문에 흔들리지 않게) */
export function feetCenterX(img: Pixels, r: Rect, threshold = 40): number {
  let sum = 0;
  let n = 0;
  for (let y = Math.floor(r.y + r.h * 0.85); y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] > threshold) {
        sum += x;
        n++;
      }
    }
  }
  return n ? sum / n : r.x + r.w / 2;
}

/** 알파가 threshold를 넘는 픽셀을 모두 담는 가장 작은 사각형. 가로 범위를 주면 그 안에서만 찾는다 */
export function alphaBounds(img: Pixels, threshold = 10, span: Span = { x0: 0, x1: img.width }): Rect | null {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = span.x0; x < span.x1; x++) {
      if (alphaAt(img, y * img.width + x) <= threshold) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * 한 장에 왼쪽부터 나란히 그린 포즈 count개의 가로 범위.
 * 빈 세로줄로 나뉜 덩어리를 찾고, 덩어리가 많으면(떨어진 반짝이·꼬리 끝 등) 가장 좁은 것을 가까운 이웃에 합친다.
 */
export function splitColumns(img: Pixels, count: number, threshold = 10, minGap = 3): Span[] {
  const filled: boolean[] = [];
  for (let x = 0; x < img.width; x++) {
    let any = false;
    for (let y = 0; y < img.height && !any; y++) any = alphaAt(img, y * img.width + x) > threshold;
    filled.push(any);
  }
  let spans: Span[] = [];
  for (let x = 0; x < img.width; x++) {
    if (!filled[x]) continue;
    const last = spans[spans.length - 1];
    if (last && x - last.x1 < minGap) last.x1 = x + 1;
    else spans.push({ x0: x, x1: x + 1 });
  }
  while (spans.length > count) {
    let k = 0;
    for (let i = 1; i < spans.length; i++) if (spans[i].x1 - spans[i].x0 < spans[k].x1 - spans[k].x0) k = i;
    const gapLeft = k > 0 ? spans[k].x0 - spans[k - 1].x1 : Infinity;
    const gapRight = k < spans.length - 1 ? spans[k + 1].x0 - spans[k].x1 : Infinity;
    const j = gapLeft <= gapRight ? k - 1 : k + 1;
    const merged = { x0: Math.min(spans[j].x0, spans[k].x0), x1: Math.max(spans[j].x1, spans[k].x1) };
    spans = spans.filter((_, i) => i !== j && i !== k);
    spans.splice(Math.min(j, k), 0, merged);
  }
  if (spans.length < count) throw new Error(`포즈 ${count}개를 기대했는데 ${spans.length}개만 보입니다 (포즈 사이를 띄워 주세요)`);
  return spans;
}

/** 여러 포즈를 같은 배율로 상자에 넣을 때의 배율: 가장 큰 포즈가 상자에 꼭 맞는다 */
export function containScale(poses: readonly { w: number; h: number }[], box: { w: number; h: number }): number {
  return Math.min(...poses.map((p) => Math.min(box.w / p.w, box.h / p.h)));
}

/** 덩어리마다의 사각형 (minArea 픽셀보다 작은 조각은 뺀다). 위→아래, 왼쪽→오른쪽 순 */
export function blobs(img: Pixels, minArea = 30, threshold = 24): Rect[] {
  const { width: w, height: h, data } = img;
  const seen = new Uint8Array(w * h);
  const out: Rect[] = [];
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || data[start * 4 + 3] <= threshold) continue;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -1;
    let y1 = -1;
    let area = 0;
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop() as number;
      const x = i % w;
      const y = (i - x) / w;
      area++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i >= w ? i - w : -1, i < w * (h - 1) ? i + w : -1];
      for (const j of nb) {
        if (j < 0 || seen[j] || data[j * 4 + 3] <= threshold) continue;
        seen[j] = 1;
        stack.push(j);
      }
    }
    if (area >= minArea) out.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
  }
  return out.sort((a, b) => (Math.abs(a.y - b.y) > 12 ? a.y - b.y : a.x - b.x));
}

/**
 * 한 줄에 나란히 그린 포즈 count개를 덩어리로 찾는다(세로 빈 줄이 없어도 됨).
 *  - 줄 높이의 45% 이상인 덩어리 중 큰 것 count개 = 포즈 (눈금선처럼 납작하고 긴 것은 뺀다)
 *  - 위·아래 가장자리에 걸친 작은 조각(이웃 줄의 귀·발)과 눈금선은 지운다
 *  - 그 밖의 작은 조각(공격 별·땀방울)은 가장 가까운 포즈에 붙인다
 * img를 고쳐 쓰고, 포즈마다의 사각형을 왼쪽부터 돌려준다.
 */
export function pickPoses(img: Pixels, count: number, threshold = 24): Rect[] {
  const { width: w, height: h, data } = img;
  // 칸 경계 눈금선: 가장자리 4줄 안에서 줄의 절반 넘게 채운 가로선·세로선은 먼저 지운다 (포즈들이 선으로 이어지지 않게)
  const opaque = (x: number, y: number) => data[(y * w + x) * 4 + 3] > threshold;
  for (const y of [0, 1, 2, 3, h - 4, h - 3, h - 2, h - 1]) {
    if (y < 0 || y >= h) continue;
    let n = 0;
    for (let x = 0; x < w; x++) if (opaque(x, y)) n++;
    if (n > w * 0.5) for (let x = 0; x < w; x++) data[(y * w + x) * 4 + 3] = 0;
  }
  for (const x of [0, 1, 2, w - 3, w - 2, w - 1]) {
    if (x < 0 || x >= w) continue;
    let n = 0;
    for (let y = 0; y < h; y++) if (opaque(x, y)) n++;
    if (n > h * 0.6) for (let y = 0; y < h; y++) data[(y * w + x) * 4 + 3] = 0;
  }
  const label = new Int32Array(w * h).fill(-1);
  const rects: Rect[] = [];
  const areas: number[] = [];
  for (let start = 0; start < w * h; start++) {
    if (label[start] >= 0 || data[start * 4 + 3] <= threshold) continue;
    const id = rects.length;
    let [x0, y0, x1, y1, area] = [Infinity, Infinity, -1, -1, 0];
    const stack = [start];
    label[start] = id;
    while (stack.length) {
      const i = stack.pop() as number;
      const x = i % w;
      const y = (i - x) / w;
      area++;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i >= w ? i - w : -1, i < w * (h - 1) ? i + w : -1]) {
        if (j < 0 || label[j] >= 0 || data[j * 4 + 3] <= threshold) continue;
        label[j] = id;
        stack.push(j);
      }
    }
    rects.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
    areas.push(area);
  }
  // 눈금선: 납작하고 긴 것 (작은 점은 별 조각일 수 있어 선으로 보지 않는다)
  const isLine = (r: Rect) => (r.h <= 4 && r.w > 12) || (r.w > w * 0.5 && r.h < h * 0.25);
  const main = rects
    .map((r, id) => ({ r, id, area: areas[id] }))
    .filter(({ r }) => r.h >= h * 0.45 && !isLine(r))
    .sort((a, b) => b.area - a.area)
    .slice(0, count)
    .sort((a, b) => a.r.x - b.r.x);
  if (main.length < count) throw new Error(`포즈 ${count}개를 기대했는데 ${main.length}개만 보입니다`);
  const mainIds = new Set(main.map((m) => m.id));
  const owner = new Int32Array(rects.length).fill(-1);
  rects.forEach((r, id) => {
    if (mainIds.has(id)) {
      owner[id] = main.findIndex((m) => m.id === id);
      return;
    }
    const touchesEdge = r.y === 0 || r.y + r.h >= h;
    if (isLine(r) || touchesEdge) return;
    const cx = r.x + r.w / 2;
    let best = 0;
    main.forEach((m, k) => {
      if (Math.abs(m.r.x + m.r.w / 2 - cx) < Math.abs(main[best].r.x + main[best].r.w / 2 - cx)) best = k;
    });
    owner[id] = best;
  });
  const out = main.map((m) => ({ ...m.r }));
  for (let i = 0; i < w * h; i++) {
    const id = label[i];
    if (id < 0) continue;
    const k = owner[id];
    if (k < 0) {
      data[i * 4 + 3] = 0;
      continue;
    }
    const x = i % w;
    const y = (i - x) / w;
    const r = out[k];
    const nx0 = Math.min(r.x, x);
    const ny0 = Math.min(r.y, y);
    r.w = Math.max(r.x + r.w, x + 1) - nx0;
    r.h = Math.max(r.y + r.h, y + 1) - ny0;
    r.x = nx0;
    r.y = ny0;
  }
  return out;
}

/**
 * 투명한 곳에 붙어 남은 밝은 무채색 테두리(체크무늬 찌꺼기)를 passes번 걷어 낸다.
 * 고양이 밝은 테두리선은 분홍·살구빛이라 채도가 있어 남는다.
 */
export function defringeLight(img: Pixels, passes = 2, minLum = 150, maxChroma = 28): void {
  const { width: w, height: h, data } = img;
  for (let p = 0; p < passes; p++) {
    const clear: number[] = [];
    for (let i = 0; i < w * h; i++) {
      if (data[i * 4 + 3] === 0) continue;
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      if ((r + g + b) / 3 < minLum || Math.max(r, g, b) - Math.min(r, g, b) > maxChroma) continue;
      const x = i % w;
      const nearClear = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i >= w ? i - w : -1, i < w * (h - 1) ? i + w : -1].some(
        (j) => j < 0 || data[j * 4 + 3] === 0,
      );
      if (nearClear) clear.push(i);
    }
    for (const i of clear) data[i * 4 + 3] = 0;
  }
}
