// src/ui/CombatHud.ts
import Phaser from 'phaser';
import type { SimulationSnapshot } from '../engine/simulation/Simulation';

/** HUD provisório, atualizado exclusivamente a partir de um snapshot da simulação. */
export class CombatHud {
  private readonly labels: Phaser.GameObjects.Text[];
  private readonly healthGraphics: Phaser.GameObjects.Graphics;
  private readonly timer: Phaser.GameObjects.Text;
  private readonly roundLabel: Phaser.GameObjects.Text;
  private readonly hitLabel: Phaser.GameObjects.Text;
  private readonly barWidth = 360;
  private readonly barHeight = 22;
  private readonly sidePadding = 28;

  constructor(scene: Phaser.Scene, width: number) {
    this.labels = [
      scene.add.text(this.sidePadding, 18, 'JOGADOR 1', { color: '#f4f0e8', fontSize: '16px' }),
      scene.add.text(width - this.sidePadding, 18, 'JOGADOR 2', { color: '#f4f0e8', fontSize: '16px' }).setOrigin(1, 0),
    ];
    this.healthGraphics = scene.add.graphics();
    this.timer = scene.add.text(width / 2, 14, '99', {
      color: '#ffd166',
      fontSize: '32px',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.roundLabel = scene.add.text(width / 2, 52, 'ROUND 1', {
      color: '#f4f0e8',
      fontSize: '12px',
    }).setOrigin(0.5, 0);
    this.hitLabel = scene.add.text(width / 2, 92, '', {
      color: '#ffd166',
      fontSize: '14px',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.updateBars([], width);
  }

  update(snapshot: SimulationSnapshot, width: number): void {
    this.timer.setText(String(Math.ceil(snapshot.roundFramesRemaining / 60)).padStart(2, '0'));
    this.roundLabel.setText(`ROUND ${snapshot.round}`);
    const hit = snapshot.hitEvents[0];
    this.hitLabel.setText(hit ? `HIT · -${hit.damage}` : '');
    this.updateBars(snapshot.characters, width);
  }

  destroy(): void {
    this.labels.forEach((label) => label.destroy());
    this.healthGraphics.destroy();
    this.timer.destroy();
    this.roundLabel.destroy();
    this.hitLabel.destroy();
  }

  private updateBars(
    characters: SimulationSnapshot['characters'] | [],
    width: number,
  ): void {
    this.healthGraphics.clear();
    const left = this.sidePadding;
    const right = width - this.sidePadding - this.barWidth;
    this.drawBarBackground(left, right);

    characters.forEach((character, index) => {
      const ratio = character.maxHealth > 0 ? character.health / character.maxHealth : 0;
      const fillWidth = this.barWidth * Phaser.Math.Clamp(ratio, 0, 1);
      this.healthGraphics.fillStyle(index === 0 ? 0xe45b5b : 0x5b8de4, 1);
      const x = index === 0 ? left : right + this.barWidth - fillWidth;
      this.healthGraphics.fillRect(x, 42, fillWidth, this.barHeight);
    });
  }

  private drawBarBackground(left: number, right: number): void {
    this.healthGraphics.fillStyle(0x494750, 1);
    this.healthGraphics.fillRect(left, 42, this.barWidth, this.barHeight);
    this.healthGraphics.fillRect(right, 42, this.barWidth, this.barHeight);
    this.healthGraphics.lineStyle(2, 0xf4f0e8, 0.75);
    this.healthGraphics.strokeRect(left, 42, this.barWidth, this.barHeight);
    this.healthGraphics.strokeRect(right, 42, this.barWidth, this.barHeight);
  }
}
