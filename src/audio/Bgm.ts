// 배경음 (2026-11-13 컨셉 시연판, 합성): 잔잔한 패드 + 5음 음계(라 단조 펜타토닉) 아르페지오 + 메아리.
//  - menu  : 홈·메뉴. 느리고 성기게
//  - play  : 판. 조금 빠르고 촘촘하게
//  - climax: 새벽 전(진행 70%~). 템포·밀도를 올리고 낮은 맥박을 더함
//  - calm  : 판이 끝난 뒤. 패드만 작게
// 화음 진행 Am → F → C → G (화음 하나 = 8분음 16개). 같은 마디가 되풀이돼도 거슬리지 않게
// 음 몇 개를 고정 seed 난수로 쉬거나 한 옥타브 올린다(규칙: 난수는 core/rng.ts).
import { Rng } from '../core/rng';
import { audio, midi } from './AudioEngine';

export type BgmMode = 'menu' | 'play' | 'climax' | 'calm';

interface Profile {
  bpm: number;
  level: number;
  /** 패턴 (화음 음 번호, -1 = 쉼) */
  pattern: number[];
  /** 음을 쉴 확률 */
  rest: number;
  arpGain: number;
  padGain: number;
  padCutoff: number;
  /** 4분음마다 낮은 맥박 */
  pulse: boolean;
}

const PROFILES: Record<BgmMode, Profile> = {
  menu: {
    bpm: 62,
    level: 0.55,
    pattern: [0, -1, -1, 2, -1, -1, 1, -1, 3, -1, -1, -1, 2, -1, -1, -1],
    rest: 0.25,
    arpGain: 0.05,
    padGain: 0.035,
    padCutoff: 750,
    pulse: false,
  },
  play: {
    bpm: 80,
    level: 0.45,
    pattern: [0, -1, 2, -1, 1, -1, 3, -1, 4, -1, 2, -1, 3, -1, 1, -1],
    rest: 0.15,
    arpGain: 0.045,
    padGain: 0.03,
    padCutoff: 850,
    pulse: false,
  },
  climax: {
    bpm: 100,
    level: 0.5,
    pattern: [0, 2, 1, 3, 2, 4, 3, 1, 0, 2, 4, 3, 2, 1, 3, 4],
    rest: 0.08,
    arpGain: 0.04,
    padGain: 0.032,
    padCutoff: 1300,
    pulse: true,
  },
  calm: {
    bpm: 58,
    level: 0.3,
    pattern: [0, -1, -1, -1, -1, -1, -1, -1, 2, -1, -1, -1, -1, -1, -1, -1],
    rest: 0.4,
    arpGain: 0.035,
    padGain: 0.03,
    padCutoff: 650,
    pulse: false,
  },
};

/** 화음 (패드 음, 아르페지오 음 = 펜타토닉 안에서) */
const CHORDS: { pad: number[]; arp: number[]; bass: number }[] = [
  { pad: [57, 64, 67, 72], arp: [69, 72, 76, 79, 81], bass: 45 }, // Am
  { pad: [53, 60, 64, 69], arp: [69, 72, 74, 76, 81], bass: 41 }, // F
  { pad: [55, 60, 64, 67], arp: [72, 74, 76, 79, 84], bass: 48 }, // C
  { pad: [55, 62, 67, 71], arp: [67, 74, 76, 79, 81], bass: 43 }, // G
];

const STEPS_PER_CHORD = 16;
const LOOKAHEAD = 0.25;
const TICK_MS = 60;

export class Bgm {
  private mode: BgmMode = 'menu';
  private enabled = true;
  private ducked = false;
  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private readonly rng = new Rng(0x1d3a7);
  private out: GainNode | null = null;
  private arpBus: GainNode | null = null;
  private padFilter: BiquadFilterNode | null = null;

  constructor() {
    audio.whenReady((ctx) => {
      this.build(ctx);
      this.apply();
    });
  }

  setEnabled(on: boolean): void {
    if (this.enabled === on) return;
    this.enabled = on;
    this.apply();
  }

  setMode(mode: BgmMode): void {
    if (this.mode === mode) return;
    const wasCalm = this.mode === 'calm';
    this.mode = mode;
    // 판이 새로 시작되면 첫 화음부터
    if (mode === 'play' && wasCalm) this.step = 0;
    this.apply();
  }

  /** 일시정지: 작게 줄임 */
  duck(on: boolean): void {
    if (this.ducked === on) return;
    this.ducked = on;
    this.apply();
  }

