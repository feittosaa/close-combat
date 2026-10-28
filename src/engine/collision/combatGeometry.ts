import type { CharacterState } from '../characters/CharacterState';
import type { MoveDefinition } from '../data/moves';
import type { Hitbox, Hurtbox } from './types';

/** Geometria única para resolvedor e inspeção; nunca inferida dos desenhos. */
export function createHitbox(character: CharacterState, move: MoveDefinition): Hitbox {
  return { ownerId: character.characterId, attackId: move.id,
    x: character.facing === 'right' ? character.x + move.hitbox.forward : character.x - move.hitbox.forward - move.hitbox.width,
    y: character.y + move.hitbox.yOffset, width: move.hitbox.width, height: move.hitbox.height };
}
export function createHurtbox(character: CharacterState): Hurtbox {
  let box = character.collision.hurtboxes[character.mode === 'knockdown' && character.grounded ? 'knockdown' : !character.grounded ? 'airborne' : character.crouching ? 'crouching' : 'standing'];
  const jump = character.collision.jumpHurtboxes;
  if (jump && !character.grounded && character.mode === 'airborne') {
    const elapsed = character.airborneElapsedFrames ?? 0;
    box = elapsed >= jump.compactFromFrame && elapsed < jump.compactUntilFrame ? jump.compact : jump.extended;
  }
  return { ownerId: character.characterId,
    x: character.x + box.offsetX * (character.facing === 'right' ? 1 : -1) - box.width / 2,
    y: character.y + box.offsetY, width: box.width, height: box.height };
}
