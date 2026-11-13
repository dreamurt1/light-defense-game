// 효과음 + 배경음 + 진동을 버스 이벤트에 붙인다 (2026-11-13 컨셉 시연판, 5절 사운드).
// 소리 파일이 없어 전부 Web Audio 합성음이다. 짧고 부드럽게, 볼륨은 낮게(차분하고 은은한 톤).
// 게임 로직은 이벤트만 발행하고, 여기서는 구독만 한다. main.ts에서 installAudio()를 한 번 부른다.
import { bus } from '../core/events';
import { loadSettings, onSettingsChange, type SettingsData } from '../core/Settings';
import { audio, midi } from './AudioEngine';
import { Bgm } from './Bgm';
import { Haptics } from './Haptics';

/** 같은 소리가 한 프레임에 몰려 시끄러워지지 않게 최소 간격(초) */
const lastPlayed = new Map<string, number>();
function gate(key: string, gapSec: number): boolean {
  const now = audio.now;
  const last = lastPlayed.get(key) ?? -1;
  if (now - last < gapSec) return false;
  lastPlayed.set(key, now);
  return true;
}

/** 음 여러 개를 간격을 두고 */
function arpeggio(notes: number[], gapSec: number, opts: Parameters<typeof audio.tone>[2]): void {
  const t = audio.now;
  notes.forEach((n, i) => audio.tone(midi(n), t + i * gapSec, opts));
}

/** 종소리: 기본음 + 비정수 배음 (등불 점화) */
function bell(note: number, at: number, gain = 0.07, dur = 1.2): void {
  const f = midi(note);
  audio.tone(f, at, { type: 'sine', gain, attack: 0.004, dur });
  audio.tone(f * 2.76, at, { type: 'sine', gain: gain * 0.35, attack: 0.004, dur: dur * 0.5 });
  audio.tone(f * 5.4, at, { type: 'sine', gain: gain * 0.12, attack: 0.002, dur: dur * 0.25 });
}

