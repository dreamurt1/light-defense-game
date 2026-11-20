// 기기별 설정: 배경음악·효과음·진동·닉네임·PC 화면 방향(2026-11-06)·스틱 좌우(2026-11-13)·음량·휴대폰 방향 고정(2026-11-19)·휴대폰 기본 전체 화면(2026-11-20).
// localStorage에 저장한다.
// 소리(audio/Sound.ts)·진동(audio/Haptics.ts)·스틱(ui/Sticks.ts)은 onSettingsChange로 바뀐 값을 바로 받는다.
import { DEFAULT_NICKNAME } from './RunState';
import type { OrientationPref, PhoneOrientation } from './layout';

const KEY = 'ld.settings.v1';
/** 닉네임 최대 글자 수 (제안: 기획서에 없음) */
export const NICKNAME_MAX = 12;

export interface SettingsData {
  bgm: boolean;
  sfx: boolean;
  /** 배경음악·효과음 음량 0~1 (켜기·끄기와 따로 기억, 2026-11-19) */
  bgmVolume: number;
  sfxVolume: number;
  vibration: boolean;
  nickname: string;
  /** PC에서 고른 화면 방향 (휴대폰은 기기 방향을 따른다). 기본 가로 = 창을 꽉 채움 */
  orientation: OrientationPref;
  /** 스틱 좌우 바꾸기: true면 이동 스틱이 오른쪽, 빛 스틱이 왼쪽 (2026-11-13) */
  sticksSwapped: boolean;
  /** 휴대폰 화면 방향 고정: auto = 기기 방향을 따름 (2026-11-19) */
  phoneOrientation: PhoneOrientation;
  /** 판 시작 전에 챙겨 갈 아이템 id (빛의 부적은 늘 함께), 안 챙기면 '' (2026-11-18) */
  carryItem: string;
  /** 상점에서 고른 빛 색 id (cosmetics.json, 2026-11-18) */
  lightColor: string;
  /** 휴대폰: 페이지를 연 뒤 첫 탭에서 전체 화면으로 (기본 켬, 2026-11-20 — ui/fullscreen.ts) */
  phoneFullscreen: boolean;
}

const DEFAULTS: SettingsData = {
  bgm: true,
  sfx: true,
  bgmVolume: 1,
  sfxVolume: 1,
  vibration: true,
  nickname: DEFAULT_NICKNAME,
  orientation: 'landscape',
  sticksSwapped: false,
  phoneOrientation: 'auto',
  carryItem: 'firefly_jar',
  lightColor: 'amber',
  phoneFullscreen: true,
};

type Listener = (data: Readonly<SettingsData>) => void;
const listeners = new Set<Listener>();

/** 설정이 저장될 때마다 불린다. 끊는 함수를 돌려준다 */
export function onSettingsChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function loadSettings(storage: Pick<Storage, 'getItem'> = localStorage): SettingsData {
  try {
    const raw = storage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<SettingsData>) : {};
    return {
      ...DEFAULTS,
      ...parsed,
      nickname: cleanNickname(parsed.nickname ?? DEFAULTS.nickname),
      bgmVolume: clamp01(parsed.bgmVolume, DEFAULTS.bgmVolume),
      sfxVolume: clamp01(parsed.sfxVolume, DEFAULTS.sfxVolume),
      phoneOrientation: PHONE_ORIENTATIONS.includes(parsed.phoneOrientation as PhoneOrientation) ? (parsed.phoneOrientation as PhoneOrientation) : 'auto',
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(data: SettingsData, storage: Pick<Storage, 'setItem'> = localStorage): void {
  try {
    storage.setItem(KEY, JSON.stringify(data));
  } catch {
    // 저장이 막힌 브라우저에서는 이번 방문 동안만 유지
  }
  const snapshot = { ...data };
  for (const fn of [...listeners]) fn(snapshot);
}

const PHONE_ORIENTATIONS: readonly PhoneOrientation[] = ['auto', 'portrait', 'landscape'];

function clamp01(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
}

/** 음량 슬라이더(0~1) → 실제 소리 크기: 귀는 로그로 듣기 때문에 제곱으로 (반쯤 = 약 −12dB, 2026-11-19 제안) */
export function volumeGain(v: number): number {
  const c = Math.min(1, Math.max(0, v));
  return c * c;
}

/** 앞뒤 공백을 지우고 최대 길이로 자른다. 비면 기본 닉네임 */
export function cleanNickname(name: string): string {
  const trimmed = [...name.trim()].slice(0, NICKNAME_MAX).join('');
  return trimmed || DEFAULT_NICKNAME;
}
