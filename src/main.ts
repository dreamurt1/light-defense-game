import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './style.css';
import './ui/screens.css';
import './ui/sticks.css';
import './ui/finish.css';
import './ui/story.css';
import './ui/run.css';
import './ui/highlight.css';
import Phaser from 'phaser';
import { gameConfig } from './config';
import { mountUi } from './ui/UiRoot';
import { runSplash } from './ui/Splash';
import { applyLayout, watchLayout } from './ui/layout';
import { watchProgress } from './core/Progress';
import { installRunFlow } from './core/runFlow';
import { installAudio } from './audio/Sound';
import { installPullRefresh } from './ui/PullRefresh';
import { installAutoFullscreen } from './ui/fullscreen';
import { installGlobalErrorLog } from './core/errorLog';
import { installContextGuard, installDebugOverlay } from './ui/healthGuard';
import { installPerfGuard } from './core/perfGuard';

// 처리되지 않은 오류도 남긴다(휴대폰에서만 나는 멈춤을 ?debug로 보기, 2026-11-20)
installGlobalErrorLog();
// 스플래시는 index.html에 이미 보이고 있다: 불러오기 진행을 받을 준비를 게임보다 먼저
runSplash();
// 화면 방식(세로·가로)을 게임·UI보다 먼저 정한다
applyLayout();
const game = new Phaser.Game(gameConfig);
watchLayout(game);
// 그래픽 문맥을 잃고 못 돌려받으면 새로고침, ?debug면 점검 화면 (2026-11-20)
game.events.once(Phaser.Core.Events.READY, () => {
  installContextGuard(game);
  installDebugOverlay(game);
  // 느린 기기는 판 중에 재서 가벼운 모드(초당 30 + HUD 그림자 끔)로, 그 기기에서 기억 (2026-11-24 삼성 태블릿 렉)
  installPerfGuard(game);
});
watchProgress();
// 런: 밤의 끝 → 아침 화면 / 런의 끝 (2026-11-23 밤 나들이)
installRunFlow();
installAudio();
installPullRefresh();
// 휴대폰은 첫 탭에서 전체 화면 (2026-11-20)
installAutoFullscreen();
const uiRoot = document.getElementById('ui');
if (uiRoot) mountUi(uiRoot, game);

// 개발 중 브라우저 콘솔·자동 테스트에서 게임 상태를 들여다보기 위한 손잡이 (빌드에는 포함되지 않음)
if (import.meta.env.DEV) {
  Object.assign(window, { __game: game });
  void import('./dev/autoplay').then((m) => m.installAutoplay(game));
  void import('./dev/preview').then((m) => m.installPreview(game));
}
