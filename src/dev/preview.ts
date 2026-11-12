// 개발 전용: 아직 동작이 없는 화면 상태를 레이아웃 확인용으로 띄운다. 빌드에는 들어가지 않는다.
//   ?autoplay=20&preview=boss   보스전 배치: 노월을 위쪽에 세우고 체력바를 띄운다 (노월의 동작은 M2)
//   ?autoplay=200&preview=dawn  스테이지를 거의 끝까지 돌려 아침 결과 화면을 본다
import Phaser from 'phaser';
import { bus } from '../core/events';
import { AnimKeys, TextureKeys } from '../core/TextureKeys';
import { texScale } from '../core/textureRes';
import { GameData, stageById } from '../data';
import { RunState } from '../core/RunState';

export function installPreview(game: Phaser.Game): void {
  const preview = new URLSearchParams(location.search).get('preview');
  if (!preview) return;

  bus.on('run:start', () => {
    const play = game.scene.getScene('Play') as Phaser.Scene & { clock?: { t: number } };
    if (preview === 'boss') {
      // 넓은 마을에서는 카메라가 움직이므로 화면 위쪽 가운데에 붙여 둔다 (배치 확인용)
      play.add
        .sprite(play.scale.width / 2, 230, TextureKeys.witch, 0)
        .setScrollFactor(0)
        .setDepth(200)
        .setScale(0.9 * texScale(TextureKeys.witch))
        .play(AnimKeys.witchIdle);
      setTimeout(() => {
        bus.emit('witch:spawn');
        bus.emit('boss:hp', { hp: 140, maxHp: GameData.enemies.find((e) => e.id === 'witch')?.hp ?? 200 });
      }, 50);
    }
    if (preview === 'dawn') {
      setTimeout(() => {
        if (play.clock) play.clock.t = stageById(RunState.stageId).durationSec - 3;
      }, 50);
    }
  });
}
