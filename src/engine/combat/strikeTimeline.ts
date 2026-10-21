import type { CharacterState } from '../characters/CharacterState';
import type { MoveDefinition } from '../data/moves';
import type { StrikeFrame } from '../data/combat/CombatBook';

/** Interval gaps never become active merely because they lie between two contacts. */
export function currentStrike(state: CharacterState, move: MoveDefinition, includeConnected = false): { index: number; strike?: StrikeFrame; move: MoveDefinition } | undefined {
  const frame = state.attack?.elapsedFrames ?? -1;
  if (!move.combat) return frame >= move.startup && frame < move.startup + move.activeFrames && (includeConnected || !state.attack?.hasHit)
    ? { index: 0, move } : undefined;
  const index = move.combat.strikes.findIndex(strike => frame >= strike.from && frame <= strike.to);
  if (index < 0 || (!includeConnected && state.attack?.connectedStrikes?.includes(index))) return undefined;
  const base = move.combat.strikes[index];
  const parry = move.combat.parry;
  const strike = state.attack?.parryConfirmed && parry ? { ...base, damage: parry.successDamage ?? base.damage, hitstun: parry.successHitstun ?? base.hitstun, reaction: parry.successReaction ?? base.reaction } : base;
  return { index, strike, move: { ...move, ...strike, damage: strike.damage } };
}

export function inWindow(frame: number, window?: { from: number; to: number }): boolean {
  return Boolean(window && frame >= window.from && frame <= window.to);
}
