import type Phaser from 'phaser';
import type { CharacterState } from '../engine/characters/CharacterState';
import { createHurtbox } from '../engine/collision/combatGeometry';

/** Behind the fighters (depth 9 and 10) and in front of every stage layer. */
const DEPTH = 8;
const LAYERS = 4;
/** Height above the floor, in world pixels, at which a shadow has faded away. */
const FADE_HEIGHT = 320;

/** Soft shadow on the floor under each fighter: it narrows and fades as the fighter rises, so jumps read as height. */
export class ContactShadows {
  private readonly graphics: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(DEPTH);
  }
  update(fighters: readonly CharacterState[], floorY: number, hidden: readonly boolean[]): void {
    this.graphics.clear();
    fighters.forEach((fighter, index) => {
      if (hidden[index]) return;
      const air = Math.max(0, Math.min(1, (floorY - fighter.y) / FADE_HEIGHT));
      const width = createHurtbox(fighter).width * (1.7 - .6 * air), height = 17 * (1 - .4 * air);
      for (let layer = 0; layer < LAYERS; layer++) {
        const grow = 1 - layer / LAYERS * .6;
        this.graphics.fillStyle(0x000000, .1 * (1 - air)).fillEllipse(fighter.x, floorY + 2, width * grow, height * grow);
      }
    });
  }
  destroy(): void { this.graphics.destroy(); }
}
