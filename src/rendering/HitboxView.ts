// src/rendering/HitboxView.ts
import Phaser from 'phaser';
import type { Hitbox } from '../engine/collision/types';

/** Desenha as mesmas hitboxes retangulares usadas pelo AttackResolver. */
export class HitboxView {
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(20);
  }

  update(hitboxes: readonly Hitbox[], frame: number): void {
    this.graphics.clear();
    const pulse = 0.28 + (frame % 4) * 0.08;

    hitboxes.forEach((hitbox) => {
      const color = hitbox.ownerId === 'player-1' ? 0xff4f70 : 0x5bc0ff;
      this.graphics.fillStyle(color, pulse);
      this.graphics.fillRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
      this.graphics.lineStyle(3, color, 1);
      this.graphics.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
    });
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
