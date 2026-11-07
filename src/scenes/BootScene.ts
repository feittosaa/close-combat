import Phaser from 'phaser';
import { t } from '../i18n/i18n';
import { loadInterfaceFonts } from '../ui/hudTheme';
import menuBackground from '../../assets/art/wallpapers/cowboy-menu.png';
import bobMenuBackground from '../../assets/art/wallpapers/bob-menu.png';
import { configureUiCamera } from '../rendering/presentation';
import { preloadCowboySprites } from '../rendering/animations/cowboySprites';
import { preloadShotoSprites } from '../rendering/animations/shotoSprites';
import { stages } from '../rendering/stages/stageCatalog';
import { preloadStage } from '../rendering/stages/StageView';
import { preloadFighterIcons } from '../ui/fighterArt';
import { preloadFightSounds } from '../audio/FightSounds';
import { preloadContactEffects } from '../rendering/contactEffects';
import { preloadPresentations } from '../rendering/stages/stagePresentationAssets';

const wallpapers = Object.values(import.meta.glob<string>('../../assets/art/wallpapers/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' }));
let nextWallpaper = 0;
try { nextWallpaper = Number(sessionStorage.getItem('close-combat-wallpaper') ?? 0) || 0; } catch { /* Storage may be unavailable. */ }

/** Shared match assets are ready before character selection becomes interactive. */
export class BootScene extends Phaser.Scene {
  private loadingScreen?: HTMLElement;
  private wallpaperTimer?: number;
  constructor() { super('BootScene'); }
  preload(): void {
    configureUiCamera(this.cameras.main, this.scale);
    if (typeof document !== 'undefined') {
      this.loadingScreen = document.createElement('div');
      this.loadingScreen.className = 'loading-screen';
      this.loadingScreen.setAttribute('role', 'status');
      this.loadingScreen.textContent = t('boot.loading');
      document.body.appendChild(this.loadingScreen);
    }
    const advance = () => {
      if (!this.loadingScreen || !wallpapers.length) return;
      const index = nextWallpaper++;
      this.loadingScreen.className = `loading-screen ${index % 2 === 0 ? 'wallpaper-left' : 'wallpaper-right'}`;
      this.loadingScreen.style.setProperty('--loading-wallpaper', `url(${JSON.stringify(wallpapers[index % wallpapers.length])})`);
      try { sessionStorage.setItem('close-combat-wallpaper', String(nextWallpaper)); } catch { /* Keep loading without storage. */ }
    };
    advance();
    if (this.loadingScreen) this.wallpaperTimer = window.setInterval(advance, 20000);
    this.load.image('menu-solar', menuBackground);
    this.load.image('menu-bob', bobMenuBackground);
    stages.forEach(stage => preloadStage(this, stage));
    preloadCowboySprites(this);
    preloadShotoSprites(this);
    preloadContactEffects(this);
    preloadPresentations(this);
    preloadFightSounds(this);
    preloadFighterIcons(this);
  }
  create(): void {
    if (this.wallpaperTimer !== undefined) window.clearInterval(this.wallpaperTimer);
    // Canvas text (HUD, tutorial) uses the menu faces: start once they are ready.
    const start = () => {
      this.loadingScreen?.remove();
      this.loadingScreen = undefined;
      this.scene.start('MenuScene');
    };
    const fonts = loadInterfaceFonts();
    if (fonts) void fonts.then(start); else start();
  }
}
