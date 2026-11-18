라이트 디펜스의 **오른쪽 빛 스틱 입력**을 DOM 없이 순수 TypeScript로 만들어 줘. 조작 규칙(겨눔·발사·짧게 탭·취소·누르고 있기)은 이 게임에서 정해 둔 그대로 따라야 해. 지금 폴더는 빈 TypeScript + Vitest 프로젝트야.

파일 이름과 겉모양은 아래를 지켜 줘. 겨눔으로 바뀌는 문턱, 반자동이 시작되기까지의 기다림, 자동 조준이 대상을 고르는 방법은 게임 규칙에서 가져와.

```ts
// src/systems/aimStick.ts
export type AimRelease = { kind: 'fire'; angle: number; power: number } | { kind: 'auto' } | { kind: 'cancel' };
export class AimStick {
  constructor(deadzone?: number);          // 생략하면 이 게임의 빛 스틱 겨눔 문턱
  down(): void;                            // 손가락을 댐
  move(dx: number, dy: number): boolean;   // 손잡이 위치 / 스틱 반지름(-1~1). 지금 겨누는 중이면 true
  up(): AimRelease | null;                 // 손가락을 뗌. 누르지 않았으면 null
  readonly direction: number;              // 겨누는 방향(라디안)
  readonly power: number;                  // 끈 정도 0~1
}
/** 짧게 탭했을 때 겨눌 방향. 쏠 대상이 없으면 null */
export function autoAimAngle(
  origin: { x: number; y: number },
  targets: readonly { x: number; y: number; radius?: number }[],
  range: number,
): number | null;

// src/systems/autoFire.ts
export class AutoFire {
  constructor(holdDelaySec?: number);      // 생략하면 이 게임의 반자동 기다림
  press(): void;                           // 빛 스틱을 누름
  stop(): void;                            // 끌기 시작하거나 뗌
  fired(): void;                           // 반자동 한 발이 실제로 나감
  update(dt: number, ready: boolean, key?: boolean): boolean; // 이번 프레임에 반자동 한 발을 쏠 차례인가 (key = PC 스페이스)
  readonly tapAllowed: boolean;            // 뗄 때 짧은 탭 자동 조준을 해도 되나
}

// src/input/lightStick.ts — 위 둘을 묶어 게임 이벤트를 내보내는 어댑터
export type InputEvent =
  | { type: 'input:aim'; active: boolean; angle: number; power: number }
  | { type: 'input:auto'; active: boolean }
  | { type: 'input:fire'; angle: number | null; power?: number }; // angle null = 자동 조준
export class LightStickAdapter {
  constructor(emit: (e: InputEvent) => void);
  press(): void;
  drag(dx: number, dy: number): void;
  release(): void;
}
```

`tests/`에 Vitest 테스트도 써 줘.
