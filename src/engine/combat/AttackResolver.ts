import type { CharacterState } from '../characters/CharacterState';
import type { MoveDefinition } from '../data/moves';
import type { FrameInput } from '../../input/types';
import type { Hitbox } from '../collision/types';
import { createHitbox, createHurtbox } from '../collision/combatGeometry';
import { intersects } from '../collision/intersects';
import { classifyHitContext, frameAdvantage, type HitContext } from './frameData';

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
  context?: HitContext;
}
export class AttackResolver {
  constructor(private readonly resolveMove: (fighterId: string, moveId: string) => MoveDefinition | undefined) {}
  activeHitboxes(characters: readonly CharacterState[]): Hitbox[] {
    return characters.flatMap(character => {
      const move = character.attack ? this.resolveMove(character.fighterId, character.attack.moveId) : undefined;
      return move && character.mode === 'active' ? [createHitbox(character, move)] : [];
    });
  }
  resolve(characters: CharacterState[], inputs: readonly FrameInput[]): HitEvent[] {
    // Capturar todos os contatos antes de aplicar dano mantém trades simétricos.
    const pending = characters.flatMap((attacker, index) => {
      const attack = attacker.attack;
      const move = attack ? this.resolveMove(attacker.fighterId, attack.moveId) : undefined;
      const target = characters[1 - index];
      if (!attack || attack.hasHit || !move || attacker.mode !== 'active') return [];
      if (move.hitLevel === 'high' && target.crouching) return [];
      if (!intersects(createHitbox(attacker, move), createHurtbox(target))) return [];
      const guard = inputs[1 - index]?.direction;
      const blocked = target.grounded && ['blocking', 'blockstun'].includes(target.mode) &&
        (move.hitLevel === 'low' ? guard === 'DB' : guard === 'B' || guard === 'DB');
      const recovery = move.startup + move.activeFrames + move.recovery - attack.elapsedFrames - 1;
      const stun = blocked ? move.blockstun : move.hitstun;
      const event: HitEvent = { attackerId: attacker.characterId, targetId: target.characterId, moveId: move.id,
        damage: blocked ? 0 : Math.min(target.health, move.damage), outcome: blocked ? 'block' : 'hit',
        pushback: blocked ? move.pushback.block : move.pushback.hit, attackerRecoveryFrames: recovery,
        defenderStunFrames: stun, frameAdvantage: frameAdvantage(recovery, stun),
        context: blocked ? undefined : classifyHitContext(target) };
      return [{ attack, target, event }];
    });
    for (const { attack, target, event } of pending) {
      attack.hasHit = true; attack.hitOutcome = event.outcome;
      target.health = Math.max(0, target.health - event.damage);
      target.mode = event.outcome === 'block' ? 'blockstun' : 'hitstun';
      target.remainingStateFrames = event.defenderStunFrames;
      target.attack = undefined;
      target.hitFlashFrames = event.outcome === 'hit' ? 5 : 0;
    }
    return pending.map(({ event }) => event);
  }
}
