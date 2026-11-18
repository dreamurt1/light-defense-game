import { describe, expect, it } from 'vitest';
import { AngerMeter } from '../src/systems/anger';

describe('AngerMeter (패시브를 여러 번 맞히면 호스틸이 늘어남)', () => {
  it('맞힐 때마다 세고, hitsPerWave번째마다 무리를 부른다', () => {
    const a = new AngerMeter({ hitsPerWave: 2, maxWaves: 3 });
    expect(a.hit()).toBe(0);
    expect(a.hit()).toBe(1);
    expect(a.hit()).toBe(0);
    expect(a.hit()).toBe(2);
    expect(a.count).toBe(4);
  });

  it('maxWaves번까지만 부른다', () => {
    const a = new AngerMeter({ hitsPerWave: 1, maxWaves: 2 });
    expect([a.hit(), a.hit(), a.hit(), a.hit()]).toEqual([1, 2, 0, 0]);
    expect(a.wavesCalled).toBe(2);
  });

  it('한 번 맞힌 것으로는 늘지 않는다', () => {
    const a = new AngerMeter({ hitsPerWave: 2, maxWaves: 3 });
    expect(a.hit()).toBe(0);
    expect(a.wavesCalled).toBe(0);
  });
});
