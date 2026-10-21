import type { CharacterState } from '../characters/CharacterState';
import type { MoveDefinition } from '../data/moves';
import type { Hitbox, Hurtbox } from './types';

/** The resolver and debug renderer share this geometry; never infer it from sprite pixels. */
export function createHitbox(character: CharacterState, move: MoveDefinition): Hitbox {
  return {
    ownerId: character.characterId,
    attackId: move.id,
    x: character.facing === 'right'
      ? character.x + move.hitbox.forward
      : character.x - move.hitbox.forward - move.hitbox.width,
    y: character.y + move.hitbox.yOffset,
    width: move.hitbox.width,
    height: move.hitbox.height,
  };
}

export function createHurtbox(character: CharacterState): Hurtbox {
  const profile = character.collision.hurtboxes;
  const stance = !character.grounded ? 'airborne'
    : character.attack?.hurtboxStance ?? (character.crouching ? 'crouching' : 'standing');
  const box = profile[stance];
  return {
    ownerId: character.characterId,
    x: character.x + box.offsetX * (character.facing === 'right' ? 1 : -1) - box.width / 2,
    y: character.y + box.offsetY,
    width: box.width,
    height: box.height,
  };
}
