import type Phaser from 'phaser';
import type { ProjectileState } from '../engine/combat/ProjectileState';

/** Temporary geometric markers, no generated art or authored animation. */
export class ProjectileView {
  private readonly graphics: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene) { this.graphics = scene.add.graphics().setDepth(11); }
  sync(projectiles: readonly ProjectileState[]): void {
    const g = this.graphics.clear();
    for (const p of projectiles) {
      const x = p.x, y = p.y - 94;
      g.lineStyle(1.5, 0xf4dfb0, 1);
      if (p.visual === 'glass') {
        g.fillStyle(0x862c41).fillRect(x - 6, y - 10, 12, 8);
        g.strokeRect(x - 7, y - 13, 14, 13).lineBetween(x, y, x, y + 9).lineBetween(x - 6, y + 9, x + 6, y + 9);
      } else {
        g.fillStyle(0x354d39).fillRoundedRect(x - 7, y - 14, 14, 27, 3);
        g.fillRect(x - 3, y - 21, 6, 9);
        g.fillStyle(0xd7c49b).fillRect(x - 6, y - 5, 12, 11);
        if (p.visual === 'molotov') g.fillStyle(0xf8a84b).fillTriangle(x - 4, y - 22, x + 7, y - 22, x + 3, y - 39);
      }
    }
  }
  destroy(): void { this.graphics.destroy(); }
}
