// 튜토리얼 단계 (순수 로직, 2026-11-13 라이언: 처음 하는 유저는 튜토리얼을 꼭 거친다).
// 단계마다 안내 문구, 들어갈 때 낼 것(spawn), 넘어가는 조건(until)이 있다. 마지막 단계를 넘기면 끝.
export type TutorialSignal = 'walked' | 'retreated' | 'lit' | 'rescued' | 'mercy' | 'upset' | 'itemUsed';
export type TutorialSpawn = 'bat' | 'frog' | 'owl' | 'item' | null;

export interface TutorialStep {
  text: string;
  spawn: TutorialSpawn;
  until: readonly TutorialSignal[];
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  { text: '왼쪽 스틱으로 걸어 봐요 (PC: WASD)', spawn: null, until: ['walked'] },
  { text: '오른쪽 스틱을 끌었다 놓으면 빛이 나가요 (PC: 마우스를 끌었다 놓기). 박쥐를 돌려보내요', spawn: 'bat', until: ['retreated'] },
  { text: '노란 화살표를 따라가 꺼진 등불에 빛을 보내 켜요', spawn: null, until: ['lit'] },
  { text: '빛을 잃은 친구에게 빛을 보내면 제 모습을 되찾아요', spawn: 'frog', until: ['rescued'] },
  { text: '졸린 눈의 주민은 공격하지 않아요. 곁을 그냥 지나가 주면 자비 점수!', spawn: 'owl', until: ['mercy', 'upset'] },
  { text: '반짝이는 아이템을 주워서 아래 칸을 눌러 써요 (PC: Q)', spawn: 'item', until: ['itemUsed'] },
];

export class TutorialScript {
  index = 0;

  constructor(private readonly steps: readonly TutorialStep[] = TUTORIAL_STEPS) {}

  get step(): TutorialStep | null {
    return this.steps[this.index] ?? null;
  }

  get total(): number {
    return this.steps.length;
  }

  get done(): boolean {
    return this.index >= this.steps.length;
  }

  /** 신호가 지금 단계의 조건이면 다음 단계로. @returns 넘어갔으면 true */
  signal(s: TutorialSignal): boolean {
    const step = this.step;
    if (!step || !step.until.includes(s)) return false;
    this.index += 1;
    return true;
  }
}
