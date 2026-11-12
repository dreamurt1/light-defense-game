// 맵 전체 광도 (순수 로직). 2026-11-06 라이언 지시(점점 빨리 밝아짐·피격하면 어두워짐)를
// 2026-11-12 새 기획(XMind 광도)에 맞춰 다시 짰다. 수치는 game.json village (제안).
//  - 밝아짐: 스테이지가 흐를수록 켜진 마을이 전체에 드러난다. 거듭제곱이라 처음엔 천천히, 아침에 가까울수록 빨리.
//    모든 등불이 켜져 있으면 buffMultiplier배(전체 활성 버프)
//  - 어두워짐(dip): 중앙 광원이 맞으면 크게, 루미가 맞으면 조금 하락. 클라이맥스에는 하락 폭이 커지고, 시간이 지나면 회복
//  - 화면: 밝아짐 − dip이 켜진 마을 드러남(lit), dip이 밝아짐보다 크면 그만큼 어둠 덮개(gloom)

export interface MoodConfig {
  brightenMax: number;
  brightenPower: number;
  buffMultiplier: number;
  centralHitDip: number;
  playerHitDip: number;
  climaxDipMultiplier: number;
  dipRecoverPerSec: number;
  dipMax: number;
  gloomPerDip: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** 켜진 마을이 전체에 드러나는 정도. progress = 스테이지 진행률 0~1, buff = 모든 등불이 켜짐 */
export function brightenAt(progress: number, cfg: MoodConfig, buff = false): number {
  return clamp01(cfg.brightenMax * Math.pow(clamp01(progress), cfg.brightenPower) * (buff ? cfg.buffMultiplier : 1));
}

export class MapLight {
  /** 피격으로 내려간 정도 (0~dipMax) */
  dip = 0;
  private brighten = 0;

  constructor(private readonly cfg: MoodConfig) {}

  hit(by: 'central' | 'player', climax: boolean): void {
    const base = by === 'central' ? this.cfg.centralHitDip : this.cfg.playerHitDip;
    this.dip = Math.min(this.cfg.dipMax, this.dip + base * (climax ? this.cfg.climaxDipMultiplier : 1));
  }

  update(dt: number, progress: number, buff: boolean): void {
    this.brighten = brightenAt(progress, this.cfg, buff);
    this.dip = Math.max(0, this.dip - this.cfg.dipRecoverPerSec * dt);
  }

  /** 켜진 마을이 드러나는 정도 0~1 */
  get lit(): number {
    return clamp01(this.brighten - this.dip);
  }

  /** 어둠 덮개 불투명도 */
  get gloom(): number {
    return clamp01(Math.max(0, this.dip - this.brighten) * this.cfg.gloomPerDip);
  }

  /** 맵 전체 광도를 0~100 광도로 (등불이 따르는 값) */
  get level(): number {
    return this.lit * 100;
  }
}
