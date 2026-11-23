// 런 저장 (2026-11-23 밤 나들이 v3): 런을 시작할 때와 아침마다 localStorage 'ld.run.v1'에 둔다.
// 런이 끝날 때(패배·집으로)만 지운다 → 밤 도중에 나가거나 새로고침하면 홈의 '이어서 하기 (밤 n)'로 그 밤을 처음부터.
// 저장이 막힌 브라우저(사생활 보호 모드 등)는 이번 방문 동안만 — 깨진 값은 없는 것으로(parseRun).
import { parseRun, type RunData } from '../systems/nightRun';

export const RUN_SAVE_KEY = 'ld.run.v1';

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function store(): Store | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function saveRun(run: RunData, s: Store | null = store()): void {
  try {
    s?.setItem(RUN_SAVE_KEY, JSON.stringify(run));
  } catch {
    // 저장 공간이 막힘: 이어서 하기 없이
  }
}

export function loadRun(s: Store | null = store()): RunData | null {
  try {
    return parseRun(s?.getItem(RUN_SAVE_KEY) ?? null);
  } catch {
    return null;
  }
}

export function clearRun(s: Store | null = store()): void {
  try {
    s?.removeItem(RUN_SAVE_KEY);
  } catch {
    // 무시
  }
}
