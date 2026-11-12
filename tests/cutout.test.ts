import { describe, expect, it } from 'vitest';
import { alphaBounds, containScale, hasOpaqueBackground, removeBackground, splitColumns, type Pixels } from '../src/art/cutout';

type RGBA = [number, number, number, number];

/** w×h 그림을 바탕색으로 채우고, paint(x, y)가 색을 돌려주는 곳만 칠한다 */
function image(w: number, h: number, bg: RGBA, paint: (x: number, y: number) => RGBA | null = () => null): Pixels {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) data.set(paint(x, y) ?? bg, (y * w + x) * 4);
  }
  return { data, width: w, height: h };
}

const alpha = (img: Pixels, x: number, y: number) => img.data[(y * img.width + x) * 4 + 3];
const MAGENTA: RGBA = [255, 0, 255, 255];
const CLEAR: RGBA = [0, 0, 0, 0];
const INK: RGBA = [30, 24, 40, 255];

describe('hasOpaqueBackground', () => {
  it('is true for a painted background and false for a transparent one', () => {
    expect(hasOpaqueBackground(image(8, 8, MAGENTA))).toBe(true);
    expect(hasOpaqueBackground(image(8, 8, CLEAR))).toBe(false);
  });
});

describe('removeBackground', () => {
  it('clears the background connected to the border and keeps the figure', () => {
    const img = image(10, 10, MAGENTA, (x, y) => (x >= 3 && x <= 6 && y >= 3 && y <= 6 ? INK : null));
    removeBackground(img);
    expect(alpha(img, 0, 0)).toBe(0);
    expect(alpha(img, 9, 5)).toBe(0);
    expect(alpha(img, 4, 4)).toBe(255);
  });

  it('keeps background-coloured pixels enclosed by the figure', () => {
    // 잉크 고리 안쪽의 마젠타는 테두리와 이어지지 않으므로 남는다
    const img = image(9, 9, MAGENTA, (x, y) => {
      const ring = x >= 2 && x <= 6 && y >= 2 && y <= 6;
      const hole = x === 4 && y === 4;
      return ring && !hole ? INK : null;
    });
    removeBackground(img);
    expect(alpha(img, 4, 4)).toBe(255);
    expect(alpha(img, 0, 4)).toBe(0);
  });

  it('makes a soft edge from colours between background and figure', () => {
    const mid: RGBA = [225, 25, 230, 255]; // 마젠타에서 조금 벗어난 가장자리 색
    const img = image(7, 7, MAGENTA, (x, y) => (x === 3 && y === 3 ? INK : x >= 2 && x <= 4 && y >= 2 && y <= 4 ? mid : null));
    removeBackground(img);
    const a = alpha(img, 2, 3);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(255);
    expect(alpha(img, 3, 3)).toBe(255);
  });
});

describe('alphaBounds', () => {
  it('finds the visible rectangle, optionally within a column span', () => {
    const img = image(12, 6, CLEAR, (x, y) => ((x === 2 && y === 1) || (x === 4 && y === 3) || (x === 9 && y === 5) ? INK : null));
    expect(alphaBounds(img)).toEqual({ x: 2, y: 1, w: 8, h: 5 });
    expect(alphaBounds(img, 10, { x0: 0, x1: 6 })).toEqual({ x: 2, y: 1, w: 3, h: 3 });
    expect(alphaBounds(image(4, 4, CLEAR))).toBeNull();
  });
});

describe('splitColumns', () => {
  const poses = (cols: number[]) => image(30, 4, CLEAR, (x) => (cols.includes(x) ? INK : null));

  it('splits poses separated by empty columns, left to right', () => {
    const img = poses([1, 2, 3, 10, 11, 12, 20, 21, 22]);
    expect(splitColumns(img, 3)).toEqual([
      { x0: 1, x1: 4 },
      { x0: 10, x1: 13 },
      { x0: 20, x1: 23 },
    ]);
  });

  it('merges stray bits (a loose sparkle) into the nearest pose', () => {
    const img = poses([1, 2, 3, 4, 5, 8, 15, 16, 17, 18, 19]);
    expect(splitColumns(img, 2)).toEqual([
      { x0: 1, x1: 9 },
      { x0: 15, x1: 20 },
    ]);
  });

  it('explains when there are fewer poses than expected', () => {
    expect(() => splitColumns(poses([1, 2, 3]), 2)).toThrow(/포즈 2개/);
  });
});

describe('containScale', () => {
  it('fits the largest pose into the box with one shared scale', () => {
    expect(containScale([{ w: 100, h: 200 }, { w: 150, h: 100 }], { w: 75, h: 75 })).toBeCloseTo(0.375);
  });
});
