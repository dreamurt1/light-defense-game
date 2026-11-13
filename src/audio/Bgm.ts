// 배경음 (합성). 2026-11-13 라이언: D장조의 은은한 분위기로 바꿈, OneShot의 분위기(어둠 속 따뜻한 빛, 오르골·
// 부드러운 패드, 아련하지만 희망적인)를 참고 — 곡을 따라 하지 않고 분위기만. 선율은 새로 지었다(제안).
//  - menu  : 홈·메뉴. 느리게, 오르골 선율 + 성긴 분산 화음
//  - play  : 판. 조금 빠르게, 분산 화음이 조금 촘촘
//  - climax: 새벽 전(진행 70%~). 템포·밀도를 올리고 낮은 맥박을 더함
//  - calm  : 판이 끝난 뒤. 패드와 선율 첫 음만 작게
// 화음 진행 Dmaj9 → A/C# → Bm7 → F#m7 → Gmaj7 → D/F# → Em7 → A7 (화음 하나 = 8분음 16개, 한 바퀴 약 50초).
// 분산 화음의 쉼·옥타브는 고정 seed 난수(규칙: 난수는 core/rng.ts)로 정해 같은 마디가 되풀이돼도 덜 거슬리게.
import { Rng } from '../core/rng';
import { audio, midi } from './AudioEngine';

export type BgmMode = 'menu' | 'play' | 'climax' | 'calm';

interface Profile {
  bpm: number;
  level: number;
  /** 분산 화음 패턴 (화음 음 번호, -1 = 쉼) */
  pattern: number[];
  /** 분산 화음 음을 쉴 확률 */
  rest: number;
  arpGain: number;
  /** 오르골 선율 음량 (0 = 끔) */
  leadGain: number;
  /** calm: 화음마다 선율 첫 음만 */
  leadFirstOnly: boolean;
  padGain: number;
  padCutoff: number;
  /** 4분음마다 낮은 맥박 */
  pulse: boolean;
}

const PROFILES: Record<BgmMode, Profile> = {
  menu: {
    bpm: 60,
    level: 0.5,
    pattern: [0, -1, -1, 2, -1, -1, 1, -1, 3, -1, -1, 2, -1, -1, 4, -1],
    rest: 0.3,
    arpGain: 0.03,
    leadGain: 0.05,
    leadFirstOnly: false,
    padGain: 0.028,
    padCutoff: 900,
    pulse: false,
  },
  play: {
    bpm: 72,
    level: 0.42,
    pattern: [0, -1, 2, -1, 1, -1, 3, -1, 4, -1, 2, -1, 3, -1, 1, -1],
    rest: 0.2,
    arpGain: 0.03,
    leadGain: 0.04,
    leadFirstOnly: false,
    padGain: 0.026,
    padCutoff: 1000,
    pulse: false,
  },
  climax: {
    bpm: 92,
    level: 0.46,
    pattern: [0, 2, 1, 3, 2, 4, 3, 1, 0, 2, 4, 3, 2, 1, 3, 4],
    rest: 0.1,
    arpGain: 0.028,
    leadGain: 0.034,
    leadFirstOnly: false,
    padGain: 0.028,
    padCutoff: 1400,
    pulse: true,
  },
  calm: {
    bpm: 56,
    level: 0.3,
    pattern: [0, -1, -1, -1, -1, -1, -1, -1, 2, -1, -1, -1, -1, -1, -1, -1],
    rest: 0.4,
    arpGain: 0.022,
    leadGain: 0.04,
    leadFirstOnly: true,
    padGain: 0.026,
    padCutoff: 800,
    pulse: false,
  },
};

/** [8분음 위치, 음(MIDI), 길이(8분음 수)] */
type Note = [number, number, number];

