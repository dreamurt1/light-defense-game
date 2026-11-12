import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './style.css';
import './ui/screens.css';
import './ui/sticks.css';
import './ui/finish.css';
import Phaser from 'phaser';
import { gameConfig } from './config';
import { mountUi } from './ui/UiRoot';
import { runSplash } from './ui/Splash';
import { applyLayout, watchLayout } from './ui/layout';

// 스플래시는 index.html에 이미 보이고 있다: 불러오기 진행을 받을 준비를 게임보다 먼저
runSplash();
// 화면 방식(세로·가로)을 게임·UI보다 먼저 정한다
applyLayout();
const game = new Phaser.Game(gameConfig);
watchLayout(game);
const uiRoot = document.getElementById('ui');
if (uiRoot) mountUi(uiRoot, game);

// 개발 중 브라우저 콘솔·자동 테스트에서 게임 상태를 들여다보기 위한 손잡이 (빌드에는 포함되지 않음)
if (import.meta.env.DEV) {
  Object.assign(window, { __game: game });
  void import('./dev/autoplay').then((m) => m.installAutoplay(game));
  void import('./dev/preview').then((m) => m.installPreview(game));
}
