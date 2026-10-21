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
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MenuScene, FightScene],
});

export default game;
