import Phaser from 'phaser';
import menuBackground from '../../assets/art/wallpapers/cowboy-menu.png';
import menuReference from '../../assets/art/menu/patio-solar.png';
import { configureUiCamera } from '../rendering/presentation';
import { preloadCowboySprites } from '../rendering/animations/cowboySprites';
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
      this.loadingScreen.textContent = 'PREPARANDO A ARENA…';
      document.body.appendChild(this.loadingScreen);
    }
    const advance = () => {
      if (!this.loadingScreen || !wallpapers.length) return;
      this.loadingScreen.style.backgroundImage = `linear-gradient(0deg, #100e12dd, transparent 70%), url(${JSON.stringify(wallpapers[nextWallpaper++ % wallpapers.length])})`;
      try { sessionStorage.setItem('close-combat-wallpaper', String(nextWallpaper)); } catch { /* Keep loading without storage. */ }
    };
    advance();
    if (this.loadingScreen) this.wallpaperTimer = window.setInterval(advance, 3500);
    this.load.image('menu-solar', menuBackground);
    this.load.image('menu-reference', menuReference);
    stages.forEach(stage => preloadStage(this, stage));
    preloadCowboySprites(this);
    preloadContactEffects(this);
    preloadPresentations(this);
    preloadFightSounds(this);
    preloadFighterIcons(this);
  }
  create(): void {
    if (this.wallpaperTimer !== undefined) window.clearInterval(this.wallpaperTimer);
    this.loadingScreen?.remove();
    this.loadingScreen = undefined;
    this.scene.start('MenuScene');
  }
}
