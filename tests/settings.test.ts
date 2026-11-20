import { describe, expect, it } from 'vitest';
import { turnHint } from '../src/core/layout';
import { loadSettings, volumeGain } from '../src/core/Settings';
import { manifestEntries } from '../src/audio/Recorded';
import { autoFullscreenWanted } from '../src/ui/fullscreen';

const store = (v: unknown) => ({ getItem: () => (v === null ? null : JSON.stringify(v)) });

describe('설정: 음량·휴대폰 방향 (2026-11-19)', () => {
  it('예전 설정(음량 없음)은 음량 100%·방향 자동으로 읽고, 켜기·끄기는 그대로', () => {
    const s = loadSettings(store({ bgm: false, sfx: true, carryItem: 'wind_feather' }));
    expect(s.bgm).toBe(false);
    expect(s.bgmVolume).toBe(1);
    expect(s.sfxVolume).toBe(1);
    expect(s.phoneOrientation).toBe('auto');
    expect(s.carryItem).toBe('wind_feather');
  });

  it('음량은 0~1로 자르고, 이상한 방향 값은 자동으로', () => {
    const s = loadSettings(store({ bgmVolume: 3, sfxVolume: -1, phoneOrientation: 'upside' }));
    expect(s.bgmVolume).toBe(1);
    expect(s.sfxVolume).toBe(0);
    expect(s.phoneOrientation).toBe('auto');
    expect(loadSettings(store({ bgmVolume: 'loud' })).bgmVolume).toBe(1);
    expect(loadSettings(store({ phoneOrientation: 'landscape' })).phoneOrientation).toBe('landscape');
  });

  it('음량 슬라이더는 귀 곡선(제곱)으로: 0 → 0, 반 → 0.25, 끝 → 1', () => {
    expect(volumeGain(0)).toBe(0);
    expect(volumeGain(0.5)).toBe(0.25);
    expect(volumeGain(1)).toBe(1);
    expect(volumeGain(2)).toBe(1);
  });

  it('휴대폰에서 방향을 고정했는데 기기가 다른 방향이면 돌려 달라고 한다', () => {
    expect(turnHint({ coarse: true, width: 390, height: 844, lock: 'landscape' })).toBe('landscape');
    expect(turnHint({ coarse: true, width: 844, height: 390, lock: 'portrait' })).toBe('portrait');
    expect(turnHint({ coarse: true, width: 844, height: 390, lock: 'landscape' })).toBeNull();
    expect(turnHint({ coarse: true, width: 390, height: 844, lock: 'auto' })).toBeNull();
    // PC는 설정의 '가로 화면'을 따르므로 안내하지 않는다
    expect(turnHint({ coarse: false, width: 600, height: 1000, lock: 'landscape' })).toBeNull();
  });
});

describe('녹음 음원 목록 (audio/Recorded.ts)', () => {
  it('같은 폴더의 소리 파일만 받고, 설명(_)·경로·주소·다른 형식은 뺀다', () => {
    const list = manifestEntries({
      _note: 'x',
      bgm: { menu: 'bgm-menu.ogg', play: '../secret.ogg', _x: 'a.ogg' },
      sfx: { cast: 'cast.v2.mp3', hit: 'https://example.com/hit.mp3', pickup: 'pickup.txt', mercy: 7 },
    });
    expect(list).toEqual([
      { key: 'bgm:menu', file: 'bgm-menu.ogg' },
      { key: 'sfx:cast', file: 'cast.v2.mp3' },
    ]);
    expect(manifestEntries(null)).toEqual([]);
    expect(manifestEntries('nope')).toEqual([]);
    expect(manifestEntries({ bgm: {}, sfx: {} })).toEqual([]);
  });
});

describe('휴대폰 기본 전체 화면 (2026-11-20)', () => {
  it('기본은 켬, 끈 값은 기억한다', () => {
    expect(loadSettings(store({})).phoneFullscreen).toBe(true);
    expect(loadSettings(store({ phoneFullscreen: false })).phoneFullscreen).toBe(false);
  });

  it('첫 탭에서만, 휴대폰·켬·지원·아직 아닐 때만 들어간다', () => {
    const base = { coarse: true, pref: true, supported: true, active: false, tried: false };
    expect(autoFullscreenWanted(base)).toBe(true);
    expect(autoFullscreenWanted({ ...base, coarse: false })).toBe(false); // PC
    expect(autoFullscreenWanted({ ...base, pref: false })).toBe(false); // 설정에서 끔
    expect(autoFullscreenWanted({ ...base, supported: false })).toBe(false); // 아이폰 사파리
    expect(autoFullscreenWanted({ ...base, active: true })).toBe(false); // 이미 전체 화면
    expect(autoFullscreenWanted({ ...base, tried: true })).toBe(false); // 스스로 나간 뒤엔 다시 끌어들이지 않음
  });
});
