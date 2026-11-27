// 가벼운 모드 (2026-11-24 라이언: 삼성 태블릿에서 렉이 너무 심함) — 판 중에 실제로 그려진 프레임을 재서
// 3초 연속 초당 LOW_FPS 아래면 가벼운 모드로 바꾸고 그 기기에서 기억한다(다음부터 처음부터 가볍게).
//  - 가벼운 모드 = 초당 30번으로 고르게 묶음(GPU 일 절반 — 들쭉날쭉한 40~50보다 고른 30이 덜 끊겨 보임) + 판 위 HUD 그림자 필터 끔(CSS data-perf)
//    + 빛 층(VillageStage litTexture)을 가로·세로 절반 해상도로 그려 2배로 늘려 올림(2026-11-25 2단계 — 그 층 안의 전체 화면 칠하기 4~5번이 1/4로).
//  - 원인(헤드리스 측정): CPU·DOM 다시 칠하기는 휴대폰과 같고, 화면 전체 층을 프레임마다 여러 번 칠하는 GPU 채우기 + 큰 화면 합성이
//    보급형 태블릿 GPU의 한계를 넘는다. 휴대폰처럼 잘 도는 기기는 그대로(60).
//  - ?lite = 강제로 켬, ?lite=off = 기억 지우고 끔(점검용). 페이지가 가려졌거나 판이 아니면 재지 않는다.
import type Phaser from 'phaser';

const KEY = 'ld.perf.v1';
/** 이 아래로 3초 연속이면 가벼운 모드 */
export const LOW_FPS = 50;
export const LOW_SECONDS = 3;
export const LITE_FPS = 30;
export const FULL_FPS = 60;
/** 가벼운 모드의 빛 층 해상도 (가로·세로 배율, 제안) */
export const LITE_LIT_RES = 0.5;

/** 빛 층 해상도 배율: 가벼운 모드면 절반, 아니면 화면 그대로 */
export function litResolution(liteOn: boolean): number {
  return liteOn ? LITE_LIT_RES : 1;
}

/** 1초마다: 지금 1초에 그린 프레임 수로 '낮음' 연속 횟수를 갱신하고, 가벼운 모드로 바꿀지 */
export function nextLow(lowStreak: number, framesLastSecond: number, measuring: boolean): { streak: number; goLite: boolean } {
  if (!measuring) return { streak: 0, goLite: false };
  const streak = framesLastSecond < LOW_FPS ? lowStreak + 1 : 0;
  return { streak, goLite: streak >= LOW_SECONDS };
}

let lite = false;

/** 게임을 만들기 전: 이 기기가 가벼운 모드로 기억돼 있거나 ?lite인가 (PC 선명도 배율을 1로 — core/renderZoom.ts) */
export function savedLite(): boolean {
  const q = new URLSearchParams(location.search).get('lite');
  if (q !== null) return q !== 'off';
  try {
    return localStorage.getItem(KEY) === 'lite';
  } catch {
    return false;
  }
}

export function isLite(): boolean {
  return lite;
}

interface LoopLike {
  _limitRate: number;
}

function apply(game: Phaser.Game, on: boolean): void {
  lite = on;
  // core/frameLimit.ts의 stepLimitFPS가 _limitRate로 돌릴지 정한다 — 바꾸면 바로 초당 30번
  (game.loop as unknown as LoopLike)._limitRate = 1000 / (on ? LITE_FPS : FULL_FPS);
  if (on) document.documentElement.dataset.perf = 'lite';
  else delete document.documentElement.dataset.perf;
}

/** 게임이 준비된 뒤 한 번 */
export function installPerfGuard(game: Phaser.Game): void {
  const q = new URLSearchParams(location.search).get('lite');
  let saved = false;
  try {
    if (q === 'off') localStorage.removeItem(KEY);
    saved = localStorage.getItem(KEY) === 'lite';
  } catch {
    // 저장소를 못 쓰면 이번 판만
  }
  apply(game, q !== null && q !== 'off' ? true : saved);
  let frames = 0;
  game.events.on('postrender', () => frames++);
  let streak = 0;
  window.setInterval(() => {
    const count = frames;
    frames = 0;
    if (lite) return;
    const measuring = document.visibilityState === 'visible' && document.documentElement.dataset.screen === 'play';
    const r = nextLow(streak, count, measuring);
    streak = r.streak;
    if (!r.goLite) return;
    apply(game, true);
    try {
      localStorage.setItem(KEY, 'lite');
    } catch {
      // 기억 못 해도 이번엔 가볍게
    }
  }, 1000);
}
