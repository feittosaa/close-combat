import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  private readonly handleEnter = (): void => this.startFight();
  private readonly handleTraining = (): void => this.startFight('tester', 'training');
  private readonly handleShutdown = (): void => {
    this.input.keyboard?.off('keydown-ENTER', this.handleEnter);
    this.input.keyboard?.off('keydown-T', this.handleTraining);
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
      .text(width / 2, height * 0.64, 'ENTER · PARTIDA LOCAL', {
        color: '#ffd166',
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    start.on('pointerdown', () => this.startFight());
    const training = this.add.text(width / 2, height * 0.73, 'T · TREINO DE COMBATE', {
      color: '#8cb4ff', fontFamily: 'Arial, sans-serif', fontSize: '20px',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    training.on('pointerdown', this.handleTraining);
    this.add.text(width / 2, height * 0.83, 'TESTER · CAIS', {
      color: '#b5b1bd', fontSize: '13px',
    }).setOrigin(0.5);
    this.input.keyboard?.on('keydown-ENTER', this.handleEnter);
    this.input.keyboard?.on('keydown-T', this.handleTraining);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown);
  }

  private startFight(fighterId = 'tester', mode: 'versus' | 'training' = 'versus'): void {
    this.input.keyboard?.off('keydown-ENTER', this.handleEnter);
    this.scene.start('FightScene', { fighterId, mode });
  }
}
