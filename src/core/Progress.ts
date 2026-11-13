// 진행 저장 (2026-11-13 컨셉 시연판): 튜토리얼을 마쳤는지, 깬 스테이지, 되찾은 친구. localStorage에 둔다.
//  - 처음 하는 유저는 튜토리얼을 꼭 거친다(라이언 2026-11-13). 튜토리얼을 마치면 1스테이지가 열린다
//  - 스테이지는 앞 스테이지를 깨면 열린다. 친구(토리·도토)는 구출 스테이지에서 되찾으면 열린다
//  - 시연용 '모두 열기'는 튜토리얼·스테이지·친구를 모두 연다
import { bus } from './events';
import { STAGE_ORDER, type CharacterId } from '../data';

const KEY = 'ld.progress.v1';

export interface ProgressData {
  tutorialDone: boolean;
  cleared: string[];
  friends: CharacterId[];
  demo: boolean;
}

const EMPTY: ProgressData = { tutorialDone: false, cleared: [], friends: [], demo: false };

function load(): ProgressData {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<ProgressData>) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

let data = load();

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // 저장이 막힌 브라우저: 이번 방문 동안만
  }
  bus.emit('progress:change');
}

export const Progress = {
  get data(): Readonly<ProgressData> {
    return data;
  },
  get tutorialDone(): boolean {
    return data.tutorialDone || data.demo;
  },
  markTutorial(): void {
    if (data.tutorialDone) return;
    data = { ...data, tutorialDone: true };
    save();
  },
  clearStage(id: string): void {
    if (data.cleared.includes(id)) return;
    data = { ...data, cleared: [...data.cleared, id] };
    save();
  },
  rescue(id: CharacterId): void {
    if (data.friends.includes(id)) return;
    data = { ...data, friends: [...data.friends, id] };
    save();
  },
  /** 시연용: 모두 열기 */
  unlockAll(): void {
    data = { ...data, demo: true, tutorialDone: true };
    save();
  },
  /** 처음부터 (확인용) */
  reset(): void {
    data = { ...EMPTY };
    save();
  },
  isStageOpen(id: string): boolean {
    if (data.demo) return true;
    const i = (STAGE_ORDER as readonly string[]).indexOf(id);
    if (i < 0) return true;
    if (i === 0) return data.tutorialDone;
    return data.cleared.includes(STAGE_ORDER[i - 1]);
  },
  isFriendOpen(id: CharacterId): boolean {
    return id === 'lumi' || data.demo || data.friends.includes(id);
  },
  /** 아직 안 깬 가장 앞 스테이지 (선택 화면 기본값) */
  get nextStage(): string {
    return STAGE_ORDER.find((s) => !data.cleared.includes(s)) ?? STAGE_ORDER[STAGE_ORDER.length - 1];
  },
};

/** 판 결과를 진행에 남긴다 (main.ts에서 한 번) */
export function watchProgress(): void {
  bus.on('game:clear', (e) => {
    if (e.result.reason === 'tutorial') Progress.markTutorial();
    else Progress.clearStage(e.result.stageId);
  });
  bus.on('friend:rescued', (e) => Progress.rescue(e.characterId));
}