export const Sfx = {
  /** 발사: 위로 반짝 */
  cast(): void {
    if (!gate('cast', 0.05)) return;
    const t = audio.now;
    audio.tone(midi(76), t, { type: 'triangle', gain: 0.05, attack: 0.006, dur: 0.16, glideTo: midi(88), lowpass: 4000 });
    audio.tone(midi(93), t + 0.05, { type: 'sine', gain: 0.025, attack: 0.004, dur: 0.18 });
  },
  /** 적중: 톡 */
  hit(): void {
    if (!gate('hit', 0.04)) return;
    const t = audio.now;
    audio.tone(midi(81), t, { type: 'triangle', gain: 0.05, attack: 0.002, dur: 0.07, glideTo: midi(76) });
    audio.noise(t, { gain: 0.025, dur: 0.04, attack: 0.002, band: 3500, q: 1.5 });
  },
  /** 잃어버린 주민 구출: 밝은 3음 */
  rescue(): void {
    if (!gate('rescue', 0.08)) return;
    arpeggio([84, 88, 91], 0.075, { type: 'triangle', gain: 0.055, attack: 0.005, dur: 0.35, lowpass: 5000 });
  },
  /** 호스틸 돌려보냄: 부드러운 하강 */
  retreat(): void {
    if (!gate('retreat', 0.08)) return;
    audio.tone(midi(79), audio.now, { type: 'sine', gain: 0.045, attack: 0.01, dur: 0.3, glideTo: midi(67) });
  },
  stationLit(allLit: boolean): void {
    const t = audio.now;
    if (allLit) {
      bell(72, t, 0.06, 1.6);
      bell(76, t + 0.09, 0.05, 1.5);
      bell(79, t + 0.18, 0.05, 1.5);
      bell(84, t + 0.3, 0.045, 1.8);
    } else {
      bell(79, t, 0.07, 1.3);
      bell(84, t + 0.12, 0.04, 1.0);
    }
  },
  /** 아이템 주움: 딩 */
  pickup(): void {
    const t = audio.now;
    audio.tone(midi(91), t, { type: 'sine', gain: 0.06, attack: 0.003, dur: 0.35 });
    audio.tone(midi(103), t, { type: 'sine', gain: 0.02, attack: 0.003, dur: 0.18 });
  },
  /** 아이템 씀: 반짝 스윕 */
  use(): void {
    const t = audio.now;
    audio.tone(midi(64), t, { type: 'triangle', gain: 0.045, attack: 0.02, dur: 0.35, glideTo: midi(88), lowpass: 3000 });
    arpeggio([88, 91, 96], 0.06, { type: 'sine', gain: 0.025, attack: 0.004, dur: 0.25 });
  },
  /** 자비: 따뜻한 2음 */
  mercy(): void {
    const t = audio.now;
    audio.tone(midi(76), t, { type: 'triangle', gain: 0.05, attack: 0.02, dur: 0.4, lowpass: 2200 });
    audio.tone(midi(81), t + 0.16, { type: 'triangle', gain: 0.05, attack: 0.02, dur: 0.55, lowpass: 2200 });
  },
  /** 패시브가 화남: 낮은 '흠' */
  upset(): void {
    if (!gate('upset', 0.3)) return;
    audio.tone(midi(50), audio.now, { type: 'sawtooth', gain: 0.04, attack: 0.04, dur: 0.32, glideTo: midi(46), lowpass: 520 });
  },
  /** 루미 피격: 둔탁한 톡 */
  hurt(): void {
    if (!gate('hurt', 0.12)) return;
    const t = audio.now;
    audio.tone(midi(55), t, { type: 'sine', gain: 0.11, attack: 0.004, dur: 0.16, glideTo: midi(40) });
    audio.noise(t, { gain: 0.03, dur: 0.06, attack: 0.002, band: 900, q: 0.8 });
  },
  /** 하트를 잃음: 하강 */
  down(): void {
    arpeggio([72, 67, 64, 60], 0.14, { type: 'triangle', gain: 0.05, attack: 0.01, dur: 0.4, lowpass: 2000 });
  },
  /** 중앙 광원 아래에서 다시 일어남 */
  respawn(): void {
    const t = audio.now;
    audio.tone(midi(67), t, { type: 'triangle', gain: 0.045, attack: 0.05, dur: 0.6, glideTo: midi(79), lowpass: 3000 });
    audio.tone(midi(86), t + 0.25, { type: 'sine', gain: 0.03, attack: 0.01, dur: 0.5 });
  },
  /** 친구를 되찾음: 짧은 팡파르 */
  friend(): void {
    const t = audio.now;
    [79, 84, 88].forEach((n, i) => audio.tone(midi(n), t + i * 0.1, { type: 'triangle', gain: 0.055, attack: 0.005, dur: 0.18, lowpass: 5000 }));
    for (const n of [79, 84, 88, 91]) audio.tone(midi(n), t + 0.34, { type: 'triangle', gain: 0.035, attack: 0.01, dur: 0.9, lowpass: 4000 });
  },
  /** 노월의 공격: 낮은 웅 */
  bossAttack(kind: 'orb' | 'summon'): void {
    if (!gate('boss', 0.25)) return;
    const t = audio.now;
    const base = kind === 'orb' ? 38 : 33;
    audio.tone(midi(base), t, { type: 'sine', gain: 0.1, attack: 0.08, dur: 0.6, glideTo: midi(base - 3) });
    audio.tone(midi(base + 7), t, { type: 'triangle', gain: 0.03, attack: 0.08, dur: 0.5, lowpass: 400 });
  },
  witchSpawn(): void {
    const t = audio.now;
    audio.tone(midi(50), t, { type: 'triangle', gain: 0.06, attack: 0.2, dur: 1.0, lowpass: 900 });
    audio.tone(midi(53), t + 0.35, { type: 'triangle', gain: 0.06, attack: 0.2, dur: 1.2, lowpass: 900 });
    audio.tone(midi(57), t + 0.7, { type: 'sine', gain: 0.04, attack: 0.2, dur: 1.2 });
  },
  witchReturned(): void {
    const t = audio.now;
    bell(74, t, 0.05, 1.4);
    bell(78, t + 0.14, 0.045, 1.4);
    bell(81, t + 0.28, 0.045, 1.6);
  },
  /** 아침이 옴: 밝은 화음 */
  clear(): void {
    const t = audio.now;
    [72, 76, 79, 84].forEach((n, i) => audio.tone(midi(n), t + i * 0.09, { type: 'triangle', gain: 0.05, attack: 0.01, dur: 0.3, lowpass: 5000 }));
    for (const n of [72, 76, 79, 86]) audio.tone(midi(n), t + 0.42, { type: 'triangle', gain: 0.04, attack: 0.03, dur: 1.6, lowpass: 3500 });
    bell(96, t + 0.42, 0.025, 1.4);
  },
  /** 오늘은 여기까지: 잔잔한 하강 */
  over(): void {
    arpeggio([69, 67, 64, 62], 0.22, { type: 'sine', gain: 0.05, attack: 0.02, dur: 0.6 });
  },
  /** 콤보 마디(5의 배수): 콤보가 클수록 높게 */
  combo(combo: number): void {
    const tier = Math.min(6, Math.floor(combo / 5));
    const root = 72 + tier * 2;
    arpeggio([root, root + 7], 0.06, { type: 'triangle', gain: 0.045, attack: 0.004, dur: 0.22, lowpass: 5000 });
  },
  /** 풀숲에서 들킴: 바스락 */
  rustle(): void {
    audio.noise(audio.now, { gain: 0.09, dur: 0.32, attack: 0.02, band: 2600, q: 0.9, tremolo: 22 });
  },
};

