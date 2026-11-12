// PC 조작: WASD·방향키로 걷고, 마우스 왼쪽 버튼을 누른 채 끄는 동안 원뿔 조준 범위가 보이며, 놓으면 그쪽으로 빛을 보낸다
// (2026-11-06 라이언 지시: 모바일 빛 스틱처럼 누르고·끌고·놓기. 반지름은 PlayScene이 커서 거리로 정한다).
// 터치는 무시한다: 휴대폰은 화면의 두 스틱(ui/Sticks.ts)만 쓴다. 화면의 스틱은 PC에서도 마우스로 쓸 수 있다.
import Phaser from 'phaser';
import { keysVector } from '../systems/movement';
import type { Vec } from '../systems/fan';

type KeyName = 'w' | 'a' | 's' | 'd' | 'up' | 'down' | 'left' | 'right';

export class DesktopControls {
  private readonly keys: Record<KeyName, Phaser.Input.Keyboard.Key> | null;
  /** 끄는 중인 커서의 화면 좌표 (걷는 동안 카메라가 움직여도 마을 좌표를 매 프레임 다시 계산하려고 화면 좌표로 둔다). 끌지 않으면 null */
  private screen: Vec | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    onRelease: (worldPoint: Vec) => void,
  ) {
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.keys =
      (scene.input.keyboard?.addKeys({
        w: KC.W,
        a: KC.A,
        s: KC.S,
        d: KC.D,
        up: KC.UP,
        down: KC.DOWN,
        left: KC.LEFT,
        right: KC.RIGHT,
        // 키를 가로채지 않는다: 일시정지 중 설정의 닉네임 입력란에 W·A·S·D도 써져야 한다
      }, false) as Record<KeyName, Phaser.Input.Keyboard.Key> | undefined) ?? null;

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      if (p.wasTouch || !p.leftButtonDown()) return;
      this.screen = { x: p.x, y: p.y };
    });
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      if (this.screen && !p.wasTouch) this.screen = { x: p.x, y: p.y };
    });
    // 캔버스 밖(HUD 위 등)에서 놓아도 끝난다
    const release = (p: Phaser.Input.Pointer) => {
      if (!this.screen || p.wasTouch) return;
      const at = this.dragPoint() as Vec;
      this.screen = null;
      onRelease(at);
    };
    scene.input.on(Phaser.Input.Events.POINTER_UP, release);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, release);
  }

  /** 키보드 걷기 입력 (길이 0 또는 1) */
  get move(): Vec {
    const k = this.keys;
    // 입력란에 글자를 쓰는 중이면 걷지 않는다
    if (!k || document.activeElement instanceof HTMLInputElement) return { x: 0, y: 0 };
    return keysVector(k.a.isDown || k.left.isDown, k.d.isDown || k.right.isDown, k.w.isDown || k.up.isDown, k.s.isDown || k.down.isDown);
  }

  /** 마우스로 끄는 중이면 커서가 가리키는 마을 좌표, 아니면 null */
  dragPoint(): Vec | null {
    if (!this.screen) return null;
    const p = this.scene.cameras.main.getWorldPoint(this.screen.x, this.screen.y);
    return { x: p.x, y: p.y };
  }

  /** 일시정지·판 끝: 끄던 것을 쏘지 않고 버린다 */
  cancel(): void {
    this.screen = null;
  }
}
