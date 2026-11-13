// Web Audio 바탕 (2026-11-13 컨셉 시연판): 소리 파일 없이 오실레이터·잡음으로 합성한다.
//  - 브라우저 정책상 첫 사용자 입력(pointerdown·keydown) 뒤에 AudioContext를 만들고 resume한다(5절: 소리는 첫 입력 이후)
//  - 버스: master ← sfx(효과음), master ← bgm(배경음). 설정의 효과음·배경음 토글은 각 버스 음량으로 바로 반영
//  - 탭이 가려지면 컨텍스트를 멈춰 배터리를 아낀다
export interface ToneOpts {
  type?: OscillatorType;
  /** 최대 음량 (0~1, 버스 음량에 곱해짐) */
  gain?: number;
  attack?: number;
  /** 소리 길이(초): attack 뒤 지수 감쇠로 사라짐 */
  dur?: number;
  /** 끝 주파수로 미끄러짐 */
  glideTo?: number;
  /** 저역 통과 필터 */
  lowpass?: number;
  detune?: number;
  /** 연결할 버스 (기본 sfx) */
  bus?: AudioNode;
}

export interface NoiseOpts {
  gain?: number;
  dur?: number;
  attack?: number;
  /** 대역 통과 중심 주파수 */
  band?: number;
  q?: number;
  /** 진폭 떨림(Hz) — 바스락 */
  tremolo?: number;
}

type Ready = (ctx: AudioContext) => void;

export class AudioEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  sfx: GainNode | null = null;
  bgm: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private readonly ready: Ready[] = [];
  private sfxLevel = 1;
  private bgmLevel = 1;

  /** 첫 입력을 기다렸다가 컨텍스트를 연다 */
  install(): void {
    const unlock = () => {
      this.unlock();
      if (this.ctx?.state === 'running') {
        window.removeEventListener('pointerdown', unlock, true);
        window.removeEventListener('keydown', unlock, true);
        window.removeEventListener('touchend', unlock, true);
      }
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    // iOS 사파리는 touchend에서만 소리를 풀어 주는 경우가 있다
    window.addEventListener('touchend', unlock, true);
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend().catch(() => undefined);
      else void this.ctx.resume().catch(() => undefined);
    });
  }

  /** 컨텍스트가 준비되면 한 번 불린다 (이미 준비됐으면 바로) */
  whenReady(fn: Ready): void {
    if (this.ctx) fn(this.ctx);
    else this.ready.push(fn);
  }

  private unlock(): void {
    if (this.ctx) {
      if (this.ctx.state !== 'running' && !document.hidden) void this.ctx.resume().catch(() => undefined);
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    let ctx: AudioContext;
    try {
      ctx = new Ctor({ latencyHint: 'interactive' });
    } catch {
      return;
    }
    this.ctx = ctx;
    // 부드러운 리미터: 효과음이 겹쳐도 귀를 찌르지 않게
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(comp);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = this.sfxLevel;
    this.sfx.connect(this.master);
    this.bgm = ctx.createGain();
    this.bgm.gain.value = this.bgmLevel;
    this.bgm.connect(this.master);
    void ctx.resume().catch(() => undefined);
    for (const fn of this.ready.splice(0)) fn(ctx);
  }

  setSfx(on: boolean): void {
    this.sfxLevel = on ? 1 : 0;
    if (this.ctx && this.sfx) this.sfx.gain.setTargetAtTime(this.sfxLevel, this.ctx.currentTime, 0.03);
  }

  setBgm(level: number): void {
    this.bgmLevel = level;
    if (this.ctx && this.bgm) this.bgm.gain.setTargetAtTime(level, this.ctx.currentTime, 0.25);
  }

  get sfxOn(): boolean {
    return this.sfxLevel > 0 && this.ctx !== null && this.ctx.state === 'running';
  }

  get now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  /** 오실레이터 하나: 짧은 attack → 지수 감쇠 */
  tone(freq: number, at: number, opts: ToneOpts = {}): void {
    const ctx = this.ctx;
    const out = opts.bus ?? this.sfx;
    if (!ctx || !out) return;
    const { type = 'sine', gain = 0.1, attack = 0.008, dur = 0.25 } = opts;
    const t0 = Math.max(at, ctx.currentTime);
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.glideTo) osc.frequency.exponentialRampToValueAtTime(opts.glideTo, t0 + dur * 0.85);
    if (opts.detune) osc.detune.value = opts.detune;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + dur);
    let node: AudioNode = osc;
    if (opts.lowpass) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.lowpass;
      osc.connect(f);
      node = f;
    }
    node.connect(env);
    env.connect(out);
    osc.start(t0);
    osc.stop(t0 + attack + dur + 0.05);
    osc.onended = () => env.disconnect();
  }

  /** 걸러 낸 흰 잡음: 바스락·톡의 결 */
  noise(at: number, opts: NoiseOpts = {}): void {
    const ctx = this.ctx;
    const out = this.sfx;
    if (!ctx || !out) return;
    const { gain = 0.08, dur = 0.2, attack = 0.01, band = 2000, q = 1 } = opts;
    const t0 = Math.max(at, ctx.currentTime);
    if (!this.noiseBuf) {
      const len = Math.floor(ctx.sampleRate * 1);
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      // 잡음은 연출용이라 재현이 필요 없지만, 규칙(난수는 rng.ts만)을 지키려 단순 LCG로 채운다
      let s = 0x2f6b1d;
      for (let i = 0; i < len; i++) {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        data[i] = (s / 4294967296) * 2 - 1;
      }
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = band;
    f.Q.value = q;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + dur);
    src.connect(f);
    f.connect(env);
    if (opts.tremolo) {
      const trem = ctx.createGain();
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = opts.tremolo;
      depth.gain.value = 0.5;
      trem.gain.value = 0.5;
      lfo.connect(depth);
      depth.connect(trem.gain);
      env.connect(trem);
      trem.connect(out);
      lfo.start(t0);
      lfo.stop(t0 + attack + dur + 0.05);
    } else {
      env.connect(out);
    }
    src.start(t0, 0, attack + dur + 0.05);
    src.onended = () => env.disconnect();
  }
}

/** 게임 전체가 쓰는 소리 엔진 하나 */
export const audio = new AudioEngine();

/** 음이름 대신 반음 번호(A4 = 69)로 주파수 */
export function midi(n: number): number {
  return 440 * Math.pow(2, (n - 69) / 12);
}
