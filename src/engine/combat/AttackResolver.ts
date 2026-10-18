// src/engine/combat/AttackResolver.ts
import type { CharacterState } from '../characters/CharacterState';
import { getMoveById, type MoveDefinition } from '../data/moves';
import { intersects } from '../collision/intersects';
import type { Hitbox, Hurtbox } from '../collision/types';
import type { FrameInput } from '../../input/types';

export interface HitEvent {
  attackerId: string;
  targetId: string;
  moveId: string;
  damage: number;
  outcome: 'hit' | 'block';
  pushback: number;
  attackerRecoveryFrames: number;
  defenderStunFrames: number;
  frameAdvantage: number;
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

  resolve(characters: CharacterState[], inputs: readonly FrameInput[]): HitEvent[] {
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
      if (move.hitLevel === 'high' && target.crouching) return;
      if (intersects(hitbox, createHurtbox(target, this.bodyWidth))) {
        const targetInput = inputs[1 - attackerIndex];
        const blocked = target.mode === 'blocking' && canBlock(move.hitLevel, targetInput);
        const defenderStunFrames = blocked ? move.blockstun : move.hitstun;
        const totalAttackFrames = move.startup + move.activeFrames + move.recovery;
        // The contact frame has already happened; count only future locked frames.
        const attackerRecoveryFrames = Math.max(0, totalAttackFrames - attack.elapsedFrames - 1);
        pending.push({
          event: {
            attackerId: attacker.characterId,
            targetId: target.characterId,
            moveId: move.id,
            damage: blocked ? 0 : move.damage,
            outcome: blocked ? 'block' : 'hit',
            pushback: blocked ? move.pushback.block : move.pushback.hit,
            attackerRecoveryFrames,
            defenderStunFrames,
            frameAdvantage: attackerRecoveryFrames - defenderStunFrames,
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
      if (event.outcome === 'block') {
        target.mode = 'blockstun';
        target.remainingStateFrames = Math.max(target.remainingStateFrames, move.blockstun);
      } else {
        target.health = Math.max(0, target.health - move.damage);
        target.mode = 'hitstun';
        target.remainingStateFrames = Math.max(target.remainingStateFrames, move.hitstun);
        target.hitFlashFrames = 5;
      }
      target.attack = undefined;
      target.crouching = false;
    });

    return pending.map(({ event }) => event);
  }
}

function canBlock(hitLevel: MoveDefinition['hitLevel'], input: FrameInput | undefined): boolean {
  if (!input) return false;
  if (hitLevel === 'low') return input.direction === 'DB';
  return input.direction === 'B';
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
