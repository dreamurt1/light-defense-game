라이트 디펜스의 **등불 스테이션** 규칙을 순수 TypeScript로 만들어 줘. Phaser 없이, 수치는 이 게임에서 정해 둔 그대로 따라야 해. 지금 폴더는 빈 TypeScript + Vitest 프로젝트야.

파일 이름과 겉모양은 아래를 지켜 줘. 점화 시간, 저절로 줄어드는 속도, 적에게 맞을 때의 배율, 결계 크기, 켤 때 중앙 광원에 주는 값은 게임 규칙에서 가져와.

```ts
// src/systems/LampStation.ts
export interface StationStep {
  lit?: { centralHeal: number }; // 이번 프레임에 켜졌으면, 그때 중앙 광원이 오르는 양
  out?: boolean;                  // 이번 프레임에 꺼졌으면 true
}
export class LampStation {
  constructor(opts?: { igniteMultiplier?: number }); // 점화 시간 배율(등불지기 특성), 생략하면 1
  receiveLight(): void;                  // 빛이 닿음
  hitByEnemy(sourceDamage: number): void; // 적에게 맞음 (그 적의 광원 피해)
  update(dt: number): StationStep;       // dt = 초
  readonly isLit: boolean;
  readonly isIgniting: boolean;
  readonly hp: number;          // 게이지 0~100
  readonly brightness: number;  // 광도 0~100
  readonly wardRadius: number;  // 결계 반지름 (꺼져 있으면 0)
}
```

판은 꺼진 등불로 시작한다. `tests/`에 Vitest 테스트도 써 줘.
