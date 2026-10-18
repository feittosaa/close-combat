// src/engine/combat/AttackResolver.ts
import type { CharacterState } from '../characters/CharacterState';
import { getMoveById, type MoveDefinition } from '../data/moves';
import { intersects } from '../collision/intersects';
import type { Hitbox, Hurtbox } from '../collision/types';
import type { AttackButton, FrameInput } from '../../input/types';

export interface HitEvent {
  attackerId: string;
  targetId: string;
  moveId: string;
  damage: number;
  outcome: 'hit' | 'block' | 'parry' | 'throw-start' | 'throw-break' | 'throw';
  pushback: number;
  attackerRecoveryFrames?: number;
  defenderStunFrames?: number;
  attackerStunFrames?: number;
  frameAdvantage?: number;
  breakButtons?: readonly AttackButton[];
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

  resolve(
    characters: CharacterState[],
    inputs: readonly FrameInput[],
    freshlyPressed: readonly [ReadonlySet<AttackButton>, ReadonlySet<AttackButton>],
    freshBack: readonly [boolean, boolean],
  ): HitEvent[] {
    const resolvedThrows = this.resolveGrabStates(characters, freshlyPressed);
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
      if (move.throw) {
        if (!canGrab(attacker, target, move)) return;
        const brokenImmediately = matchesButtons(freshlyPressed[1 - attackerIndex] ?? new Set(), move.throw.breakButtons);
        pending.push({
          event: {
            ...emptyEvent(attacker.characterId, target.characterId, move.id),
            outcome: brokenImmediately ? 'throw-break' : 'throw-start',
            breakButtons: brokenImmediately ? undefined : move.throw.breakButtons,
          },
          attack,
          target,
        });
        return;
      }
      if (move.hitLevel === 'high' && target.crouching) return;
      if (intersects(hitbox, createHurtbox(target, this.bodyWidth))) {
        const targetInput = inputs[1 - attackerIndex];
        const parried = move.parryable === true && freshBack[1 - attackerIndex] === true;
        const blocked = !parried && target.mode === 'blocking' && canBlock(move.hitLevel, targetInput);
        const defenderStunFrames = blocked ? move.blockstun : move.hitstun;
        const totalAttackFrames = move.startup + move.activeFrames + move.recovery;
        // The contact frame has already happened; count only future locked frames.
        const attackerRecoveryFrames = Math.max(0, totalAttackFrames - attack.elapsedFrames - 1);
        pending.push({
          event: {
            attackerId: attacker.characterId,
            targetId: target.characterId,
            moveId: move.id,
            damage: blocked || parried ? 0 : move.damage,
            outcome: parried ? 'parry' : blocked ? 'block' : 'hit',
            pushback: blocked || parried ? 0 : move.pushback.hit,
            attackerRecoveryFrames: parried ? undefined : attackerRecoveryFrames,
            defenderStunFrames: parried ? undefined : defenderStunFrames,
            attackerStunFrames: parried ? PARRY_STUN_FRAMES : undefined,
            frameAdvantage: parried ? undefined : attackerRecoveryFrames - defenderStunFrames,
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
      attack.hitOutcome = event.outcome === 'hit' || event.outcome === 'block' ? event.outcome : undefined;
      if (event.outcome === 'hit' || event.outcome === 'block' || event.outcome === 'parry') attack.hitElapsedFrames = attack.elapsedFrames;
      if (event.outcome === 'throw-start' || event.outcome === 'throw-break') {
        const attacker = characters.find((character) => character.characterId === event.attackerId);
        const throwMove = move.throw;
        if (!attacker || !throwMove) return;
        attacker.attack = undefined;
        attacker.mode = 'throwRecovery';
        attacker.remainingStateFrames = event.outcome === 'throw-break'
          ? throwMove.breakRecovery
          : throwMove.breakFrames + move.recovery;
        if (event.outcome === 'throw-start') {
          target.mode = 'grabbed';
          target.remainingStateFrames = throwMove.breakFrames;
          target.grab = {
            attackerId: attacker.characterId,
            moveId: move.id,
            remainingFrames: throwMove.breakFrames,
          };
        } else {
          target.grab = undefined;
          if (target.mode === 'grabbed') {
            target.mode = 'neutral';
            target.remainingStateFrames = 0;
          }
        }
        return;
      }
      if (event.outcome === 'parry') {
        const attacker = characters.find((character) => character.characterId === event.attackerId);
        if (attacker) {
          attacker.attack = undefined;
          attacker.mode = 'hitstun';
          attacker.remainingStateFrames = Math.max(attacker.remainingStateFrames, PARRY_STUN_FRAMES);
          attacker.hitFlashFrames = 5;
        }
        return;
      }
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

    return [...resolvedThrows, ...pending.map(({ event }) => event)];
  }

  private resolveGrabStates(
    characters: CharacterState[],
    freshlyPressed: readonly [ReadonlySet<AttackButton>, ReadonlySet<AttackButton>],
  ): HitEvent[] {
    const events: HitEvent[] = [];
    characters.forEach((target, targetIndex) => {
      const grab = target.grab;
      if (!grab || target.mode !== 'grabbed') return;
      const attacker = characters.find((character) => character.characterId === grab.attackerId);
      const move = getMoveById(grab.moveId);
      if (!attacker || !move?.throw) {
        target.grab = undefined;
        target.mode = 'neutral';
        target.remainingStateFrames = 0;
        return;
      }

      if (matchesButtons(freshlyPressed[targetIndex] ?? new Set(), move.throw.breakButtons)) {
        target.grab = undefined;
        target.mode = 'neutral';
        target.remainingStateFrames = 0;
        target.crouching = false;
        attacker.mode = 'throwRecovery';
        attacker.remainingStateFrames = move.throw.breakRecovery;
        events.push({
          ...emptyEvent(attacker.characterId, target.characterId, move.id),
          outcome: 'throw-break',
        });
        return;
      }

      grab.remainingFrames -= 1;
      target.remainingStateFrames = grab.remainingFrames;
      if (grab.remainingFrames > 0) return;

      target.grab = undefined;
      target.health = Math.max(0, target.health - move.damage);
      target.mode = 'hitstun';
      target.remainingStateFrames = move.hitstun;
      target.crouching = false;
      target.hitFlashFrames = 5;
      events.push({
        ...emptyEvent(attacker.characterId, target.characterId, move.id),
        outcome: 'throw',
        damage: move.damage,
        attackerRecoveryFrames: move.recovery,
        defenderStunFrames: move.hitstun,
        frameAdvantage: move.recovery - move.hitstun,
      });
    });
    return events;
  }
}

const PARRY_STUN_FRAMES = 18;

function emptyEvent(attackerId: string, targetId: string, moveId: string): HitEvent {
  return { attackerId, targetId, moveId, damage: 0, outcome: 'hit', pushback: 0 };
}

function matchesButtons(pressed: ReadonlySet<AttackButton>, required: readonly AttackButton[]): boolean {
  return pressed.size === required.length && required.every((button) => pressed.has(button));
}

function canGrab(attacker: CharacterState, target: CharacterState, move: MoveDefinition): boolean {
  if (!move.throw || !attacker.grounded || !target.grounded || target.crouching || target.attack) return false;
  if (!['neutral', 'moving', 'blocking'].includes(target.mode)) return false;
  const direction = attacker.facing === 'right' ? 1 : -1;
  const distance = (target.x - attacker.x) * direction;
  return distance >= 0 && distance <= move.throw.range;
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
