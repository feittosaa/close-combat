import type { CharacterState } from '../characters/CharacterState';
import type { MoveDefinition } from '../data/moves';
import type { StrikeFrame } from '../data/combat/CombatBook';
import type { FrameInput } from '../../input/types';

/** Per-fighter posture/resource clocks. Never driven by a sprite or display FPS. */
export function updateCombatState(state: CharacterState, input: FrameInput): void {
  const rules = state.combatRules;
  if (!rules) return;
  if ((state.powerFrames ?? 0) > 0) state.powerFrames! -= 1;
  if ((state.stanceFrames ?? 0) > 0) state.stanceFrames! -= 1;
  if (!state.stanceFrames && state.stance && !['crouching', 'rising'].includes(state.stance)) state.stance = 'standing';
  if ((state.risingFrames ?? 0) > 0) state.risingFrames! -= 1;
  const down = input.direction.startsWith('D') && state.grounded;
  const previousCrouch = state.crouchFrames ?? 0;
  state.crouchFrames = down ? previousCrouch + 1 : 0;
  if (down) state.risingFrames = 0;
  if (!down && previousCrouch >= 6) state.risingFrames = 8;
  if ((state.lowParryFrames ?? 0) > 0) state.lowParryFrames! -= 1;
  if (input.direction === 'DF' && !state.lowParryHeld && !state.attack && input.buttons.size === 0 &&
      ['neutral', 'moving', 'crouching', 'blocking'].includes(state.mode)) state.lowParryFrames = rules.lowParryFrames;
  state.lowParryHeld = input.direction === 'DF';
}

export function applyCombatAction(state: CharacterState, move: MoveDefinition): void {
  const action = move.combat?.action;
  if (move.combat?.command.requiresRage) state.rageUsed = true;
  if (!action) return;
  if (action.power === 'activate' && state.powerAvailable !== false) {
    state.powerFrames = state.combatRules?.powerFrames ?? 600;
    state.powerAvailable = false;
  }
  if (action.power === 'consume') state.powerFrames = 0;
  if (action.powerCost) state.powerFrames = Math.max(0, (state.powerFrames ?? 0) - action.powerCost);
  if (action.stance) { state.stance = action.stance; state.stanceFrames = action.duration ?? state.combatRules?.stanceFrames ?? 24; }
}

/** Multi-hit damage and gravity deteriorate, so repeating a launcher cannot sustain an infinite. */
export function strikeDamage(attacker: CharacterState, target: CharacterState, damage: number): number {
  const rules = attacker.combatRules;
  if (!rules || !target.combo || target.combo.attackerId !== attacker.characterId) return damage;
  const scale = rules.comboScaling[Math.min(target.combo.hits, rules.comboScaling.length - 1)];
  return Math.max(1, Math.floor(damage * scale));
}

export function applyStrikeReaction(attacker: CharacterState, target: CharacterState, move: MoveDefinition,
  strike: StrikeFrame | undefined, damage: number, counter: boolean): void {
  if (!attacker.combatRules || !move.combat) return;
  if (move.combat.action?.power === 'activate-on-hit' && attacker.powerAvailable !== false) {
    attacker.powerFrames = attacker.combatRules.powerFrames; attacker.powerAvailable = false;
  }
  if (move.combat.action?.powerCostOnHit && strike?.hitLevel === 'throw') attacker.powerFrames = Math.max(0, (attacker.powerFrames ?? 0) - move.combat.action.powerCostOnHit);
  const existing = target.combo?.attackerId === attacker.characterId ? target.combo : undefined;
  target.combo = existing ?? { attackerId: attacker.characterId, hits: 0, damage: 0, screwUsed: false, wallUsed: false, wallFrames: 0, moveIds: [] };
  const combo = target.combo;
  combo.hits += 1;
  combo.damage += damage;
  combo.moveIds.push(move.id);
  combo.moveIds = combo.moveIds.slice(-60);
  const reaction = counter ? strike?.counterReaction ?? strike?.reaction : strike?.reaction;
  const screw = strike?.screw && !target.grounded && !combo.screwUsed;
  if (screw) combo.screwUsed = true;
  if ((reaction === 'launch' && target.grounded) || screw) {
    target.grounded = false;
    target.y -= target.y === attacker.y ? 2 : 0;
    target.verticalVelocity = screw ? -12.5 : Math.min(-3, -13.5 + combo.hits * .3);
    target.remainingStateFrames = Math.max(target.remainingStateFrames, 28);
  } else if (!target.grounded) {
    target.verticalVelocity = Math.min(target.verticalVelocity, Math.min(-1, -6 + combo.hits * .25));
    target.remainingStateFrames = Math.max(target.remainingStateFrames, 18);
  } else if (reaction === 'knockdown') {
    target.mode = 'knockdown';
    target.remainingStateFrames = attacker.combatRules.knockdownFrames;
    target.crouching = false;
  }
}

export function finishCombo(state: CharacterState): void {
  if (!state.combo) return;
  state.lastCombo = { hits: state.combo.hits, damage: state.combo.damage, moveIds: [...state.combo.moveIds] };
  state.combo = undefined;
}
