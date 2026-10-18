// src/ui/CombatHud.ts
import Phaser from 'phaser';

/** HUD provisório. Valores reais devem ser recebidos da simulação. */
export class CombatHud {
  private readonly labels: Phaser.GameObjects.Text[];

  constructor(scene: Phaser.Scene, width: number) {
    this.labels = [
      scene.add.text(28, 24, 'JOGADOR 1', { color: '#f4f0e8', fontSize: '18px' }),
      scene.add.text(width - 150, 24, 'JOGADOR 2', { color: '#f4f0e8', fontSize: '18px' }),
      scene.add.text(width / 2, 24, '60', { color: '#ffd166', fontSize: '30px' }).setOrigin(0.5, 0),
    ];
  }

  destroy(): void {
    this.labels.forEach((label) => label.destroy());
  }
}
