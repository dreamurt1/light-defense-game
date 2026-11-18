라이트 디펜스의 **밤 시계**와 **콤보**를 순수 TypeScript로 만들어 줘. Phaser 없이, 게임 규칙은 이 게임에서 정해 둔 그대로 따라야 해. 지금 폴더는 빈 TypeScript + Vitest 프로젝트야.

파일 이름과 겉모양은 아래를 지켜 줘. 기본값(한 판 길이, 시간대 경계, 콤보가 끊기는 시간, 점수 배율)은 게임 규칙에서 가져와.

```ts
// src/systems/NightClock.ts
export type Phase = 'dusk' | 'midnight' | 'predawn' | 'dawn';
export class NightClock {
  constructor(durationSec?: number); // 생략하면 이 게임의 한 판 길이
  update(dt: number): void;          // dt = 초
  readonly t: number;                 // 지난 시간(초), 한 판 길이를 넘지 않음
  readonly progress: number;          // 0~1
  readonly phase: Phase;              // 하늘빛 시간대(초저녁·한밤중·새벽 전), 끝나면 'dawn'
  readonly isClimax: boolean;         // 클라이맥스 구간인가
  readonly isDawn: boolean;           // 아침이 왔나(판 끝)
}

// src/systems/ComboSystem.ts
export class ComboSystem {
  hit(): void;                // 적을 하나 처리함(구출·돌려보냄)
  update(dt: number): void;   // dt = 초
  readonly combo: number;
  readonly multiplier: number; // 이번 콤보의 점수 배율
}
```

`tests/`에 Vitest 테스트도 써 줘. 경계가 되는 값은 꼭 테스트해 줘.
