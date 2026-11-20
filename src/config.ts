import Phaser from 'phaser';
import { currentView } from './ui/layout';
import { patchFrameLimit } from './core/frameLimit';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { PlayScene } from './scenes/PlayScene';

// 처음 크기는 지금 화면 방식(세로 540×960 / 가로 높이 540·폭은 화면 비율)으로, 그 뒤엔 ui/layout.ts가 맞춘다
const { width, height } = currentView();

// 120Hz 휴대폰에서 초당 60번 제한이 실제로는 40번·들쭉날쭉이던 Phaser 문제를 바로잡는다 (core/frameLimit.ts, 2026-11-20)
patchFrameLimit(Phaser.Core.TimeStep);

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
  // 소리는 게임 자체 Web Audio(src/audio)만 쓴다: Phaser 사운드가 AudioContext를 하나 더 만들지 않게 (2026-11-20)
  audio: { noAudio: true },
  render: { antialias: true, powerPreference: 'high-performance' },
  // 2026-11-06 버벅임 보완: 120Hz 화면에서도 초당 60번만 그린다 (부담 절반, 발열로 느려지는 것 방지)
  fps: { target: 60, limit: 60 },
  // Boot → Preload(에셋) → Play. 메뉴 화면은 DOM(그림 배경)이라 씬이 없다. 화면 이동은 ui/Router.ts
  scene: [BootScene, PreloadScene, PlayScene],
};
