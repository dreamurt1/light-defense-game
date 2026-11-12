import Phaser from 'phaser';
import { currentView } from './ui/layout';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { PlayScene } from './scenes/PlayScene';

// 처음 크기는 지금 화면 방식(세로 540×960 / 가로 높이 540·폭은 화면 비율)으로, 그 뒤엔 ui/layout.ts가 맞춘다
const { width, height } = currentView();

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width,
  height,
  backgroundColor: '#120F24',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 3 },
  render: { antialias: true, powerPreference: 'high-performance' },
  // 2026-11-06 버벅임 보완: 120Hz 화면에서도 초당 60번만 그린다 (부담 절반, 발열로 느려지는 것 방지)
  fps: { target: 60, limit: 60 },
  // Boot → Preload(에셋) → Play. 메뉴 화면은 DOM(그림 배경)이라 씬이 없다. 화면 이동은 ui/Router.ts
  scene: [BootScene, PreloadScene, PlayScene],
};
