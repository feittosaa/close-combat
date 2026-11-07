import Phaser from 'phaser';
import { loadInterfaceFonts } from '../ui/hudTheme';
import menuBackground from '../../assets/art/wallpapers/cowboy-menu.png';
import bobMenuBackground from '../../assets/art/wallpapers/bob-menu.png';
import { configureUiCamera } from '../rendering/presentation';
import { preloadFighterIcons } from '../ui/fighterArt';
import { preloadFightSounds } from '../audio/FightSounds';
import { preloadContactEffects } from '../rendering/contactEffects';
import { showLoadingScreen } from '../ui/loadingScreen';

/** Menu art and what every match shares (icons, contact effects and sounds); each match loads its own fighters and stage. */
export class BootScene extends Phaser.Scene {
  private closeLoadingScreen?: () => void;
  constructor() { super('BootScene'); }
  preload(): void {
    configureUiCamera(this.cameras.main, this.scale);
    this.closeLoadingScreen = showLoadingScreen();
    this.load.image('menu-solar', menuBackground);
    this.load.image('menu-bob', bobMenuBackground);
    preloadContactEffects(this);
    preloadFightSounds(this);
    preloadFighterIcons(this);
  }
  create(): void {
    // Canvas text (HUD, tutorial) uses the menu faces: start once they are ready.
    const start = () => {
      this.closeLoadingScreen?.();
      this.closeLoadingScreen = undefined;
      this.scene.start('MenuScene');
    };
    const fonts = loadInterfaceFonts();
    if (fonts) void fonts.then(start); else start();
  }
}
