import Phaser from 'phaser';
import menuBackground from '../../assets/art/menu/patio-solar.png';
import { configureUiCamera, LOGICAL_VIEW } from '../rendering/presentation';
import { preloadShotoSprites } from '../rendering/animations/shotoSprites';
import { stages } from '../rendering/stages/stageCatalog';
import { preloadStage } from '../rendering/stages/StageView';

/** Shared match assets are ready before character selection becomes interactive. */
export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }
  preload(): void {
    configureUiCamera(this.cameras.main, this.scale);
    this.add.text(LOGICAL_VIEW.width / 2, LOGICAL_VIEW.height / 2, 'PREPARANDO A ARENA…', {
      fontSize: '18px', color: '#e6c78d',
    }).setOrigin(.5);
    this.load.image('menu-solar', menuBackground);
    stages.forEach(stage => preloadStage(this, stage));
    preloadShotoSprites(this);
  }
  create(): void {
    this.scene.start('MenuScene');
  }
}