let installed = false;

/** 소리·진동을 켠다 (main.ts에서 한 번) */
export function installAudio(): void {
  if (installed) return;
  installed = true;
  audio.install();
  const bgm = new Bgm();
  const haptics = new Haptics();

  const apply = (s: Readonly<SettingsData>) => {
    audio.setSfx(s.sfx);
    bgm.setEnabled(s.bgm);
    haptics.setEnabled(s.vibration);
  };
  apply(loadSettings());
  onSettingsChange(apply);

  // 효과음 (효과음이 꺼져 있으면 노드를 만들지 않는다)
  const on = <A extends unknown[]>(fn: (...a: A) => void) => (...a: A) => {
    if (audio.sfxOn) fn(...a);
  };
  bus.on('light:cast', on(() => Sfx.cast()));
  bus.on('enemy:hit', on(() => Sfx.hit()));
  bus.on(
    'enemy:returned',
    on((e) => {
      if (e.kind === 'lost') Sfx.rescue();
      else if (e.kind !== 'boss') Sfx.retreat();
    }),
  );
  bus.on('station:lit', on((e) => Sfx.stationLit(e.allLit)));
  bus.on('item:pickup', on(() => Sfx.pickup()));
  bus.on('item:use', on(() => Sfx.use()));
  bus.on('mercy:gain', on(() => Sfx.mercy()));
  bus.on('passive:upset', on(() => Sfx.upset()));
  bus.on('player:hurt', on(() => Sfx.hurt()));
  bus.on('player:down', on(() => Sfx.down()));
  bus.on('player:respawn', on(() => Sfx.respawn()));
  bus.on('friend:rescued', on(() => Sfx.friend()));
  bus.on('boss:attack', on((e) => Sfx.bossAttack(e.kind)));
  bus.on('witch:spawn', on(() => Sfx.witchSpawn()));
  bus.on('witch:returned', on(() => Sfx.witchReturned()));
  bus.on('game:clear', on(() => Sfx.clear()));
  bus.on('game:over', on(() => Sfx.over()));
  bus.on(
    'combo:change',
    on((e) => {
      if (e.reason === 'gain' && e.combo > 0 && e.combo % 5 === 0) Sfx.combo(e.combo);
    }),
  );
  bus.on('stealth:exposed', on(() => Sfx.rustle()));

  // 배경음: 화면·판 흐름에 맞춰 모드를 바꾼다
  bus.on('ui:navigate', (e) => {
    if (e.to === 'play') return;
    bgm.duck(false);
    bgm.setMode('menu');
  });
  bus.on('run:start', () => {
    bgm.duck(false);
    bgm.setMode('play');
  });
  bus.on('night:phase', (e) => {
    if (e.phase === 'predawn') bgm.setMode('climax');
  });
  bus.on('run:pause', (e) => bgm.duck(e.paused));
  bus.on('game:clear', () => {
    bgm.duck(false);
    bgm.setMode('calm');
  });
  bus.on('game:over', () => {
    bgm.duck(false);
    bgm.setMode('calm');
  });
}
