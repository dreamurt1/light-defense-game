// 런 문구 (2026-11-23 밤 나들이 v3, NIGHT_RUN.md 10절) — 아침 화면·결과·선택·상점이 함께 쓴다. 모두 "~요", 금지어 없음.
import type { RunPath } from '../systems/nightRules';

/** 숫자를 소리 내 읽을 때 끝에 받침이 있는가: 2(이)·4(사)·5(오)·9(구)만 받침 없음, 0(영·십·백)·1·3·6·7·8은 있음 */
export function numHasBatchim(n: number): boolean {
  const d = Math.abs(Math.trunc(n)) % 10;
  return ![2, 4, 5, 9].includes(d);
}

/** '밤 3이' / '밤 2가' */
export const nightSubject = (n: number): string => `밤 ${n}${numHasBatchim(n) ? '이' : '가'}`;
/** '밤 6을' / '밤 2를' */
export const nightObject = (n: number): string => `밤 ${n}${numHasBatchim(n) ? '을' : '를'}`;

/** 낱말 끝 받침 */
export function hasBatchim(word: string): boolean {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}

/** 두 길의 제목 (결과·아침), 색은 CSS [data-path] */
export const PATH_TITLE: Record<RunPath, string> = {
  keep: '조용한 밤을 지켰어요',
  expand: '빛이 멀리 뻗었어요',
  mixed: '빛과 어둠 사이를 걸었어요',
};

export const pathLine = (mercy: number, banished: number): string => `자비 ${mercy} · 돌려보낸 어둠의 주민 ${banished}`;

/** 아침 화면 하트·★ 줄 아래 '지금 길' 한 줄 — 그 길이 다음 밤에 뜻하는 것 (2026-11-24 구조 보강 ②, 색은 CSS [data-path]) */
export const PATH_NOW: Record<RunPath, string> = {
  keep: '지금 길: 지키는 길 — 조용한 밤',
  expand: '지금 길: 넓히는 길 — 어둠이 거세져요',
  mixed: '지금 길: 사이 — 아직 정하지 않았어요',
};

/** 행렬 패시브를 세 번 맞혀 돌려보냈을 때 토스트 (자비 쪽 '길을 터 줬어요'의 짝) */
export const BANISH_TOAST = '돌려보냈어요 · 빛이 멀리 뻗어요';
