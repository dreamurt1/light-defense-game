// 기기별 설정: 배경음악·효과음·진동·닉네임·PC 화면 방향(2026-11-06)·스틱 좌우(2026-11-13). localStorage에 저장한다.
// 소리(audio/Sound.ts)·진동(audio/Haptics.ts)·스틱(ui/Sticks.ts)은 onSettingsChange로 바뀐 값을 바로 받는다.
import { DEFAULT_NICKNAME } from './RunState';
import type { OrientationPref } from './layout';

const KEY = 'ld.settings.v1';
/** 닉네임 최대 글자 수 (제안: 기획서에 없음) */
export const NICKNAME_MAX = 12;

export interface SettingsData {
  bgm: boolean;
  sfx: boolean;
  vibration: boolean;
  nickname: string;
  /** PC에서 고른 화면 방향 (휴대폰은 기기 방향을 따른다). 기본 가로 = 창을 꽉 채움 */
  orientation: OrientationPref;
  /** 스틱 좌우 바꾸기: true면 이동 스틱이 오른쪽, 빛 스틱이 왼쪽 (2026-11-13) */
  sticksSwapped: boolean;
}

const DEFAULTS: SettingsData = {
  bgm: true,
  sfx: true,
  vibration: true,
  nickname: DEFAULT_NICKNAME,
  orientation: 'landscape',
  sticksSwapped: false,
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
    return { ...DEFAULTS, ...parsed, nickname: cleanNickname(parsed.nickname ?? DEFAULTS.nickname) };
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

/** 앞뒤 공백을 지우고 최대 길이로 자른다. 비면 기본 닉네임 */
export function cleanNickname(name: string): string {
  const trimmed = [...name.trim()].slice(0, NICKNAME_MAX).join('');
  return trimmed || DEFAULT_NICKNAME;
}
