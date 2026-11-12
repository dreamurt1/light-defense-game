// public/assets/manifest.json을 읽어 모든 스프라이트 시트를 불러오고 애니메이션을 등록한다.
// 그림은 src/art가 아니라 파일에서 온다: 실제 일러스트로 바꿀 때 같은 이름·규격의 PNG만 교체하면 된다.
import Phaser from 'phaser';
import { MANIFEST_URL, type Manifest } from '../art/manifest';
import { bus } from '../core/events';
import { TextureKeys } from '../core/TextureKeys';
import { AIM_CIRCLE } from '../art/vectors';
import { setTextureRes } from '../core/textureRes';

const MANIFEST_KEY = 'asset-manifest';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    // 스플래시 막대가 따라 차오른다 (ui/Splash.ts)
    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => bus.emit('ui:load-progress', { value }));
    this.load.json(MANIFEST_KEY, MANIFEST_URL);
    // 공격 범위 표시는 벡터(SVG)를 이 크기로 그려 쓴다 (src/art/vectors.ts)
    this.load.svg(TextureKeys.aimCircle, 'assets/ui/aim-circle.svg', { width: AIM_CIRCLE.size, height: AIM_CIRCLE.size });
    // manifest가 도착하면 같은 로딩 안에서 시트들을 이어서 불러온다
    this.load.once(`filecomplete-json-${MANIFEST_KEY}`, (_key: string, _type: string, data: Manifest) => {
      for (const s of data.sheets) {
        if (s.load === false) continue;
        const res = s.res ?? 1;
        setTextureRes(s.key, res);
        this.load.spritesheet(s.key, `assets/${s.file}`, { frameWidth: Math.round(s.frameWidth * res), frameHeight: Math.round(s.frameHeight * res) });
      }
    });
  }

  create(): void {
    const manifest = this.cache.json.get(MANIFEST_KEY) as Manifest;
    for (const s of manifest.sheets) {
      if (s.load === false) continue;
      for (const a of s.anims) {
        if (this.anims.exists(a.key)) continue;
        this.anims.create({
          key: a.key,
          frames: this.anims.generateFrameNumbers(s.key, { frames: a.frames }),
          frameRate: a.frameRate,
          repeat: a.repeat,
        });
      }
    }
    bus.emit('ui:assets-ready');
  }
}
