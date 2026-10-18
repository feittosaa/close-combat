// src/rendering/CombatantView.ts
import Phaser from 'phaser';

/** Representação temporária de um lutador, sem autoridade sobre a simulação. */
export class CombatantView {
  readonly body: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number, color: number) {
    this.body = scene.add.rectangle(x, y, 54, 152, color).setOrigin(0.5, 1);
  }

  setPosition(x: number, y: number): void {
    this.body.setPosition(x, y);
  }

  destroy(): void {
    this.body.destroy();
  }
}
