// 말풍선 (2026-11-13 컨셉 시연판): 패시브 주민·빛을 잃은 친구·노월의 짧은 대사. 따라갈 대상 위에 잠깐 떴다 사라진다.
import Phaser from 'phaser';

const DEPTH = 7000;
const PAD = { x: 10, y: 6 };

export function sayAbove(scene: Phaser.Scene, target: Phaser.GameObjects.Container, text: string, offsetY = -64, ms = 2200): void {
  const label = scene.add
    .text(0, 0, text, { fontFamily: 'Pretendard Variable, Pretendard, "Noto Sans KR", sans-serif', fontSize: '15px', color: '#1B1F3B', fontStyle: '600' })
    .setOrigin(0.5);
  const w = label.width + PAD.x * 2;
  const h = label.height + PAD.y * 2;
  const bg = scene.add.graphics();
  bg.fillStyle(0xf6f1e7, 0.94);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
  bg.fillTriangle(-6, h / 2 - 1, 6, h / 2 - 1, 0, h / 2 + 7);
  const box = scene.add.container(target.x, target.y + offsetY, [bg, label]).setDepth(DEPTH).setAlpha(0);
  const follow = () => {
    if (target.active) box.setPosition(target.x, target.y + offsetY);
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, follow);
  const stop = () => scene.events.off(Phaser.Scenes.Events.UPDATE, follow);
  // 다시 시작해도 scene.events 구독은 남으므로 씬이 끝날 때 꼭 뗀다 (코드 리뷰 2026-11-13)
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, stop);
  scene.tweens.add({ targets: box, alpha: 1, y: '-=6', duration: 180 });
  scene.time.delayedCall(ms, () => {
    scene.tweens.add({
      targets: box,
      alpha: 0,
      duration: 240,
      onComplete: () => {
        stop();
        scene.events.off(Phaser.Scenes.Events.SHUTDOWN, stop);
        box.destroy();
      },
    });
  });
}
