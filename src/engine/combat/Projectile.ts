import type { ProjectileDefinition } from '../data/moves';
import type { Hitbox } from '../collision/types';

/** Entidade lógica independente; nenhuma coordenada depende da arte. */
export interface ProjectileState {
  id: number;
  ownerId: string;
  fighterId: string;
  moveId: string;
  strikeIndex?: number;
  x: number;
  y: number;
  previousX: number;
  facing: 'left' | 'right';
  ageFrames: number;
  remainingFrames: number;
  hasHit: boolean;
  definition: ProjectileDefinition;
}

export function projectileHitbox(projectile: ProjectileState, swept = false): Hitbox {
  const box = projectile.definition.hitbox;
  const sign = projectile.facing === 'right' ? 1 : -1;
  const x = projectile.x + sign * box.forward - (sign < 0 ? box.width : 0);
  const dx = swept ? projectile.x - projectile.previousX : 0;
  return {
    ownerId: projectile.ownerId, attackId: projectile.moveId,
    x: x - Math.max(0, dx), y: projectile.y + box.yOffset,
    width: box.width + Math.abs(dx), height: box.height
  };
}
