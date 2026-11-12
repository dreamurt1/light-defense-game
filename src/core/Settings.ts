// 기기별 설정: 배경음악·효과음·진동·닉네임·PC 화면 방향(2026-11-06). localStorage에 저장한다.
// 소리와 진동이 실제로 나는 것은 M4(AudioBus·Haptics)에서 이 값을 읽어 붙인다.
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
}

const DEFAULTS: SettingsData = { bgm: true, sfx: true, vibration: true, nickname: DEFAULT_NICKNAME, orientation: 'landscape' };

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
}

/** 앞뒤 공백을 지우고 최대 길이로 자른다. 비면 기본 닉네임 */
export function cleanNickname(name: string): string {
  const trimmed = [...name.trim()].slice(0, NICKNAME_MAX).join('');
  return trimmed || DEFAULT_NICKNAME;
}
