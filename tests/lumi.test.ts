import { describe, expect, it } from 'vitest';
import { blobs, colorToAlpha, feetCenterX, keepMainBlobs, removeCheckerboard, removeColors, type Pixels } from '../src/art/cutout';
import { angleOfDir, dirOf, follow, turnToward } from '../src/systems/facing';
import { packDir } from '../src/art/lumiSheet';

type RGBA = [number, number, number, number];

function image(w: number, h: number, bg: (x: number, y: number) => RGBA, paint: (x: number, y: number) => RGBA | null = () => null): Pixels {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(paint(x, y) ?? bg(x, y), (y * w + x) * 4);
  return { data, width: w, height: h };
}
const alpha = (img: Pixels, x: number, y: number) => img.data[(y * img.width + x) * 4 + 3];
const CAT: RGBA = [24, 18, 30, 255];
const RIM: RGBA = [240, 190, 170, 255];

describe('8방향', () => {
  it('각도를 가장 가까운 방향으로 나눈다 (화면 아래 = s)', () => {
    expect(dirOf(0)).toBe('e');
    expect(dirOf(Math.PI / 2)).toBe('s');
    expect(dirOf(-Math.PI / 2)).toBe('n');
    expect(dirOf(Math.PI)).toBe('w');
    expect(dirOf(Math.PI / 4 + 0.1)).toBe('se');
    expect(dirOf(-3 * Math.PI / 4)).toBe('nw');
    expect(dirOf(Math.PI * 4 + 0.01)).toBe('e');
  });

  it('방향의 가운데 각도', () => {
    expect(angleOfDir('s')).toBeCloseTo(Math.PI / 2);
    expect(dirOf(angleOfDir('ne'))).toBe('ne');
  });

  it('가장 짧은 쪽으로 돈다', () => {
    // 170° → -170°는 20°만 돌면 된다
    const a = turnToward((170 * Math.PI) / 180, (-170 * Math.PI) / 180, 0.5);
    expect((a * 180) / Math.PI).toBeCloseTo(180);
  });

  it('대기 팩의 각도(0° 정면, 시계 방향)를 게임 방향으로 바꾼다', () => {
    const pack = [0, 45, 90, 135, 180, 225, 270, 315].map(packDir);
    expect(pack).toEqual(['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw']);
  });

  it('보간 비율은 프레임 속도와 무관하다', () => {
    const one = follow(0.1, 0.1);
    const two = 1 - (1 - follow(0.05, 0.1)) ** 2;
    expect(one).toBeCloseTo(two);
    expect(follow(0.016, 0)).toBe(1);
  });
});

