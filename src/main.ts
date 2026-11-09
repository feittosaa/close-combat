import { RENDER_SIZE } from './rendering/presentation';
import Phaser from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene';
import { FightScene } from './scenes/FightScene';
import { MenuScene } from './scenes/MenuScene';
import { applyDocumentLanguage } from './i18n/i18n';
import { loadDevTools } from './devMode';
import { registerPackedAtlasLoader } from './rendering/packedAtlas';

applyDocumentLanguage();
registerPackedAtlasLoader();

const startGame = (): Phaser.Game => new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: RENDER_SIZE.width,
  height: RENDER_SIZE.height,
  backgroundColor: '#101014',
  pixelArt: false,
  antialias: true,
  roundPixels: false,
  callbacks: {
    postBoot: (instance: Phaser.Game): void => {
      // O canvas precisa receber foco para teclado, navegação e automação acessível.
      instance.canvas.tabIndex = 0;
      instance.canvas.setAttribute('aria-label', 'Close Combat');
      instance.canvas.addEventListener('pointerdown', () => instance.canvas.focus());
      instance.canvas.focus();
    },
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, FightScene],
});

// The developer mode exists only on the development server: builds and tests never load it nor read its stored tuning.
if (import.meta.env.MODE === 'development') void loadDevTools().then(tools => tools.installDevTools()).finally(startGame);
else startGame();
