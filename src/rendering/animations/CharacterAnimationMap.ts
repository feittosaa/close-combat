import type { CharacterState } from '../../engine/characters/CharacterState';
const modes: Record<CharacterState['mode'], string> = {
  neutral: 'idle', moving: 'walk', dashing: 'dash', airborne: 'jump', crouching: 'crouch',
  startup: 'startup', active: 'active', recovery: 'recovery', knockdown: 'hit', blocking: 'defense', hitstun: 'hit', blockstun: 'blockstun',
};
/** Convenção de chaves para arte futura; nenhum clipe é exigido pelo Shoto geométrico. */
export function getCharacterAnimationKey(state: CharacterState, clips?: Readonly<Record<string, string>>): string {
  if (state.attack) return `${state.fighterId}-${clips?.[state.attack.moveId] ?? state.attack.moveId}-${state.mode}`;
  if (state.mode === 'moving' && state.movementDirection === 'backward') return `${state.fighterId}-walk-backward`;
  return `${state.fighterId}-${state.crouching ? 'crouch' : !state.grounded ? 'jump' : modes[state.mode]}`;
}