describe('배경 지우기 (LUMI 시트)', () => {
  it('판 색과 바닥 그림자 색을 함께 지우고 밝은 테두리 안의 검은 고양이는 남긴다', () => {
    const PANEL: RGBA = [36, 30, 62, 255];
    const SHADOW: RGBA = [72, 58, 110, 255];
    const img = image(
      12,
      12,
      () => PANEL,
      (x, y) => {
        if (y >= 9 && x >= 2 && x <= 9) return SHADOW;
        if (x === 3 || x === 8 || y === 2 || y === 8) return x >= 3 && x <= 8 && y >= 2 && y <= 8 ? RIM : null;
        return x > 3 && x < 8 && y > 2 && y < 8 ? CAT : null;
      },
    );
    removeColors(img, [PANEL.slice(0, 3) as [number, number, number], SHADOW.slice(0, 3) as [number, number, number]], 20, 20);
    expect(alpha(img, 0, 0)).toBe(0);
    expect(alpha(img, 5, 10)).toBe(0);
    expect(alpha(img, 5, 5)).toBe(255);
  });

  it('체크무늬 두 색을 모두 지운다', () => {
    const img = image(
      16,
      16,
      (x, y) => ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? [255, 255, 255, 255] : [204, 204, 204, 255]),
      (x, y) => (x >= 6 && x <= 9 && y >= 6 && y <= 9 ? CAT : null),
    );
    removeCheckerboard(img);
    expect(alpha(img, 0, 0)).toBe(0);
    expect(alpha(img, 5, 0)).toBe(0);
    expect(alpha(img, 7, 7)).toBe(255);
  });

  it('어두운 판 위의 빛은 투명도로 바뀐다', () => {
    const BG: [number, number, number] = [30, 26, 56];
    const img = image(2, 1, () => [30, 26, 56, 255], (x) => (x === 1 ? [255, 210, 90, 255] : null));
    colorToAlpha(img, BG);
    expect(alpha(img, 0, 0)).toBe(0);
    expect(alpha(img, 1, 0)).toBe(255);
  });

  it('작은 조각(남은 눈금선)은 지우고 큰 덩어리는 남긴다', () => {
    const img = image(20, 20, () => [0, 0, 0, 0], (x, y) => ((x >= 5 && x < 15 && y >= 5 && y < 15) || (x === 0 && y === 0) ? CAT : null));
    keepMainBlobs(img, 0.08);
    expect(alpha(img, 0, 0)).toBe(0);
    expect(alpha(img, 10, 10)).toBe(255);
  });

  it('발 가운데는 아래쪽 줄의 평균', () => {
    // 위는 오른쪽으로 치우친 꼬리, 아래(발)는 x 4~6
    const img = image(12, 20, () => [0, 0, 0, 0], (x, y) => ((y < 16 && x >= 4 && x <= 11) || (y >= 16 && x >= 4 && x <= 6) ? CAT : null));
    expect(feetCenterX(img, { x: 0, y: 0, w: 12, h: 20 })).toBeCloseTo(5);
  });
});

describe('blobs', () => {
  it('finds each separate piece and skips tiny specks', () => {
    const img = image(30, 10, () => [0, 0, 0, 0], (x, y) => ((x >= 2 && x <= 8 && y >= 2 && y <= 7) || (x >= 15 && x <= 25 && y >= 1 && y <= 8) || (x === 28 && y === 0) ? CAT : null));
    // 같은 줄(세로 차이 12 이하)이면 왼쪽부터
    expect(blobs(img, 5)).toEqual([
      { x: 2, y: 2, w: 7, h: 6 },
      { x: 15, y: 1, w: 11, h: 8 },
    ]);
  });
});

describe('pickPoses', () => {
  it('finds poses without a clean gap, drops grid lines and neighbour fragments, keeps a loose star', async () => {
    const { pickPoses } = await import('../src/art/cutout');
    const H = 20;
    const img = image(40, H, () => [0, 0, 0, 0], (x, y) => {
      if (y === 0) return CAT; // 위 눈금선
      if (x >= 2 && x <= 10 && y >= 4 && y <= 18) return CAT; // 포즈 1
      if (x >= 11 && x <= 20 && y >= 15 && y <= 16) return CAT; // 포즈 1·2를 잇는 낮은 그림자 → 이어져 한 덩어리가 되면 안 됨
      if (x >= 24 && x <= 32 && y >= 4 && y <= 18) return CAT; // 포즈 2
      if (x === 35 && y === 8) return CAT; // 떨어진 별 → 포즈 2에 붙음
      if (x >= 36 && x <= 38 && y >= 17) return CAT; // 아래 가장자리에 걸친 이웃 줄 조각
      return null;
    });
    const poses = pickPoses(img, 2);
    expect(poses).toHaveLength(2);
    expect(poses[1].x + poses[1].w).toBe(36);
    expect(alpha(img, 37, 19)).toBe(0);
    expect(alpha(img, 5, 0)).toBe(0);
  });
});

describe('defringeLight', () => {
  it('clears light grey fringe next to transparency but keeps the pink rim', async () => {
    const { defringeLight } = await import('../src/art/cutout');
    const GREY: RGBA = [210, 210, 212, 255];
    const img = image(5, 1, () => [0, 0, 0, 0], (x) => (x === 1 ? GREY : x === 3 ? RIM : x === 2 ? CAT : null));
    defringeLight(img);
    expect(alpha(img, 1, 0)).toBe(0);
    expect(alpha(img, 3, 0)).toBe(255);
    expect(alpha(img, 2, 0)).toBe(255);
  });
});
