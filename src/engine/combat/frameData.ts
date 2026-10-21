import type { MoveDefinition } from '../data/moves';
import type { CharacterState } from '../characters/CharacterState';

export type HitContext = 'block-punish' | 'whiff-punish' | 'counter-hit';

/** Both counts exclude the contact frame. Positive always means attacker advantage. */
export function frameAdvantage(attackerRecoveryFrames: number, defenderStunFrames: number): number {
  return defenderStunFrames - attackerRecoveryFrames;
}

/** Called only after a real strike collision, before mutating either combatant. */
export function classifyHitContext(target: CharacterState): HitContext | undefined {
  const attack = target.attack;
  if (!attack) return undefined;
  if (attack.hitOutcome === 'block' && (target.mode === 'active' || target.mode === 'recovery')) return 'block-punish';
  if (!attack.hasHit && target.mode === 'recovery') return 'whiff-punish';
  if (target.mode === 'startup' || target.mode === 'active') return 'counter-hit';
  return undefined;
}

/** Contact-specific recovery is authored per move, never a global speed adjustment. */
export function recoveryFrames(move: MoveDefinition, contacted: boolean): number {
  return contacted ? move.combat?.recoveryOnContact ?? move.recovery : move.recovery;
}