/** D장조 화음: 패드(4성), 베이스, 분산 화음(5음, 4옥타브대), 오르골 선율(5옥타브대, 새로 지음) */
const CHORDS: { pad: number[]; bass: number; arp: number[]; lead: Note[] }[] = [
  // Dmaj9 — F#·E·D·A
  { pad: [62, 66, 69, 73], bass: 38, arp: [62, 66, 69, 73, 76], lead: [[0, 78, 6], [6, 76, 2], [8, 74, 4], [12, 69, 4]] },
  // A/C# — E·C#·B
  { pad: [61, 64, 69, 71], bass: 37, arp: [61, 64, 69, 71, 76], lead: [[0, 76, 6], [6, 73, 2], [8, 71, 8]] },
  // Bm7 — D·F#·A·F#
  { pad: [59, 62, 66, 69], bass: 35, arp: [59, 62, 66, 69, 74], lead: [[0, 74, 4], [4, 78, 4], [8, 81, 6], [14, 78, 2]] },
  // F#m7 — E·C#
  { pad: [57, 61, 64, 66], bass: 42, arp: [57, 61, 64, 66, 69], lead: [[0, 76, 8], [8, 73, 8]] },
  // Gmaj7 — B·A·F#·D
  { pad: [59, 62, 66, 67], bass: 43, arp: [59, 62, 66, 67, 71], lead: [[0, 83, 6], [6, 81, 2], [8, 78, 4], [12, 74, 4]] },
  // D/F# — A·F#·E·D
  { pad: [57, 62, 66, 69], bass: 42, arp: [57, 62, 66, 69, 74], lead: [[0, 81, 6], [6, 78, 2], [8, 76, 4], [12, 74, 4]] },
  // Em7 — G·F#·E·B
  { pad: [59, 62, 64, 67], bass: 40, arp: [59, 62, 64, 67, 71], lead: [[0, 79, 4], [4, 78, 4], [8, 76, 4], [12, 71, 4]] },
  // A7 — A·B·C#·E (다시 D로)
  { pad: [57, 61, 64, 67], bass: 45, arp: [57, 61, 64, 67, 69], lead: [[0, 69, 6], [6, 71, 2], [8, 73, 4], [12, 76, 4]] },
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
  private readonly rng = new Rng(0x2d3a7);
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
    // 패드: 저역 통과 + 아주 느린 흔들림 (숨 쉬듯)
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 900;
    this.padFilter.Q.value = 0.5;
    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    lfo.frequency.value = 0.05;
    lfoDepth.gain.value = 160;
    lfo.connect(lfoDepth);
    lfoDepth.connect(this.padFilter.frequency);
    lfo.start();
    this.padFilter.connect(this.out);
    // 오르골·분산 화음: 바로 + 넓은 메아리 (공간감)
    this.arpBus = ctx.createGain();
    this.arpBus.connect(this.out);
    const delay = ctx.createDelay(1.5);
    delay.delayTime.value = 0.42;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.34;
    const wet = ctx.createGain();
    wet.gain.value = 0.42;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2600;
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
    // 오르골 선율
    if (p.leadGain > 0) {
      for (const [at, note, len] of chord.lead) {
        if (at !== inChord || (p.leadFirstOnly && at !== 0)) continue;
        this.musicBox(note, t, Math.min(2.4, stepDur * len * 1.15), p.leadGain);
      }
    }
    // 분산 화음 (부드러운 펠트 피아노 느낌)
    const idx = p.pattern[inChord];
    if (idx >= 0 && !this.rng.chance(p.rest)) {
      const up = this.mode !== 'calm' && this.rng.chance(0.08) ? 12 : 0;
      audio.tone(midi(chord.arp[idx] + up), t, {
        type: 'triangle',
        gain: p.arpGain * (up ? 0.7 : 1),
        attack: 0.012,
        dur: Math.min(1.2, stepDur * 2.4),
        lowpass: 2200,
        bus: this.arpBus ?? undefined,
      });
    }
    if (p.pulse && inChord % 2 === 0) {
      audio.tone(midi(chord.bass + 12), t, { type: 'sine', gain: 0.04, attack: 0.02, dur: stepDur * 1.4, bus: this.out ?? undefined });
    }
  }

  /** 오르골 한 음: 맑은 사인 + 두 옥타브 위 짧은 '팅' + 살짝 어긋난 옥타브 반짝임 */
  private musicBox(note: number, t: number, dur: number, gain: number): void {
    const bus = this.arpBus ?? undefined;
    const f = midi(note);
    audio.tone(f, t, { type: 'sine', gain, attack: 0.004, dur, bus });
    audio.tone(f * 4, t, { type: 'sine', gain: gain * 0.16, attack: 0.002, dur: 0.22, bus });
    audio.tone(f * 2, t, { type: 'sine', gain: gain * 0.22, attack: 0.004, dur: dur * 0.45, detune: 4, bus });
  }

  /** 패드 화음 하나: 천천히 차오르고 다음 화음과 겹치며 사라진다 (삼각파 + 사인 베이스로 부드럽게) */
  private pad(notes: number[], bass: number, t: number, len: number, p: Profile): void {
    const ctx = audio.ctx;
    const out = this.padFilter;
    if (!ctx || !out) return;
    const env = ctx.createGain();
    const attack = Math.min(2, len * 0.3);
    const release = 2;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(p.padGain, t + attack);
    env.gain.setValueAtTime(p.padGain, t + len - 0.2);
    env.gain.exponentialRampToValueAtTime(0.0001, t + len + release);
    env.connect(out);
    const end = t + len + release + 0.05;
    const oscs: OscillatorNode[] = [];
    for (const n of notes) {
      for (const cents of [-5, 5]) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
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
    bg.gain.value = 2.4;
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
