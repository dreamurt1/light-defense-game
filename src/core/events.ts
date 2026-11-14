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
  /** 2026-11-13 컨셉 시연판: 자비 받은 횟수, 쓴 아이템 수, 노월을 진정시켰는지 */
  mercy: number;
  itemsUsed: number;
  bossCalmed: boolean;
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
  /** 중앙 광원 HP (게이지, 2026-11-14 — 광도는 HP 비례) */
  'central:change': { hp: number; maxHp: number };
  'central:hit': { hp: number; by: EnemyId };
  /** 등불 스테이션: 켜진 수 / 전체 */
  'station:change': { lit: number; total: number };
  /** centralHeal = 켜진 덕에 오른 중앙 광원 HP (2026-11-14) */
  'station:lit': { x: number; y: number; allLit: boolean; centralHeal: number };
  /** 등불이 꺼짐 (다 타거나 적에게 맞아서, 2026-11-14) */
  'station:out': { x: number; y: number };
  'item:spawn': { itemId: string; x: number; y: number };
  'item:pickup': { itemId: string; x: number; y: number };
  /** 아이템을 씀 (효과 시간이 있으면 durationSec) */
  'item:use': { itemId: string; durationSec: number };
  /** 아이템 칸 (null = 빈 칸) */
  'item:slots': { slots: (string | null)[] };
  /** 자비: 패시브 주민을 공격하지 않고 지나감 */
  'mercy:gain': { enemyId: EnemyId; x: number; y: number; score: number };
  /** 패시브 주민이 빛에 맞아 화남 */
  'passive:upset': { enemyId: EnemyId; x: number; y: number };
  /** 빛을 잃은 친구(토리·도토)를 되찾음 → 해금 */
  'friend:rescued': { characterId: CharacterId };
  /** 노월이 어둠 구슬을 던지거나 박쥐를 부름 */
  'boss:attack': { kind: 'orb' | 'summon' };
  /** 풀숲에 너무 오래 있어 들킴 (2026-11-13 라이언) */
  'stealth:exposed': undefined;
  /** 튜토리얼 단계 (0부터, done = 끝) */
  /** 진행 저장이 바뀜 (튜토리얼·스테이지·친구) */
  'progress:change': undefined;
  'tutorial:step': { step: number; total: number; text: string; done: boolean };
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
  /** HUD 아이템 칸 누름 (0·1) */
  'ui:use-item': { slot: number };
  'ui:restart': undefined;
  // 아래는 화면 이동용 (2026-10-30 화면 레이아웃 추가)
  'ui:assets-ready': undefined;
  /** 스플래시 불러오기 막대 (0~1) */
  'ui:load-progress': { value: number };
  'ui:navigate': { to: ScreenId };
  /** 화면이 실제로 바뀜 (Router.go, 뒤로·앞으로가기 기록용, 2026-11-13) */
  'ui:screen': { to: ScreenId };
  /** 선택 화면의 `등불을 켜요` */
  'ui:start-run': undefined;
  /** 홈의 `테스트`: 같은 마을, 이웃 없음, 시간 제한 없음 (2026-11-06 라이언 지시) */
  'ui:start-test': undefined;
  /** 화면 방식이 바뀜 (세로 ↔ 가로, 2026-11-06) */
  'ui:layout': { layout: 'portrait' | 'landscape' };
  'ui:open-settings': undefined;
  /** 설정 시트 닫기 (뒤로가기, 2026-11-13) */
  'ui:close-settings': undefined;
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
