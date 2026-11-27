// 말풍선 (2026-11-13 컨셉 시연판): 패시브 주민·빛을 잃은 친구·노월의 짧은 대사. 따라갈 대상 위에 잠깐 떴다 사라진다.
import Phaser from 'phaser';
import { bakeTexture } from './bake';

const DEPTH = 7000;
const PAD = { x: 10, y: 6 };
/** 꼬리 길이 (아래로) */
const TAIL = 7;
/** 대상마다 지금 떠 있는 말풍선 — 새 말이 오면 앞 말은 바로 지운다 (2026-11-23: 행렬이 연달아 맞으면 두 말이 겹쳐 읽히던 것) */
const current = new WeakMap<Phaser.GameObjects.Container, () => void>();

export function sayAbove(scene: Phaser.Scene, target: Phaser.GameObjects.Container, text: string, offsetY = -64, ms = 2200): void {
  current.get(target)?.();
  const label = scene.add
    .text(0, 0, text, { fontFamily: 'Pretendard Variable, Pretendard, "Noto Sans KR", sans-serif', fontSize: '15px', color: '#1B1F3B', fontStyle: '600' })
    .setOrigin(0.5);
  const w = Math.ceil(label.width + PAD.x * 2);
  const h = Math.ceil(label.height + PAD.y * 2);
  // 바탕은 크기별로 한 번 구운 그림 (2026-11-27 기기별 렉: 살아 있는 Graphics의 둥근 사각형이 떠 있는 동안 매 프레임 다시 쪼개짐 —
  // 클라이맥스엔 '눈부셔..' 말풍선이 거의 늘 떠 있어 느린 기기 CPU를 먹음). 모양·자리 그대로(가운데 기준, 꼬리 7 아래)
  const key = bakeTexture(scene, `bubble-${w}x${h}`, w, h + TAIL, (g) => {
    g.fillStyle(0xf6f1e7, 0.94);
    g.fillRoundedRect(0, 0, w, h, 10);
    g.fillTriangle(w / 2 - 6, h - 1, w / 2 + 6, h - 1, w / 2, h + TAIL);
  });
  const bg = scene.add.image(0, 0, key).setOrigin(0.5, h / 2 / (h + TAIL));
  const box = scene.add.container(target.x, target.y + offsetY, [bg, label]).setDepth(DEPTH).setAlpha(0);
  const follow = () => {
    if (target.active) box.setPosition(target.x, target.y + offsetY);
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, follow);
  const stop = () => scene.events.off(Phaser.Scenes.Events.UPDATE, follow);
  // 다시 시작해도 scene.events 구독은 남으므로 씬이 끝날 때 꼭 뗀다 (코드 리뷰 2026-11-13)
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, stop);
  let gone = false;
  const remove = () => {
    if (gone) return;
    gone = true;
    stop();
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, stop);
    box.destroy();
    if (current.get(target) === remove) current.delete(target);
  };
  current.set(target, remove);
  scene.tweens.add({ targets: box, alpha: 1, y: '-=6', duration: 180 });
  scene.time.delayedCall(ms, () => {
    if (gone) return;
    scene.tweens.add({
      targets: box,
      alpha: 0,
      duration: 240,
      onComplete: remove,
    });
  });
}
