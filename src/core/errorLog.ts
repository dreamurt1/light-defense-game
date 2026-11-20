// 잡은 오류 기록 (2026-11-20 라이언: 휴대폰에서 판이 멈춤 — 두 스틱은 움직이는데 화면만 멎음).
// Phaser는 한 프레임에서 예외가 나면 다음 프레임을 아예 예약하지 않아 판이 영영 멈춘다(RequestAnimationFrame.step이 호출 뒤에 예약).
// 그래서 프레임·이벤트에서 난 예외는 여기로 모아 콘솔에 남기고 게임은 계속 돈다(core/frameLimit.ts, core/events.ts).
// 휴대폰에서만 나는 오류를 볼 수 있게 마지막 몇 개를 localStorage에 남기고, ?debug 화면(ui/DebugOverlay.ts)이 보여 준다. 개인 정보는 담지 않는다.

const KEY = 'ld.errors.v1';
const KEEP = 12;

export interface LoggedError {
  /** 처음 난 시각 (ISO) */
  at: string;
  where: string;
  message: string;
  /** 스택 앞 몇 줄 */
  stack: string;
  /** 같은 오류가 이어서 난 횟수 */
  count: number;
}

type Listener = (list: readonly LoggedError[]) => void;
const listeners = new Set<Listener>();
let list: LoggedError[] = load();

function load(): LoggedError[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LoggedError[]).slice(-KEEP) : [];
  } catch {
    return [];
  }
}

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-KEEP)));
  } catch {
    // 저장이 막힌 브라우저는 이번 방문 동안만
  }
}

/** 오류 한 건 (같은 곳·같은 문구가 이어지면 횟수만 늘린다 — 매 프레임 같은 오류로 저장소가 넘치지 않게) */
export function reportError(err: unknown, where: string): void {
  const e = err instanceof Error ? err : new Error(String(err));
  const message = e.message || String(err);
  const last = list[list.length - 1];
  if (last && last.where === where && last.message === message) {
    last.count++;
    // 같은 오류가 아주 많이 반복되면 저장은 가끔만
    if (last.count % 30 === 1) save();
  } else {
    const stack = (e.stack ?? '').split('\n').slice(0, 4).join('\n');
    list.push({ at: new Date().toISOString(), where, message, stack, count: 1 });
    if (list.length > KEEP) list = list.slice(-KEEP);
    save();
    console.error(`[${where}]`, e);
  }
  for (const fn of listeners) fn(list);
}

export function loggedErrors(): readonly LoggedError[] {
  return list;
}

export function clearErrors(): void {
  list = [];
  save();
  for (const fn of listeners) fn(list);
}

export function onErrorsChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 프레임 밖(타이머·DOM 이벤트)에서 난 처리되지 않은 오류도 남긴다 */
export function installGlobalErrorLog(): void {
  addEventListener('error', (ev) => reportError(ev.error ?? ev.message, 'window'));
  addEventListener('unhandledrejection', (ev) => reportError(ev.reason, 'promise'));
}
