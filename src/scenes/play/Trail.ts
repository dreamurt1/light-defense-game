// 걸음 빛 (2026-11-24 15:58 기획 세션 — 상점 꾸미기, 라이언 확정): 걷는 동안 루미 발밑에 작은 빛 점이 남아 떠오르며 사라진다.
// 점의 수·간격·수명은 systems/trail.ts(TrailState), 값은 game.json trail. 그림은 max개를 미리 만들어 돌려쓴다 — 매 프레임 새 오브젝트 없음.
// 고른 걸음 빛이 '없음'이면 아무것도 만들지 않는다. 겉모습만(적이 알아채는 것과 무관).
import Phaser from 'phaser';
import { currentTrail } from '../../core/lightShape';
import { Rng } from '../../core/rng';
import { GameData } from '../../data';
import { bakeTexture } from '../../entities/bake';
import { trailColor } from '../../systems/cosmetics';
import { TrailState } from '../../systems/trail';

/** 점 그림 한 변(px) — 두 배로 굽고 크기에 맞춰 줄인다 */
const DOT = 16;

export class Trail {
  private readonly state: TrailState | null = null;
  private readonly dots: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene) {
    const color = trailColor(currentTrail());
    if (color === null) return;
    const cfg = GameData.game.trail;
    const key = bakeTexture(scene, 'trail-dot', DOT, DOT, (g) => {
      g.fillStyle(0xffffff, 0.35).fillCircle(DOT / 2, DOT / 2, DOT / 2);
      g.fillStyle(0xffffff, 1).fillCircle(DOT / 2, DOT / 2, DOT / 4);
    });
    for (let i = 0; i < cfg.max; i++) {
      this.dots.push(scene.add.image(0, 0, key).setTint(color).setBlendMode(Phaser.BlendModes.ADD).setVisible(false));
    }
    const rng = new Rng(4711);
    this.state = new TrailState(cfg, () => rng.next());
  }

  /** feet = 걷는 중이면 발끝 자리, 제자리면 null. off = 풀숲 은신·쓰러짐·무적. depth = 루미 바로 아래 */
  update(dt: number, feet: { x: number; y: number } | null, off: boolean, depth: number): void {
    const state = this.state;
    if (!state) return;
    state.step(dt * 1000, feet, off);
    for (let i = 0; i < this.dots.length; i++) {
      const img = this.dots[i];
      const d = state.dots[i];
      if (!d) {
        if (img.visible) img.setVisible(false);
        continue;
      }
      const { dy, alpha } = state.look(d);
      // 바깥 고리까지 그린 그림이라 지름 = size의 두 배쯤으로 보이게
      img.setPosition(d.x, d.y + dy).setScale((d.size * 2) / DOT).setAlpha(alpha).setDepth(depth).setVisible(true);
    }
  }
}
