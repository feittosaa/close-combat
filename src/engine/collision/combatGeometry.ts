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
  const box = character.collision.hurtboxes[!character.grounded ? 'airborne' : character.crouching ? 'crouching' : 'standing'];
  return { ownerId: character.characterId,
    x: character.x + box.offsetX * (character.facing === 'right' ? 1 : -1) - box.width / 2,
    y: character.y + box.offsetY, width: box.width, height: box.height };
}
