// 캔버스 위 DOM UI 레이어를 조립한다: 메뉴 화면들 + 플레이 HUD(두 스틱 포함) + 시트(일시정지·결과·설정).
import type Phaser from 'phaser';
import { LocalRanking } from '../services/LocalRanking';
import { installHistoryNav } from './HistoryNav';
import { BossBar } from './BossBar';
import { Hud } from './Hud';
import { PauseSheet } from './PauseSheet';
import { ResultSheet } from './ResultSheet';
import { Router } from './Router';
import { SettingsSheet } from './SettingsSheet';
import { TestSheet } from './TestSheet';
import { Sticks } from './Sticks';
import { Toast } from './Toast';
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
  const hud = new Hud();
  hud.el.querySelector('.hud-top')?.append(new BossBar().el);
  // 두 스틱은 아래 띠 바로 위에 (2026-11-04 브롤스타즈식 조작)
  hud.el.querySelector('.hud-bottom')?.append(new Sticks().el);

  root.append(
    home.el,
    select.el,
    shop.el,
    rankingScreen.el,
    hud.el,
    new Toast().el,
    new PauseSheet().el,
    new ResultSheet(ranking).el,
    settings.el,
    new TestSheet().el,
  );
  const router = new Router(game, root, { home, select, ranking: rankingScreen });
  // 휴대폰 뒤로가기·앞으로가기 → 앱 안의 단계 이동 (2026-11-13 라이언, 게임 중 제외·앞으로가기로 게임에 들어가지 않음)
  installHistoryNav(router, root);
  return router;
}
