import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  private readonly handleEnter = (): void => this.startFight();
  private readonly handleShutdown = (): void => {
    this.input.keyboard?.off('keydown-ENTER', this.handleEnter);
  };

  constructor() {
    super('MenuScene');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height * 0.36, 'CLOSE COMBAT', {
        color: '#f4f0e8',
        fontFamily: 'Arial, sans-serif',
        fontSize: '56px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.51, 'PROTÓTIPO DE COMBATE 2D', {
        color: '#b5b1bd',
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        letterSpacing: 3,
      })
      .setOrigin(0.5);

    const start = this.add
      .text(width / 2, height * 0.68, 'PRESSIONE ENTER PARA COMEÇAR', {
        color: '#ffd166',
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    start.on('pointerdown', () => this.startFight());
    this.input.keyboard?.on('keydown-ENTER', this.handleEnter);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown);
  }

  private startFight(): void {
    this.input.keyboard?.off('keydown-ENTER', this.handleEnter);
    this.scene.start('FightScene');
  }
}
