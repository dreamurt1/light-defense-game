// 마을 안 풀숲·장애물 (2026-11-04 라이언 지시: 브롤스타즈처럼 숨을 수 있는 풀숲과 장애물을 조금). 배치는 data/map.json.
//  - 장애물(바위·술통·등불 기둥): 등불지기가 지나갈 수 없다(판정은 systems/obstacles.ts). 2.5D라 밑변 y로 앞뒤를 정한다
//  - 풀숲: 캐릭터·이웃 위를 덮는다. 등불지기가 들어가 있는 풀숲은 반투명해져 제 모습이 비친다
import Phaser from 'phaser';
import { Rng } from '../core/rng';
import { TextureKeys } from '../core/TextureKeys';
import { texScale } from '../core/textureRes';
import { GameData } from '../data';
import type { Rect } from '../systems/obstacles';

const MAP = GameData.map;
const HIDE = GameData.game.hide;
/** 풀숲은 캐릭터(깊이 = y)보다 위, 빛 부채꼴(4000)·반짝이보다 위 */
const BUSH_DEPTH = 6000;
const BUSH_ALPHA = 0.96;
/** 풀숲 한 덩이 간격: 덤불 그림(128×108)을 겹쳐 빽빽하게 */
const BUSH_STEP = { x: 78, y: 58 };
/** 등불 기둥 그림(44×116)의 밑동 */
const LAMP_FOOT = { x: 20 / 44, y: 104 / 116 };

export class MapProps {
  readonly obstacles: Rect[];
  readonly bushes: Rect[];
  private readonly bushLeaves: Phaser.GameObjects.Image[][];

  constructor(scene: Phaser.Scene) {
    const rng = new Rng(8803);
    this.obstacles = MAP.obstacles.map(({ x, y, w, h }) => ({ x, y, w, h }));
    this.bushes = MAP.bushes.map(({ x, y, w, h }) => ({ x, y, w, h }));

    for (const ob of MAP.obstacles) {
      const bottom = ob.y + ob.h;
      if (ob.kind === 'rocks') {
        const n = Math.max(1, Math.round(ob.w / 46));
        for (let i = 0; i < n; i++) {
          const x = ob.x + ((i + 0.5) * ob.w) / n + rng.range(-6, 6);
          const y = ob.y + ob.h * rng.range(0.45, 0.75);
          scene.add
            .image(x, y, TextureKeys.villageRock, 0)
            .setOrigin(0.5, 0.7)
            .setScale(rng.range(1.05, 1.45) * texScale(TextureKeys.villageRock))
            .setFlipX(rng.chance(0.5))
            .setDepth(bottom);
        }
      } else if (ob.kind === 'barrels') {
        scene.add
          .image(ob.x + ob.w / 2, bottom + 6, TextureKeys.villageBarrel, 0)
          .setOrigin(0.5, 1)
          .setScale(texScale(TextureKeys.villageBarrel))
          .setDepth(bottom);
      } else if (ob.kind === 'wall' || ob.kind === 'fence') {
        drawWall(scene, ob, ob.kind);
      } else {
        scene.add
          .image(ob.x + ob.w / 2, bottom, TextureKeys.villageLampPost, 0)
          .setOrigin(LAMP_FOOT.x, LAMP_FOOT.y)
          .setScale(texScale(TextureKeys.villageLampPost))
          .setDepth(bottom);
      }
    }

    this.bushLeaves = MAP.bushes.map((b) => {
      const leaves: Phaser.GameObjects.Image[] = [];
      const cols = Math.max(1, Math.round(b.w / BUSH_STEP.x));
      const rows = Math.max(1, Math.round(b.h / BUSH_STEP.y));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = b.x + ((c + 0.5) * b.w) / cols + rng.range(-10, 10);
          const y = b.y + ((r + 0.5) * b.h) / rows + rng.range(-8, 8);
          leaves.push(
            scene.add
              .image(x, y, TextureKeys.villageBush, 0)
              .setScale(rng.range(0.85, 1.08) * texScale(TextureKeys.villageBush))
              .setFlipX(rng.chance(0.5))
              .setAlpha(BUSH_ALPHA)
              .setDepth(BUSH_DEPTH + y / 10000),
          );
        }
      }
      return leaves;
    });
  }

  /** 등불지기가 들어가 있는 풀숲(번호, 없으면 -1)을 반투명하게 */
  update(dt: number, inside: number): void {
    const k = Math.min(1, dt * 8);
    this.bushLeaves.forEach((leaves, i) => {
      const target = i === inside ? HIDE.bushAlphaInside : BUSH_ALPHA;
      for (const leaf of leaves) leaf.setAlpha(leaf.alpha + (target - leaf.alpha) * k);
    });
  }
}

/** 담 높이(2.5D: 바닥 사각형 위로 솟은 만큼) — 2026-11-13 미로 요소, 임시 코드 그림 */
const WALL_RISE = { wall: 26, fence: 22 };

/** 돌담·나무 울타리: 바닥 사각형(판정)을 위로 솟은 덩어리로 그린다. 밑변 y로 앞뒤를 정한다 */
function drawWall(scene: Phaser.Scene, r: Rect, kind: 'wall' | 'fence'): void {
  const g = scene.add.graphics().setDepth(r.y + r.h);
  const rise = WALL_RISE[kind];
  if (kind === 'wall') {
    // 앞면(어두움) + 윗면(밝음) + 돌 줄눈
    g.fillStyle(0x2a2640, 1).fillRect(r.x, r.y - rise + r.h * 0.4, r.w, r.h * 0.6 + rise);
    g.fillStyle(0x4b4766, 1).fillRect(r.x, r.y - rise, r.w, r.h * 0.4 + 4);
    g.lineStyle(1.5, 0x1b1f3b, 0.9).strokeRect(r.x, r.y - rise, r.w, r.h + rise);
    g.lineStyle(1, 0x1b1f3b, 0.55);
    const front = r.y - rise + r.h * 0.4 + 4;
    for (let x = r.x + 18; x < r.x + r.w - 6; x += 22) g.lineBetween(x, front, x, r.y + r.h);
    g.lineBetween(r.x, front + (r.y + r.h - front) / 2, r.x + r.w, front + (r.y + r.h - front) / 2);
    g.fillStyle(0xa89cd9, 0.18).fillRect(r.x + 2, r.y - rise + 2, r.w - 4, 3);
    return;
  }
  // 울타리: 기둥 + 가로대 두 줄
  const posts = Math.max(2, Math.round(r.w / 34));
  g.fillStyle(0x5a4636, 1);
  for (let i = 0; i <= posts; i++) {
    const x = r.x + (i * (r.w - 8)) / posts;
    g.fillRect(x, r.y - rise, 8, r.h + rise);
  }
  g.fillStyle(0x7a5e48, 1).fillRect(r.x, r.y - rise + 6, r.w, 6).fillRect(r.x, r.y - rise + 18, r.w, 6);
  g.lineStyle(1, 0x1b1f3b, 0.7).strokeRect(r.x, r.y - rise + 6, r.w, 18);
}
