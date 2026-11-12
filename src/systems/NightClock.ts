// 스테이지 시계 (순수 로직). 길이는 스테이지(stages.json, 약 100초 — 끝 = 아침), 하늘빛 시간대는 비율(game.json stage.phases).
// predawn = 클라이맥스(진행 70%부터). 일시정지는 update를 부르지 않는 것으로 처리한다.
import type { GameBus } from '../core/events';
import type { NightPhase, PhaseId } from '../data';

export interface NightCfg {
  durationSec: number;
  /** 시간대별 [시작, 끝] 초 */
  phases: Record<PhaseId, [number, number]>;
}

/** HUD 진행 바 갱신 간격 (제안: 기획서에 없음) */
export const NIGHT_TICK_SEC = 0.25;

export function phaseAt(t: number, cfg: NightCfg): NightPhase {
  if (t >= cfg.durationSec) return 'dawn';
  for (const id of Object.keys(cfg.phases) as PhaseId[]) {
    const [from, to] = cfg.phases[id];
    if (t >= from && t < to) return id;
  }
  return 'predawn';
}

export class NightClock {
  t = 0;
  phase: NightPhase = 'dusk';
  private tickAcc = 0;

  constructor(
    private readonly cfg: NightCfg,
    private readonly bus?: GameBus,
  ) {}

  get durationSec(): number {
    return this.cfg.durationSec;
  }

  /** 0~1 */
  get progress(): number {
    return Math.min(1, this.t / this.cfg.durationSec);
  }

  /** 아침(스테이지 끝) */
  get isDawn(): boolean {
    return this.phase === 'dawn';
  }

  /** 클라이맥스(새벽 전) */
  get climax(): boolean {
    return this.phase === 'predawn';
  }

  /** 판 시작 시 한 번. 첫 시간대와 진행 0을 알린다 */
  start(): void {
    this.t = 0;
    this.tickAcc = 0;
    this.phase = phaseAt(0, this.cfg);
    this.bus?.emit('night:phase', { phase: this.phase, t: 0 });
    this.bus?.emit('night:tick', { t: 0, durationSec: this.cfg.durationSec });
  }

  update(dt: number): void {
    if (this.isDawn) return;
    this.t = Math.min(this.cfg.durationSec, this.t + dt);

    this.tickAcc += dt;
    if (this.tickAcc >= NIGHT_TICK_SEC || this.t >= this.cfg.durationSec) {
      this.tickAcc = 0;
      this.bus?.emit('night:tick', { t: this.t, durationSec: this.cfg.durationSec });
    }

    const next = phaseAt(this.t, this.cfg);
    if (next !== this.phase) {
      this.phase = next;
      this.bus?.emit('night:phase', { phase: next, t: this.t });
    }
  }
}
