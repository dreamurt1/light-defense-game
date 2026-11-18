// 패시브 분노 → 호스틸 증가 (2026-11-18 라이언: "공격을 하지 않는 패시브 몹들은 여러 번 공격받을 시 호스틸이 느는 의도는 넣고") — 순수 로직
// 기획서 8절(XMind): 패시브를 공격해도 이득이 없고, 여러 번 공격하면 호스틸 몹이 늘어난다.
//  - 판 전체에서 패시브가 빛에 맞은 횟수를 센다(화난 뒤 맞아도 셈).
//  - hitsPerWave번마다 어둠 쪽에서 호스틸 무리가 한 번 더 몰려온다(maxWaves번까지). 수치는 game.json passive.anger*(제안)
export interface AngerCfg {
  hitsPerWave: number;
  maxWaves: number;
}

export class AngerMeter {
  private hits = 0;
  private waves = 0;

  constructor(private readonly cfg: AngerCfg) {}

  /** 패시브가 빛에 맞음. 이번에 호스틸 무리를 부를 차례면 그 무리 번호(1부터), 아니면 0 */
  hit(): number {
    this.hits += 1;
    if (this.waves >= this.cfg.maxWaves || this.hits % this.cfg.hitsPerWave !== 0) return 0;
    this.waves += 1;
    return this.waves;
  }

  get count(): number {
    return this.hits;
  }

  get wavesCalled(): number {
    return this.waves;
  }
}
