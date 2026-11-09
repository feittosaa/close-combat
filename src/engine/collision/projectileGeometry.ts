import type { ProjectileState } from '../combat/ProjectileState';
import type { MoveDefinition } from '../data/moves';
import type { Hitbox } from './types';

/** One geometry contract for collision, inspection and provisional projectile drawings. */
export function createProjectileHitbox(projectile: Pick<ProjectileState,'ownerId'|'x'|'y'|'facing'>, move: MoveDefinition): Hitbox {
  const box = move.hitbox;
  return {ownerId:projectile.ownerId,attackId:move.id,
    x:projectile.facing==='right'?projectile.x+box.forward:projectile.x-box.forward-box.width,
    y:projectile.y+box.yOffset,width:box.width,height:box.height};
}
