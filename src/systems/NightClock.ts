// 하룻밤 120초와 시간대 (순수 로직). 일시정지는 update를 부르지 않는 것으로 처리한다.
import type { GameBus } from '../core/events';
import type { GameConfig, NightPhase, PhaseId } from '../data';

type NightCfg = GameConfig['night'];

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

  get isDawn(): boolean {
    return this.phase === 'dawn';
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
