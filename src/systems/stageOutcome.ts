// 스테이지 승패 (순수 로직, 2026-11-12 새 기획)
//  - 게임 오버: 하트 0(라이언: 0개가 되면 게임 오버) 또는 중앙 광원 꺼짐
//  - 시간이 다 되면(아침): 하트 1개 이상 + 광원이 켜져 있으면 기본 승리,
//    거기에 중앙 광원이 '밝음'(광도 = HP 비례 50) 이상이고 모든 등불이 켜져 있으면 완전 승리
//    (2026-11-14: 등불은 저절로 줄고 켜진 동안 다시 채울 수 없어 '밝음 이상'이 운에 달림 → '켜져 있음'으로, 제안)
import { BAND_BRIGHT, bandOf } from './lightLevel';

export type StageOutcome = 'victory' | 'complete' | 'over';
/** boss = 노월을 진정시킴, tutorial = 튜토리얼을 마침 (2026-11-13) */
export type EndReason = 'time' | 'hearts' | 'central' | 'boss' | 'tutorial';

export interface OutcomeInput {
  timeUp: boolean;
  hearts: number;
  centralOut: boolean;
  centralLevel: number;
  /** 각 등불이 켜져 있는지 */
  stationsOn: readonly boolean[];
  bands: readonly [number, number, number];
}

export function judgeStage(s: OutcomeInput): { outcome: StageOutcome; reason: EndReason } | null {
  if (s.hearts <= 0) return { outcome: 'over', reason: 'hearts' };
  if (s.centralOut) return { outcome: 'over', reason: 'central' };
  if (!s.timeUp) return null;
  const bright = (v: number) => bandOf(v, s.bands) >= BAND_BRIGHT;
  const complete = bright(s.centralLevel) && s.stationsOn.every(Boolean);
  return { outcome: complete ? 'complete' : 'victory', reason: 'time' };
}
