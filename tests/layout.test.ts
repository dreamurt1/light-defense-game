import { describe, expect, it } from 'vitest';
import { pickLayout, viewSize } from '../src/core/layout';
import { GameData } from '../src/data';

const VP = GameData.game.viewport;
const RULES = { portrait: { width: VP.width, height: VP.height }, landscape: VP.landscape };

describe('화면 방식 (세로·가로)', () => {
  it('휴대폰은 기기 방향, PC는 설정을 따른다', () => {
    expect(pickLayout({ coarse: true, width: 390, height: 844, pref: 'landscape' })).toBe('portrait');
    expect(pickLayout({ coarse: true, width: 844, height: 390, pref: 'portrait' })).toBe('landscape');
    expect(pickLayout({ coarse: false, width: 1920, height: 1080, pref: 'portrait' })).toBe('portrait');
    expect(pickLayout({ coarse: false, width: 1920, height: 1080, pref: 'landscape' })).toBe('landscape');
    // PC 가로 설정이어도 세로로 긴 창이면 세로로 꽉 채운다
    expect(pickLayout({ coarse: false, width: 600, height: 1000, pref: 'landscape' })).toBe('portrait');
  });

  it('세로는 540×960 그대로', () => {
    expect(viewSize('portrait', 390, 844, RULES)).toEqual({ width: 540, height: 960 });
  });

  it('가로는 짧은 변 540 고정, 긴 변만 화면 비율 (프레임만 바뀜)', () => {
    expect(viewSize('landscape', 1920, 1080, RULES)).toEqual({ width: 960, height: 540 });
    expect(viewSize('landscape', 844, 390, RULES).height).toBe(540);
    expect(viewSize('landscape', 844, 390, RULES).width).toBe(1168);
  });

  it('너무 좁거나 넓은 창은 4:3 ~ 21:9로 자른다', () => {
    expect(viewSize('landscape', 800, 800, RULES).width).toBe(VP.landscape.minWidth);
    expect(viewSize('landscape', 3440, 1000, RULES).width).toBe(VP.landscape.maxWidth);
  });
});
