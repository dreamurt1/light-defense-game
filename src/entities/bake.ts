// 변하지 않는 도형을 한 번만 그려 텍스처로 굽는다 (2026-11-20 휴대폰 렉: Phaser Graphics는 화면 밖이어도 매 프레임 명령을 다시 쪼개
// 삼각형으로 만든다 — 3스테이지 돌담·울타리 30개 + 게이지가 프레임마다 약 3,500개 명령을 다시 쪼갰다). 같은 키는 다시 굽지 않는다.
import type Phaser from 'phaser';

/** draw는 (0,0)~(w,h) 안에 그린다. 텍스처 키를 돌려준다 */
export function bakeTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): string {
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({}, false);
  draw(g);
  g.generateTexture(key, Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)));
  g.destroy();
  return key;
}
