// 아침 화면 '다음 밤' 미리 보기 (2026-11-24 구조 보강 ①, 라이언 확정) — 순수 로직
// "다음 밤: {구간} · 등불 {n} · 적이 조금 더 거세요"(다음 밤 보통 동시 최대가 오늘보다 크면) / "… · 오늘과 비슷해요"
// 구출 밤 예정은 밝히지 않는다 — 적 비교는 구출 배율이 없는 같은 런(토리·도토가 함께인 셈)으로
import { GameData, type NightsDef } from '../data';
import { rulesForNight, type RunInfo } from './nightRules';

export interface NightPreview {
  band: string;
  stations: number;
  harder: boolean;
}

export function nextNightPreview(run: RunInfo, next: number, nights: NightsDef = GameData.nights): NightPreview {
  const calm: RunInfo = { ...run, friendNights: { tori: 1, doto: 1 }, witchSeen: true };
  const today = rulesForNight(Math.max(1, next - 1), calm, {}, nights).spawn.normal.maxAlive;
  const tomorrow = rulesForNight(next, calm, {}, nights).spawn.normal.maxAlive;
  const real = rulesForNight(next, run, {}, nights);
  return { band: real.bandName ?? '', stations: real.stations, harder: tomorrow > today };
}

export function previewLine(p: NightPreview): string {
  return `다음 밤: ${p.band} · 등불 ${p.stations} · ${p.harder ? '적이 조금 더 거세요' : '오늘과 비슷해요'}`;
}
