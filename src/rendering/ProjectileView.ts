import type Phaser from 'phaser';
import { getCharacterById } from '../engine/data/characters';
import { createProjectileHitbox } from '../engine/collision/projectileGeometry';
import type { ExplosionState } from '../engine/combat/ultimateActivation';
import type { ProjectileState } from '../engine/combat/ProjectileState';

/** Temporary geometric markers, no generated art or authored animation. */
export class ProjectileView {
  private readonly graphics: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene) { this.graphics = scene.add.graphics().setDepth(11); }
  sync(projectiles: readonly ProjectileState[], explosions: readonly ExplosionState[] = []): void {
    const g = this.graphics.clear();
    for (const p of projectiles) {
      const move = getCharacterById(p.fighterId)?.moves.find(m=>m.id===p.attack.moveId);
      if(!move)continue;
      const box=createProjectileHitbox(p,move);
      const size = box.width / (p.visual === 'lighter' ? 8 : p.visual === 'glass' ? 22 : 30);
      const x = 0, y = 0;
      g.save().translateCanvas(box.x + box.width / 2, box.y + box.height / 2).scaleCanvas(size, size);
      g.lineStyle(1.5, 0xf4dfb0, 1);
      if (p.visual === 'bullet') {
        g.fillStyle(0xe7b65b).fillRoundedRect(-12, -5, 24, 10, 5);
      } else if (p.visual === 'lighter') {
        g.fillStyle(0xc7b79d).fillRect(x-3,y-5,6,10);
        g.fillStyle(0xffc65c).fillTriangle(x-3,y-6,x+3,y-6,x,y-15);
      } else if (p.visual === 'glass') {
        g.fillStyle(0x862c41).fillRect(x - 6, y - 10, 12, 8);
        g.strokeRect(x - 7, y - 13, 14, 13).lineBetween(x, y, x, y + 9).lineBetween(x - 6, y + 9, x + 6, y + 9);
      } else {
        g.fillStyle(0x354d39).fillRoundedRect(x - 7, y - 14, 14, 27, 3);
        g.fillRect(x - 3, y - 21, 6, 9);
        g.fillStyle(0xd7c49b).fillRect(x - 6, y - 5, 12, 11);
        if (p.visual === 'molotov') g.fillStyle(0xf8a84b).fillTriangle(x - 4, y - 22, x + 7, y - 22, x + 3, y - 39);
      }
      g.restore();
    }
    for (const explosion of explosions) {
      const radius = 18 + (10-explosion.remainingFrames)*3;
      g.fillStyle(0xf77b32,explosion.remainingFrames/12).fillCircle(explosion.x,explosion.y,radius);
      g.lineStyle(2,0xffdda0,explosion.remainingFrames/10).strokeCircle(explosion.x,explosion.y,radius+5);
    }
  }
  destroy(): void { this.graphics.destroy(); }
}
