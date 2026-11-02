import Phaser from 'phaser';
import menuBackground from '../../assets/art/menu/cowboy-menu.png';
import menuReference from '../../assets/art/menu/patio-solar.png';
import { configureUiCamera, LOGICAL_VIEW } from '../rendering/presentation';
import { preloadCowboySprites } from '../rendering/animations/cowboySprites';
import { stages } from '../rendering/stages/stageCatalog';
import { preloadStage } from '../rendering/stages/StageView';
import { preloadFighterIcons } from '../ui/fighterArt';
import { preloadFightSounds } from '../audio/FightSounds';

/** Shared match assets are ready before character selection becomes interactive. */
export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }
  preload(): void {
    configureUiCamera(this.cameras.main, this.scale);
    this.add.text(LOGICAL_VIEW.width / 2, LOGICAL_VIEW.height / 2, 'PREPARANDO A ARENA…', {
      fontSize: '18px', color: '#e6c78d',
    }).setOrigin(.5);
    this.load.image('menu-solar', menuBackground);
    this.load.image('menu-reference', menuReference);
    stages.forEach(stage => preloadStage(this, stage));
    preloadCowboySprites(this);
    preloadFightSounds(this);
    preloadFighterIcons(this);
  }
  create(): void {
    this.scene.start('MenuScene');
  }
}
