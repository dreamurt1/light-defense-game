// 시작 씬: 바로 에셋을 불러오는 PreloadScene으로 넘어간다.
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.scene.start('Preload');
  }
}
