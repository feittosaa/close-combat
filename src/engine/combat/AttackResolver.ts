// src/engine/combat/AttackResolver.ts
import type { CharacterState } from '../characters/CharacterState';
import type { MoveDefinition } from '../data/moves';
import { intersects } from '../collision/intersects';
import type { Hitbox } from '../collision/types';
import { createHitbox, createHurtbox } from '../collision/combatGeometry';
import type { AttackButton, FrameInput } from '../../input/types';
import { classifyHitContext, frameAdvantage } from './frameData';
import { projectileHitbox, type ProjectileState } from './Projectile';
import type { HitContext } from './frameData';

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
  targetOffsetFromAttacker?: number;
  context?: HitContext;
  projectileId?: number;
  direction?: 'left' | 'right';
}

/** Resolve contatos da simulação e fornece a geometria exata para a visualização. */
export class AttackResolver {
  constructor(
    private readonly resolveMove: (fighterId: string, moveId: string) => MoveDefinition | undefined,
  ) {}

  activeHitboxes(characters: readonly CharacterState[]): Hitbox[] {
    return characters.flatMap((character) => {
      const move = character.attack ? this.resolveMove(character.fighterId, character.attack.moveId) : undefined;
      if (!move || !isActive(character, move) || (move.projectile && !move.projectile.melee)) return [];
      return [createHitbox(character, move)];
    });
  }

  resolve(
    characters: CharacterState[],
    inputs: readonly FrameInput[],
    freshlyPressed: readonly [ReadonlySet<AttackButton>, ReadonlySet<AttackButton>],
    freshBack: readonly [boolean, boolean],
    projectiles: readonly ProjectileState[] = [],
  ): HitEvent[] {
    const resolvedThrows = this.resolveGrabStates(characters, freshlyPressed);
    const pending: Array<{
      event: HitEvent;
      attack?: NonNullable<CharacterState['attack']>;
      projectile?: ProjectileState;
      target: CharacterState;
    }> = [];

    const queueStrike = (attacker: CharacterState, target: CharacterState, targetIndex: number,
      move: MoveDefinition, hitbox: Hitbox, attack?: CharacterState['attack'], projectile?: ProjectileState): void => {
      if (this.isStrikeInvulnerable(target)) return;
      if (move.hitLevel === 'high' && (target.crouching || (target.grounded && target.attack?.hurtboxStance === 'crouching'))) return;
      if (intersects(hitbox, createHurtbox(target))) {
        const targetInput = inputs[targetIndex];
        const parried = move.parryable === true && freshBack[targetIndex] === true;
        const blocked = !parried && (target.mode === 'blocking' || target.mode === 'blockstun') && canBlock(move.hitLevel, targetInput);
        const defenderStunFrames = Math.max(target.remainingStateFrames, blocked ? move.blockstun : move.hitstun);
        const currentMove = attacker.attack ? this.resolveMove(attacker.fighterId, attacker.attack.moveId) : undefined;
        const totalAttackFrames = currentMove ? currentMove.startup + currentMove.activeFrames + currentMove.recovery : 0;
        // The contact frame has already happened; count only future locked frames.
        const attackerRecoveryFrames = Math.max(0, totalAttackFrames - (attacker.attack?.elapsedFrames ?? 0) - 1);
        pending.push({
          event: {
            attackerId: attacker.characterId,
            targetId: target.characterId,
            moveId: move.id,
            projectileId: projectile?.id,
            direction: projectile?.facing,
            damage: blocked || parried ? 0 : move.damage,
            outcome: parried ? 'parry' : blocked ? 'block' : 'hit',
            pushback: parried ? 0 : blocked ? move.pushback.block : move.pushback.hit,
            attackerRecoveryFrames: parried ? undefined : attackerRecoveryFrames,
            defenderStunFrames: parried ? undefined : defenderStunFrames,
            attackerStunFrames: parried && !projectile ? PARRY_STUN_FRAMES : undefined,
            frameAdvantage: parried ? undefined : frameAdvantage(attackerRecoveryFrames, defenderStunFrames),
            context: !blocked && !parried ? classifyHitContext(target) : undefined,
          },
          attack,
          projectile,
          target,
        });
      }
    };

    characters.forEach((attacker, attackerIndex) => {
      const attack = attacker.attack;
      const move = attack ? this.resolveMove(attacker.fighterId, attack.moveId) : undefined;
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
      if (!move.projectile || move.projectile.melee) queueStrike(attacker, target, 1 - attackerIndex, move, hitbox, attack);
    });

    for (const projectile of projectiles) {
      if (projectile.hasHit) continue;
      const attacker = characters.find((character) => character.characterId === projectile.ownerId);
      const targetIndex = characters.findIndex((character) => character.characterId !== projectile.ownerId);
      const target = characters[targetIndex];
      const move = this.resolveMove(projectile.fighterId, projectile.moveId);
      if (attacker && target && move) queueStrike(attacker, target, targetIndex, move, projectileHitbox(projectile, true), undefined, projectile);
    }

    // Calcular todos os contatos antes de aplicar efeitos permite trades determinísticos.
    pending.forEach(({ event, attack, projectile, target }) => {
      const attackerState = characters.find((character) => character.characterId === event.attackerId);
      const move = attackerState ? this.resolveMove(attackerState.fighterId, event.moveId) : undefined;
      if (!move) return;
      if (projectile) projectile.hasHit = true;
      if (attack) {
        attack.hasHit = true;
        attack.hitOutcome = event.outcome === 'hit' || event.outcome === 'block' ? event.outcome : undefined;
        if (event.outcome === 'hit' || event.outcome === 'block' || event.outcome === 'parry') attack.hitElapsedFrames = attack.elapsedFrames;
      }
      if (event.outcome === 'throw-start' || event.outcome === 'throw-break') {
        const attacker = characters.find((character) => character.characterId === event.attackerId);
        const throwMove = move.throw;
        if (!attacker || !throwMove || !attack) return;
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
            throwDirection: attack.throwDirection ?? 'forward',
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
        if (projectile) return;
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
      if (event.outcome !== 'block') target.crouching = false;
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
      const move = attacker ? this.resolveMove(attacker.fighterId, grab.moveId) : undefined;
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
        targetOffsetFromAttacker: grab.throwDirection === 'backward'
          ? -move.throw.launchDistance.backward
          : move.throw.launchDistance.forward,
        attackerRecoveryFrames: move.recovery,
        defenderStunFrames: move.hitstun,
        frameAdvantage: frameAdvantage(move.recovery, move.hitstun),
      });
    });
    return events;
  }

  private isStrikeInvulnerable(character: CharacterState): boolean {
    const attack = character.attack;
    const move = attack ? this.resolveMove(character.fighterId, attack.moveId) : undefined;
    return Boolean(
      move?.strikeInvulnerableStartupFrames &&
      attack &&
      attack.elapsedFrames < move.startup &&
      attack.elapsedFrames < move.strikeInvulnerableStartupFrames,
    );
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
