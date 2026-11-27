// 화면 누름 조작 (PC 마우스·터치패드 탭·폰 화면 터치 — 2026-11-27 라이언: "터치 순간 공격 반경도 뜨고 바로 쏘아지게, 마우스 클릭·탭·폰 터치 모두 같게"):
//  - 누르는 순간 바로 한 발(onPress — 반경 안 가장 가까운 적, 없으면 걷던 쪽, PlayScene이 정함)
//  - 누른 채 그대로 있으면 반자동(autoHeld — 빛이 준비될 때마다 한 발, 스페이스와 같음)
//  - 누른 채 DRAG_PX 넘게 끌면 겨눔: 원뿔이 커서 쪽으로 보이고(dragPoint), 놓으면 그쪽으로 한 발(onRelease, 루미 위에서 놓으면 취소)
// WASD·방향키로 걷는다(2026-11-06 라이언 지시는 누르고·끌고·놓기 — 끌어 겨누기는 그대로).
// 폰 화면 터치(2026-11-27부터): 스틱 원·HUD는 DOM이 먼저 받으므로 여기 오는 건 판 위 터치뿐, 가장자리 당겨 뒤로가기 자리(양옆 24px)는 뺀다.
import Phaser from 'phaser';
import { keysVector } from '../systems/movement';
import type { Vec } from '../systems/fan';

type KeyName = 'w' | 'a' | 's' | 'd' | 'up' | 'down' | 'left' | 'right' | 'space';

/** 이만큼(화면 px) 넘게 끌어야 겨눔 — 탭하며 손가락·커서가 조금 밀려도 반자동 그대로 */
const DRAG_PX = 24;
/** 가장자리 당겨 뒤로가기 자리 (ui/EdgeSwipe.ts와 같은 24px, 화면 px) */
const EDGE_PX = 24;

export class DesktopControls {
  private readonly keys: Record<KeyName, Phaser.Input.Keyboard.Key> | null;
  /** 누르고 있는 포인터 (멀티터치는 첫 손가락만). 누르지 않으면 null */
  private id: number | null = null;
  /** 누른 자리·지금 자리 (화면 좌표 — 걷는 동안 카메라가 움직여도 마을 좌표를 매 프레임 다시 계산하려고) */
  private start: Vec | null = null;
  private screen: Vec | null = null;
  private dragging = false;

  constructor(
    private readonly scene: Phaser.Scene,
    onPress: () => void,
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
        space: KC.SPACE, // 누르고 있으면 반자동 빛 (2026-11-18, 모바일 빛 스틱 누르고 있기와 같음)
        // 키를 가로채지 않는다: 일시정지 중 설정의 닉네임 입력란에 W·A·S·D도 써져야 한다
      }, false) as Record<KeyName, Phaser.Input.Keyboard.Key> | undefined) ?? null;

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      if (this.id !== null) return;
      // 마우스는 왼쪽(주) 버튼만 — 터치패드 탭은 누름 정보가 0으로 올 때가 있어 button도 본다
      if (!p.wasTouch && !(p.leftButtonDown() || p.button === 0)) return;
      if (p.wasTouch && this.atEdge(p.x)) return;
      this.id = p.id;
      this.start = { x: p.x, y: p.y };
      this.screen = { x: p.x, y: p.y };
      this.dragging = false;
      onPress();
    });
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      if (p.id !== this.id || !this.screen || !this.start) return;
      this.screen = { x: p.x, y: p.y };
      if (!this.dragging && Math.hypot(p.x - this.start.x, p.y - this.start.y) > DRAG_PX * this.scale) this.dragging = true;
    });
    // 캔버스 밖(HUD 위 등)에서 놓아도 끝난다
    const release = (p: Phaser.Input.Pointer) => {
      if (p.id !== this.id) return;
      const at = this.dragging ? this.dragPoint() : null;
      this.reset();
      if (at) onRelease(at);
    };
    scene.input.on(Phaser.Input.Events.POINTER_UP, release);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, release);
  }

  /** 화면 px → 게임 px */
  private get scale(): number {
    return this.scene.scale.displayScale.x || 1;
  }

  private atEdge(x: number): boolean {
    const e = EDGE_PX * this.scale;
    return x < e || x > this.scene.scale.width - e;
  }

  private reset(): void {
    this.id = null;
    this.start = null;
    this.screen = null;
    this.dragging = false;
  }

  /** 키보드 걷기 입력 (길이 0 또는 1) */
  get move(): Vec {
    const k = this.keys;
    // 입력란에 글자를 쓰는 중이면 걷지 않는다
    if (!k || document.activeElement instanceof HTMLInputElement) return { x: 0, y: 0 };
    return keysVector(k.a.isDown || k.left.isDown, k.d.isDown || k.right.isDown, k.w.isDown || k.up.isDown, k.s.isDown || k.down.isDown);
  }

  /** 반자동: 스페이스를 누르고 있음, 또는 화면을 끌지 않고 누르고 있음 (입력란에 글자를 쓰는 중이면 아님) */
  get autoHeld(): boolean {
    if (this.id !== null && !this.dragging) return true;
    return !!this.keys?.space.isDown && !(document.activeElement instanceof HTMLInputElement);
  }

  /** 끌어 겨누는 중이면 커서가 가리키는 마을 좌표, 아니면 null */
  dragPoint(): Vec | null {
    if (!this.screen || !this.dragging) return null;
    const p = this.scene.cameras.main.getWorldPoint(this.screen.x, this.screen.y);
    return { x: p.x, y: p.y };
  }

  /** 일시정지·판 끝: 누르던 것을 쏘지 않고 버린다 */
  cancel(): void {
    this.reset();
  }
}
