import Phaser from 'phaser';
import './style.css';
import { FightScene } from './scenes/FightScene';
import { MenuScene } from './scenes/MenuScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1024,
  height: 576,
  backgroundColor: '#101014',
  pixelArt: true,
  roundPixels: true,
  callbacks: {
    postBoot: (instance: Phaser.Game): void => {
      // O canvas precisa receber foco para teclado, navegação e automação acessível.
      instance.canvas.tabIndex = 0;
      instance.canvas.setAttribute('aria-label', 'Close Combat — jogo e menus');
      instance.canvas.addEventListener('pointerdown', () => instance.canvas.focus());
      instance.canvas.focus();
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MenuScene, FightScene],
});

export default game;
