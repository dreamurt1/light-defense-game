// 랜덤 이벤트 (2026-11-18, 기획서 Phase 5 '랜덤 이벤트 및 간단한 세계관 장면') — 순수 로직: 판마다 무엇이 언제 일어날지 고른다.
// 정식 밤(튜토리얼·트라이얼 제외)에서 한 번, 진행 atMin~atMax 사이(seed).
//  - fireflies   반딧불 무리: 마을 한쪽에 반딧불이 모여 빛 고임이 생긴다 — 곁에 가면 LP가 등불 곁처럼 차오름
//  - lostParade  길 잃은 주민 행렬: 잃어버린 주민 여럿이 빛을 찾아 한꺼번에 온다 — 구출할 기회
//                (옛 키 parade — 2026-11-23 '어둠의 행렬'(패시브)과 이름이 겹쳐 바꿈, 동작 같음)
//  - gift        작은 화해: 이번 판에 자비를 베풀었으면, 지나쳐 준 주민이 등불지기 곁에 선물(아이템)을 두고 간다 — 공존의 메시지
//  - darkWind    어둠 바람: 잠깐 마을이 어두워지고 적이 빨라진다
// 2026-11-23 밤 나들이 v3: 무엇을 뺄지·가중치를 몇 배로 할지는 밤 규칙(systems/nightRules.ts eventMods)이 정한다 —
// 어둠 바람은 밤 2부터·밤 6부터 ×2, 지키는 길이면 어둠 바람 없음·작은 화해 ×2, 넓히는 길이면 반딧불 무리 없음.
export type RunEventKind = 'fireflies' | 'lostParade' | 'gift' | 'darkWind';

export interface RunEventCfg {
  atMin: number;
  atMax: number;
  weights: Record<RunEventKind, number>;
}

/** 그 밤에 뺄 이벤트와 가중치 배율 */
export interface EventMods {
  exclude?: readonly RunEventKind[];
  weightMul?: Partial<Record<RunEventKind, number>>;
}

export interface PlannedEvent {
  kind: RunEventKind;
  atProgress: number;
}

/** rand = 0~1 난수 함수(seed). 튜토리얼·끝없는 판이면 null */
export function planEvent(stage: { tutorial?: boolean; endless?: boolean; eventMods?: EventMods }, cfg: RunEventCfg, rand: () => number): PlannedEvent | null {
  if (stage.tutorial || stage.endless) return null;
  const mods = stage.eventMods ?? {};
  const weightOf = (k: RunEventKind) => (mods.exclude?.includes(k) ? 0 : cfg.weights[k] * (mods.weightMul?.[k] ?? 1));
  const kinds = (Object.keys(cfg.weights) as RunEventKind[]).filter((k) => weightOf(k) > 0);
  const total = kinds.reduce((s, k) => s + weightOf(k), 0);
  if (total <= 0) return null;
  let r = rand() * total;
  let kind = kinds[kinds.length - 1];
  for (const k of kinds) {
    r -= weightOf(k);
    if (r < 0) {
      kind = k;
      break;
    }
  }
  return { kind, atProgress: cfg.atMin + (cfg.atMax - cfg.atMin) * rand() };
}

/** 선물은 자비를 베푼 판에만 — 아니면 반딧불 무리로 바꾼다 */
export function resolveKind(kind: RunEventKind, mercyCount: number): RunEventKind {
  return kind === 'gift' && mercyCount < 1 ? 'fireflies' : kind;
}
