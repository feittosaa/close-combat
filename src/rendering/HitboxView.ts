// src/rendering/HitboxView.ts
import Phaser from 'phaser';
import type { Hitbox } from '../engine/collision/types';
import type { CharacterState } from '../engine/characters/CharacterState';
import { createHurtbox } from '../engine/collision/combatGeometry';

/** Desenha as mesmas hitboxes retangulares usadas pelo AttackResolver. */
export class HitboxView {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private visible = true;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(20);
  }

  update(hitboxes: readonly Hitbox[], frame: number, characters: readonly CharacterState[] = []): void {
    this.graphics.clear();
    if (!this.visible) return;
    const pulse = 0.28 + (frame % 4) * 0.08;

    hitboxes.forEach((hitbox) => {
      const color = hitbox.ownerId === 'player-1' ? 0xff4f70 : 0x5bc0ff;
      this.graphics.fillStyle(color, pulse);
      this.graphics.fillRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
      this.graphics.lineStyle(3, color, 1);
      this.graphics.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
    });
    characters.forEach((character) => {
      const box = createHurtbox(character);
      this.graphics.lineStyle(1, 0x71f5b3, 0.9);
      this.graphics.strokeRect(box.x, box.y, box.width, box.height);
      this.graphics.lineStyle(2, 0xffffff, 0.9);
      this.graphics.lineBetween(character.x - 4, character.y, character.x + 4, character.y);
      this.graphics.lineBetween(character.x, character.y - 4, character.x, character.y + 4);
    });
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.graphics.setVisible(visible);
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
