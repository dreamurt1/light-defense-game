// 녹음 음원 (2026-11-19, Phase 6): public/audio/manifest.json에 적힌 파일이 있으면 합성 대신 그 소리를 쓴다.
//  - 배경음: bgm.{menu|play|climax|calm} = 반복 재생 파일, 효과음: sfx.{cast|hit|rescue|…} = 한 번 재생 파일 (이름 = Sound.ts Sfx)
//  - 목록이 비었거나 파일을 못 읽으면 지금처럼 합성으로 (조용히 넘어감). 파일은 첫 입력 뒤(AudioContext가 열린 뒤) 받는다.
//  - 음량·켜기는 그대로 효과음·배경음 버스(AudioEngine)를 거친다.
import { audio } from './AudioEngine';

export interface AudioManifest {
  bgm?: Record<string, string>;
  sfx?: Record<string, string>;
}

/** 받을 파일 이름: 같은 폴더의 소리 파일만 (경로·주소는 받지 않는다) */
const FILE_RE = /^[\w-]+(\.[\w-]+)*\.(mp3|ogg|oga|m4a|aac|wav|webm|opus)$/i;

/** 목록에서 받을 것만 골라 'bgm:menu' 같은 키와 파일 이름으로 (순수 로직) */
export function manifestEntries(m: unknown): { key: string; file: string }[] {
  if (!m || typeof m !== 'object') return [];
  const out: { key: string; file: string }[] = [];
  for (const group of ['bgm', 'sfx'] as const) {
    const table = (m as AudioManifest)[group];
    if (!table || typeof table !== 'object') continue;
    for (const [name, file] of Object.entries(table)) {
      if (name.startsWith('_') || typeof file !== 'string' || !FILE_RE.test(file)) continue;
      out.push({ key: `${group}:${name}`, file });
    }
  }
  return out;
}

/** 같은 효과음 파일 사이 최소 간격(초) */
const MIN_GAP_SEC = 0.04;

const BASE = `${import.meta.env.BASE_URL}audio/`;

class RecordedAudio {
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly listeners = new Set<() => void>();
  private started = false;
  private readonly last = new Map<string, number>();

  /** 목록을 읽고 파일을 받아 둔다 (한 번만) */
  load(ctx: AudioContext): void {
    if (this.started) return;
    this.started = true;
    void fetch(`${BASE}manifest.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((m: unknown) => {
        for (const { key, file } of manifestEntries(m)) {
          void fetch(BASE + file)
            .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(file))))
            .then((data) => ctx.decodeAudioData(data))
            .then((buf) => {
              this.buffers.set(key, buf);
              for (const fn of this.listeners) fn();
            })
            .catch(() => undefined);
        }
      })
      .catch(() => undefined);
  }

  /** 파일을 하나 받을 때마다 불린다 (배경음이 바로 바꿔 틀게) */
  onChange(fn: () => void): void {
    this.listeners.add(fn);
  }

  /** 이 모드의 배경음 파일 (없으면 null = 합성) */
  track(mode: string): AudioBuffer | null {
    return this.buffers.get(`bgm:${mode}`) ?? null;
  }

  /** 이 이름의 효과음 파일이 있으면 틀고 true, 없으면 false (합성으로) */
  play(name: string): boolean {
    const buf = this.buffers.get(`sfx:${name}`);
    const ctx = audio.ctx;
    if (!buf || !ctx || !audio.sfx) return false;
    // 같은 소리가 한 프레임에 몰려 시끄러워지지 않게 (합성 효과음의 gate와 같은 뜻)
    if (ctx.currentTime - (this.last.get(name) ?? -1) < MIN_GAP_SEC) return true;
    this.last.set(name, ctx.currentTime);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(audio.sfx);
    src.start();
    src.onended = () => src.disconnect();
    return true;
  }
}

/** 게임 전체가 쓰는 녹음 음원 하나 */
export const recorded = new RecordedAudio();
