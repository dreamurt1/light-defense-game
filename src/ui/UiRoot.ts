// 캔버스 위 DOM UI 레이어를 조립한다: 메뉴 화면들 + 플레이 HUD(두 스틱 포함) + 시트(일시정지·결과·설정).
import type Phaser from 'phaser';
import { LocalRanking } from '../services/LocalRanking';
import { installHistoryNav } from './HistoryNav';
import { installEdgeSwipe } from './EdgeSwipe';
import { MorningSheet } from './MorningSheet';
import { HighlightCut } from './HighlightCut';
import { PortraitLine } from './PortraitLine';
import { BossBar } from './BossBar';
import { Hud } from './Hud';
import { PauseSheet } from './PauseSheet';
import { ResultSheet } from './ResultSheet';
import { Router } from './Router';
import { SettingsSheet } from './SettingsSheet';
import { TestSheet } from './TestSheet';
import { Sticks } from './Sticks';
import { Toast } from './Toast';
import { createTurnHint } from './TurnHint';
import { HomeScreen } from './screens/HomeScreen';
import { RankingScreen } from './screens/RankingScreen';
import { SelectScreen } from './screens/SelectScreen';
import { ShopScreen } from './screens/ShopScreen';

export function mountUi(root: HTMLElement, game: Phaser.Game): Router {
  const ranking = new LocalRanking(localStorage);
  const settings = new SettingsSheet();
  const home = new HomeScreen();
  const select = new SelectScreen();
  const shop = new ShopScreen();
  const rankingScreen = new RankingScreen(ranking);
  // 런의 아침 화면 (2026-11-23 밤 나들이)
  const morning = new MorningSheet();
  const hud = new Hud();
  hud.el.querySelector('.hud-top')?.append(new BossBar().el);
  // 두 스틱은 아래 띠 바로 위에 (2026-11-04 브롤스타즈식 조작)
  hud.el.querySelector('.hud-bottom')?.append(new Sticks().el);

  root.append(
    home.el,
    select.el,
    shop.el,
    rankingScreen.el,
    morning.el,
    hud.el,
    new Toast().el,
    // 하이라이트 컷 (2026-11-27): 밤 중 초상 배너는 토스트 자리, 그림 컷은 아침 화면 위
    new PortraitLine().el,
    new PauseSheet().el,
    new ResultSheet(ranking).el,
    new HighlightCut().el,
    settings.el,
    new TestSheet().el,
    createTurnHint(),
  );
  const router = new Router(game, root, { home, select, ranking: rankingScreen, morning });
  // 휴대폰 뒤로가기·앞으로가기 → 앱 안의 단계 이동 (2026-11-13 라이언, 앞으로가기로 게임에 들어가지 않음 · 판 중 뒤로 = 일시정지 2026-11-24)
  const back = installHistoryNav(router, root);
  // 화면 가장자리에서 안쪽으로 당기면 같은 뒤로 (2026-11-24 라이언)
  installEdgeSwipe(root, back);
  return router;
}
