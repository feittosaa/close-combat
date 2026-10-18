// src/engine/combat/AttackResolver.ts
import type { CharacterState } from '../characters/CharacterState';
import { getMoveById, type MoveDefinition } from '../data/moves';
import { intersects } from '../collision/intersects';
import type { Hitbox, Hurtbox } from '../collision/types';

export interface HitEvent {
  attackerId: string;
  targetId: string;
  moveId: string;
  damage: number;
}

/** Resolve contatos da simulação e fornece a geometria exata para a visualização. */
export class AttackResolver {
  constructor(private readonly bodyWidth: number) {}

  activeHitboxes(characters: readonly CharacterState[]): Hitbox[] {
    return characters.flatMap((character) => {
      const move = character.attack ? getMoveById(character.attack.moveId) : undefined;
      if (!move || !isActive(character, move)) return [];
      return [createHitbox(character, move)];
    });
  }

  resolve(characters: CharacterState[]): HitEvent[] {
    const pending: Array<{
      event: HitEvent;
      attack: NonNullable<CharacterState['attack']>;
      target: CharacterState;
    }> = [];

    characters.forEach((attacker, attackerIndex) => {
      const attack = attacker.attack;
      const move = attack ? getMoveById(attack.moveId) : undefined;
      if (!attack || attack.hasHit || !move || !isActive(attacker, move)) return;

      const target = characters[1 - attackerIndex];
      const hitbox = createHitbox(attacker, move);
      if (intersects(hitbox, createHurtbox(target, this.bodyWidth))) {
        pending.push({
          event: {
            attackerId: attacker.characterId,
            targetId: target.characterId,
            moveId: move.id,
            damage: move.damage,
          },
          attack,
          target,
        });
      }
    });

    // Calcular todos os contatos antes de aplicar efeitos permite trades determinísticos.
    pending.forEach(({ event, attack, target }) => {
      const move = getMoveById(event.moveId);
      if (!move) return;
      attack.hasHit = true;
      target.health = Math.max(0, target.health - move.damage);
      target.mode = 'hitstun';
      target.remainingStateFrames = Math.max(target.remainingStateFrames, move.hitstun);
      target.attack = undefined;
      target.crouching = false;
      target.hitFlashFrames = 5;
    });

    return pending.map(({ event }) => event);
  }
}

function isActive(character: CharacterState, move: MoveDefinition): boolean {
  const frame = character.attack?.elapsedFrames ?? -1;
  return frame >= move.startup && frame < move.startup + move.activeFrames;
}

function createHitbox(character: CharacterState, move: MoveDefinition): Hitbox {
  const facingRight = character.facing === 'right';
  return {
    ownerId: character.characterId,
    attackId: move.id,
    x: facingRight
      ? character.x + move.hitbox.forward
      : character.x - move.hitbox.forward - move.hitbox.width,
    y: character.y + move.hitbox.yOffset,
    width: move.hitbox.width,
    height: move.hitbox.height,
  };
}

function createHurtbox(character: CharacterState, bodyWidth: number): Hurtbox {
  const height = character.crouching ? 96 : 152;
  return {
    ownerId: character.characterId,
    x: character.x - bodyWidth / 2,
    y: character.y - height,
    width: bodyWidth,
    height,
  };
}
