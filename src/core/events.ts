// 시스템 간 결합은 이 이벤트로만 한다. 게임 로직은 발행만 하고 연출(HUD·소리·진동)은 구독만 한다.
// 2026-11-12 새 기획(XMind 1112): 손 등불 HP·시너지 이벤트를 걷어 내고 주인공 HP·하트·LP·중앙 광원·등불 이벤트를 더했다.
import type { CharacterId, EnemyId, EnemyKind, NightPhase } from '../data';
import type { EndReason, StageOutcome } from '../systems/stageOutcome';

export type Outcome = StageOutcome;

export interface RunResult {
  /** victory = 기본 승리, complete = 완전 승리, over = 오늘은 여기까지 */
  outcome: Outcome;
  reason: EndReason;
  stageId: string;
  score: number;
  survivedSec: number;
  /** 구출한 잃어버린 주민 */
  rescued: number;
  /** 돌려보낸 어둠의 호스틸 */
  retreated: number;
  stationsLit: number;
  stationsTotal: number;
  heartsLeft: number;
  maxCombo: number;
  characterId: CharacterId;
  seed: number;
  continued: boolean;
}

export type ComboReason = 'gain' | 'timeout';

export interface GameEvents {
  'light:cast': { x: number; y: number; angle: number; range: number; characterId: CharacterId };
  'light:ready': undefined;
  'enemy:hit': { uid: number; enemyId: EnemyId; remainingHp: number };
  /** 빛으로 처리됨: 잃어버린 주민은 구출(마을로 귀환), 호스틸은 맵 밖으로 돌아감 */
  'enemy:returned': { enemyId: EnemyId; kind: EnemyKind; x: number; y: number; score: number; combo: number };
  // windowSec: HUD 유지 시간 링이 시간을 알아야 해서 덧붙임
  'combo:change': { combo: number; multiplier: number; reason: ComboReason; windowSec: number };
  /** 주인공 HP·하트 */
  'player:vitals': { hp: number; maxHp: number; hearts: number; maxHearts: number };
  'player:hurt': { hp: number; by: EnemyId };
  /** 하트를 잃고 쓰러짐 (남은 하트) */
  'player:down': { hearts: number };
  'player:respawn': undefined;
  /** 빛 자원 */
  'lp:change': { value: number; min: number; max: number };
  /** 중앙 광원 광도 (= HP) */
  'central:change': { value: number; max: number; outAt: number };
  'central:hit': { value: number; by: EnemyId };
  /** 등불 스테이션: 켜진 수 / 전체 */
  'station:change': { lit: number; total: number };
  'station:lit': { x: number; y: number; allLit: boolean };
  'item:spawn': { itemId: string; x: number; y: number };
  'item:pickup': { itemId: string; x: number; y: number };
  'night:phase': { phase: NightPhase; t: number };
  'witch:spawn': undefined;
  'witch:returned': undefined;
  'game:over': { result: RunResult };
  'game:clear': { result: RunResult };

  // DOM HUD가 매 프레임 폴링하지 않도록 필요한 최소 이벤트
  'run:start': { seed: number; characterId: CharacterId; stageId: string; durationSec: number; /** 홈의 테스트 판 */ test: boolean };
  'run:pause': { paused: boolean };
  'night:tick': { t: number; durationSec: number };
  'score:change': { score: number; gained: number };
  /** UI → 게임 명령 */
  'ui:pause-toggle': undefined;
  'ui:restart': undefined;
  // 아래는 화면 이동용 (2026-10-30 화면 레이아웃 추가)
  'ui:assets-ready': undefined;
  /** 스플래시 불러오기 막대 (0~1) */
  'ui:load-progress': { value: number };
  'ui:navigate': { to: ScreenId };
  /** 선택 화면의 `등불을 켜요` */
  'ui:start-run': undefined;
  /** 홈의 `테스트`: 같은 마을, 이웃 없음, 시간 제한 없음 (2026-11-06 라이언 지시) */
  'ui:start-test': undefined;
  /** 화면 방식이 바뀜 (세로 ↔ 가로, 2026-11-06) */
  'ui:layout': { layout: 'portrait' | 'landscape' };
  'ui:open-settings': undefined;
  /** 설정 시트가 열리고 닫힘 (열려 있는 동안 ESC가 일시정지를 풀지 않게) */
  'ui:settings': { open: boolean };
  /** 보스 체력 (제안: 이벤트 표에 없음 — 보스 체력바용, 노월 동작은 M2) */
  'boss:hp': { hp: number; maxHp: number };
  // 두 스틱 조작 (2026-11-04 라이언 지시). DOM 스틱 → 게임
  /** 이동 스틱: 길이 0~1 벡터 (놓으면 0,0) */
  'input:move': { x: number; y: number };
  /** 빛 스틱을 끄는 동안 겨누는 방향과 끈 정도(0~1, 원뿔 반지름 = 사거리 × power). active=false면 범위 표시를 끈다 */
  'input:aim': { active: boolean; angle: number; power: number };
  /** 빛 스틱을 놓음: angle이 null이면 반자동(사거리 안 가장 가까운 적, 없으면 쏘지 않음), 아니면 power만큼 */
  'input:fire': { angle: number | null; power?: number };
}

export type ScreenId = 'home' | 'select' | 'shop' | 'ranking' | 'play';

type Handler<T> = (payload: T) => void;

export class EventBus<E extends object> {
  private handlers = new Map<keyof E, Set<Handler<never>>>();

  on<K extends keyof E>(event: K, handler: Handler<E[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<never>);
    return () => this.off(event, handler);
  }

  off<K extends keyof E>(event: K, handler: Handler<E[K]>): void {
    this.handlers.get(event)?.delete(handler as Handler<never>);
  }

  emit<K extends keyof E>(event: K, ...args: E[K] extends undefined ? [] : [E[K]]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of [...set]) (handler as Handler<E[K] | undefined>)(args[0]);
  }
}

export type GameBus = EventBus<GameEvents>;

/** 게임 전체가 공유하는 버스 */
export const bus: GameBus = new EventBus<GameEvents>();
