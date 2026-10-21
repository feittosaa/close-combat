import { currentStrike, inWindow } from './strikeTimeline';
import { strikeDamage, applyStrikeReaction } from './CombatRuntime';
import type { StrikeFrame } from '../data/combat/CombatBook';
// src/engine/combat/AttackResolver.ts
import type { CharacterState } from '../characters/CharacterState';
import type { MoveDefinition } from '../data/moves';
import { intersects } from '../collision/intersects';
import type { Hitbox } from '../collision/types';
import { createHitbox, createHurtbox } from '../collision/combatGeometry';
import type { AttackButton, FrameInput } from '../../input/types';
import { classifyHitContext, frameAdvantage, recoveryFrames } from './frameData';
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
  armored?: boolean;
  lowParry?: boolean;
  strikeIndex?: number;
  reaction?: 'launch' | 'knockdown';
}

/** Resolve contatos da simulação e fornece a geometria exata para a visualização. */
export class AttackResolver {
  constructor(
    private readonly resolveMove: (fighterId: string, moveId: string) => MoveDefinition | undefined,
  ) {}

  activeHitboxes(characters: readonly CharacterState[]): Hitbox[] {
    return characters.flatMap((character) => {
      const move = character.attack ? this.resolveMove(character.fighterId, character.attack.moveId) : undefined;
      const contact = move ? currentStrike(character, move, true) : undefined;
      if (!move || !contact || (contact.move.projectile && !contact.move.projectile.melee)) return [];
      return [createHitbox(character, contact.move)];
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
      resolvedMove: MoveDefinition;
      strike?: StrikeFrame;
      strikeIndex?: number;
    }> = [];

    const queueStrike = (attacker: CharacterState, target: CharacterState, targetIndex: number,
      move: MoveDefinition, hitbox: Hitbox, attack?: CharacterState['attack'], projectile?: ProjectileState, strike?: StrikeFrame, strikeIndex?: number): void => {
      if (this.isStrikeInvulnerable(target)) return;
      const targetMove = target.attack ? this.resolveMove(target.fighterId, target.attack.moveId) : undefined;
      const targetFrame = target.attack?.elapsedFrames ?? -1;
      if (move.hitLevel === 'high' && inWindow(targetFrame, targetMove?.combat?.highCrush)) return;
      if (move.hitLevel === 'low' && inWindow(targetFrame, targetMove?.combat?.lowCrush)) return;
      if (strike?.requiresPriorHit && attack?.hitOutcome !== 'hit') return;
      if (target.mode === 'knockdown' && !strike?.canHitGround) return;
      if (move.hitLevel === 'high' && (target.crouching || (target.grounded && target.attack?.hurtboxStance === 'crouching'))) return;
      if (intersects(hitbox, createHurtbox(target))) {
        const targetInput = inputs[targetIndex];
        const lowParry = !projectile && move.hitLevel === 'low' && (target.lowParryFrames ?? 0) > 0;
        const sabaki = !projectile && targetMove?.combat?.parry;
        const sabakiSuccess = Boolean(sabaki && inWindow(targetFrame, sabaki) && sabaki.levels.includes(move.hitLevel) && sabaki.limbs.includes(move.combat?.limb ?? 'punch'));
        const parried = lowParry || sabakiSuccess ||
          (!target.combatRules && move.parryable === true && freshBack[targetIndex] === true);
        const blocked = !move.combat?.unblockable && !parried && (target.mode === 'blocking' || target.mode === 'blockstun') && canBlock(move.hitLevel, targetInput);
        const defenderStunFrames = Math.max(target.remainingStateFrames, blocked ? move.blockstun : move.hitstun);
        const currentMove = attacker.attack ? this.resolveMove(attacker.fighterId, attacker.attack.moveId) : undefined;
        const totalAttackFrames = currentMove ? currentMove.startup + currentMove.activeFrames + recoveryFrames(currentMove, blocked || attacker.attack?.wasBlocked ? 'block' : 'hit') : 0;
        // The contact frame has already happened; count only future locked frames.
        const attackerRecoveryFrames = Math.max(0, totalAttackFrames - (attacker.attack?.elapsedFrames ?? 0) - 1);
        pending.push({
          event: {
            attackerId: attacker.characterId,
            targetId: target.characterId,
            moveId: move.id,
            projectileId: projectile?.id,
            direction: projectile?.facing,
            damage: blocked || parried ? 0 : Math.min(move.combat?.nonLethal ? Math.max(0, target.health - 1) : target.health, strikeDamage(attacker, target, move.damage)),
            strikeIndex,
            lowParry,
            armored: !blocked && !parried && inWindow(targetFrame, targetMove?.combat?.armor),
            outcome: parried ? 'parry' : blocked ? 'block' : 'hit',
            pushback: parried ? 0 : blocked ? move.pushback.block : move.pushback.hit,
            attackerRecoveryFrames: parried ? undefined : attackerRecoveryFrames,
            defenderStunFrames: parried ? undefined : defenderStunFrames,
            attackerStunFrames: parried && !projectile ? lowParry ? target.combatRules?.lowParryStunFrames ?? PARRY_STUN_FRAMES : sabakiSuccess && targetMove ? Math.max(PARRY_STUN_FRAMES, targetMove.startup - targetFrame + 1) : PARRY_STUN_FRAMES : undefined,
            frameAdvantage: parried ? undefined : frameAdvantage(attackerRecoveryFrames, defenderStunFrames),
            context: !blocked && !parried ? attack?.forceCounterHit || target.stance === 'charging' ? 'counter-hit' : classifyHitContext(target) : undefined,
          },
          attack,
          projectile,
          target, resolvedMove: move, strike, strikeIndex,
        });
      }
    };

    characters.forEach((attacker, attackerIndex) => {
      const attack = attacker.attack;
      const move = attack ? this.resolveMove(attacker.fighterId, attack.moveId) : undefined;
      const contact = move ? currentStrike(attacker, move) : undefined;
      if (!attack || !move || !contact) return;

      const target = characters[1 - attackerIndex];
      const hitbox = createHitbox(attacker, contact.move);
      if (move.throw) {
        if (!canGrab(attacker, target, move)) return;
        const brokenImmediately = matchesThrowBreak(freshlyPressed[1 - attackerIndex] ?? new Set(), move.throw);
        pending.push({
          event: {
            ...emptyEvent(attacker.characterId, target.characterId, move.id),
            outcome: brokenImmediately ? 'throw-break' : 'throw-start',
            breakButtons: brokenImmediately ? undefined : move.throw.breakButtons,
          },
          attack,
          target, resolvedMove: move,
        });
        return;
      }
      if (!contact.move.projectile || contact.move.projectile.melee) queueStrike(attacker, target, 1 - attackerIndex, contact.move, hitbox, attack, undefined, contact.strike, contact.index);
    });

    for (const projectile of projectiles) {
      if (projectile.hasHit) continue;
      const attacker = characters.find((character) => character.characterId === projectile.ownerId);
      const targetIndex = characters.findIndex((character) => character.characterId !== projectile.ownerId);
      const target = characters[targetIndex];
      const move = this.resolveMove(projectile.fighterId, projectile.moveId);
      if (attacker && target && move) {
        const strike = projectile.strikeIndex !== undefined ? move.combat?.strikes[projectile.strikeIndex] : undefined;
        const effective = strike ? { ...move, ...strike } : move;
        queueStrike(attacker, target, targetIndex, effective, projectileHitbox(projectile, true), undefined, projectile, strike, projectile.strikeIndex);
      }
    }

    // Calcular todos os contatos antes de aplicar efeitos permite trades determinísticos.
    pending.forEach(({ event, attack, projectile, target, resolvedMove: move, strike, strikeIndex }) => {
      const attackerState = characters.find((character) => character.characterId === event.attackerId);
      if (!attackerState) return;
      if (projectile) projectile.hasHit = true;
      if (attack) {
        attack.hasHit = true;
        if (strikeIndex !== undefined) attack.connectedStrikes = [...(attack.connectedStrikes ?? []), strikeIndex];
        if (event.outcome === 'block') attack.wasBlocked = true;
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
          attacker.remainingStateFrames = Math.max(attacker.remainingStateFrames, event.attackerStunFrames ?? PARRY_STUN_FRAMES);
          if (!event.lowParry && target.attack && this.resolveMove(target.fighterId, target.attack.moveId)?.combat?.parry) target.attack.parryConfirmed = true;
          attacker.hitFlashFrames = 5;
          if (event.lowParry) {
            target.lowParryFrames = 0;
            attacker.grounded = false;
            attacker.y -= 2;
            attacker.verticalVelocity = -4;
            attacker.combo = { attackerId: target.characterId, hits: 0, damage: 0, screwUsed: true, wallUsed: false, wallFrames: 0, moveIds: [] };
          }
        }
        return;
      }
      if (event.outcome === 'block') {
        target.mode = 'blockstun';
        target.remainingStateFrames = Math.max(target.remainingStateFrames, move.blockstun);
      } else {
        target.health = Math.max(0, target.health - event.damage);
        if (event.armored) return;
        target.mode = 'hitstun';
        target.remainingStateFrames = Math.max(target.remainingStateFrames, move.hitstun);
        target.hitFlashFrames = 5;
      }
      target.attack = undefined; target.followup = undefined;
      if (event.outcome !== 'block') {
        target.crouching = false;
        applyStrikeReaction(attackerState, target, move, strike, event.damage, event.context === 'counter-hit');
      }
      event.reaction = target.combo && !target.grounded ? 'launch' : (target as CharacterState).mode === 'knockdown' ? 'knockdown' : undefined;
      // Launch advantage is settled by trajectory/landing, not by adding an 'a' table suffix to hitstun.
      event.defenderStunFrames = event.reaction === 'launch' ? undefined : target.remainingStateFrames;
      event.frameAdvantage = event.defenderStunFrames === undefined ? undefined : frameAdvantage(event.attackerRecoveryFrames ?? 0, event.defenderStunFrames);
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

      if (matchesThrowBreak(freshlyPressed[targetIndex] ?? new Set(), move.throw)) {
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
  return required.length > 0 && pressed.size === required.length && required.every((button) => pressed.has(button));
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

function matchesThrowBreak(pressed: ReadonlySet<AttackButton>, data: NonNullable<MoveDefinition['throw']>): boolean {
  return (data.breakAlternatives ?? [data.breakButtons]).some(buttons => matchesButtons(pressed, buttons));
}