  private build(ctx: AudioContext): void {
    if (!audio.bgm) return;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(audio.bgm);
    // 패드: 저역 통과 + 느린 흔들림
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 800;
    this.padFilter.Q.value = 0.7;
    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoDepth.gain.value = 180;
    lfo.connect(lfoDepth);
    lfoDepth.connect(this.padFilter.frequency);
    lfo.start();
    this.padFilter.connect(this.out);
    // 아르페지오: 바로 + 메아리
    this.arpBus = ctx.createGain();
    this.arpBus.connect(this.out);
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.36;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.3;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2400;
    this.arpBus.connect(delay);
    delay.connect(tone);
    tone.connect(feedback);
    feedback.connect(delay);
    tone.connect(wet);
    wet.connect(this.out);
  }

  /** 지금 상태(켜짐·모드·일시정지)를 음량과 스케줄러에 반영 */
  private apply(): void {
    const ctx = audio.ctx;
    if (!ctx || !this.out) return;
    const p = PROFILES[this.mode];
    const level = this.enabled ? p.level * (this.ducked ? 0.3 : 1) : 0;
    this.out.gain.setTargetAtTime(level, ctx.currentTime, this.enabled ? 0.6 : 0.15);
    this.padFilter?.frequency.setTargetAtTime(p.padCutoff, ctx.currentTime, 1.2);
    if (this.enabled && this.timer === null) {
      this.nextTime = ctx.currentTime + 0.1;
      this.timer = window.setInterval(() => this.tick(), TICK_MS);
    } else if (!this.enabled && this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick(): void {
    const ctx = audio.ctx;
    if (!ctx || ctx.state !== 'running') return;
    // 탭이 오래 가려졌다 돌아오면 밀린 음을 몰아 치지 않는다
    if (this.nextTime < ctx.currentTime - 0.5) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      this.playStep(this.nextTime);
      this.nextTime += 60 / PROFILES[this.mode].bpm / 2;
      this.step++;
    }
  }

  private playStep(t: number): void {
    const p = PROFILES[this.mode];
    const stepDur = 60 / p.bpm / 2;
    const inChord = this.step % STEPS_PER_CHORD;
    const chord = CHORDS[Math.floor(this.step / STEPS_PER_CHORD) % CHORDS.length];
    if (inChord === 0) this.pad(chord.pad, chord.bass, t, stepDur * STEPS_PER_CHORD, p);
    const idx = p.pattern[inChord];
    if (idx >= 0 && !this.rng.chance(p.rest)) {
      const up = this.mode !== 'calm' && this.rng.chance(0.08) ? 12 : 0;
      audio.tone(midi(chord.arp[idx] + up), t, {
        type: 'triangle',
        gain: p.arpGain * (up ? 0.7 : 1),
        attack: 0.01,
        dur: Math.min(1.1, stepDur * 2.2),
        lowpass: 3200,
        bus: this.arpBus ?? undefined,
      });
    }
    if (p.pulse && inChord % 2 === 0) {
      audio.tone(midi(chord.bass + 12), t, { type: 'sine', gain: 0.05, attack: 0.01, dur: stepDur * 1.4, bus: this.out ?? undefined });
    }
  }

  /** 패드 화음 하나: 천천히 차오르고 다음 화음과 겹치며 사라진다 */
  private pad(notes: number[], bass: number, t: number, len: number, p: Profile): void {
    const ctx = audio.ctx;
    const out = this.padFilter;
    if (!ctx || !out) return;
    const env = ctx.createGain();
    const attack = Math.min(1.4, len * 0.3);
    const release = 1.6;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(p.padGain, t + attack);
    env.gain.setValueAtTime(p.padGain, t + len - 0.2);
    env.gain.exponentialRampToValueAtTime(0.0001, t + len + release);
    env.connect(out);
    const end = t + len + release + 0.05;
    const oscs: OscillatorNode[] = [];
    for (const n of notes) {
      for (const cents of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = midi(n);
        o.detune.value = cents;
        o.connect(env);
        oscs.push(o);
      }
    }
    // 낮은 베이스 (사인, 부드럽게)
    const b = ctx.createOscillator();
    b.type = 'sine';
    b.frequency.value = midi(bass);
    const bg = ctx.createGain();
    bg.gain.value = 2.2;
    b.connect(bg);
    bg.connect(env);
    oscs.push(b);
    for (const o of oscs) {
      o.start(t);
      o.stop(end);
    }
    oscs[0].onended = () => env.disconnect();
  }
}
