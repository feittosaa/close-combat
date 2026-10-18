import type { CharacterState } from '../../engine/characters/CharacterState';

const MODE_CLIPS: Partial<Record<CharacterState['mode'], string>> = {
  neutral: 'idle',
  moving: 'walk',
  dashing: 'dash',
  airborne: 'jump',
  crouching: 'crouch',
  blocking: 'block',
  hitstun: 'hit',
  blockstun: 'blockstun',
  grabbed: 'grabbed',
  knockdown: 'knockdown',
};

/** Resolve a stable Phaser animation key without giving the visual layer game authority. */
export function getCharacterAnimationKey(state: CharacterState): string {
  if (state.attack && (state.mode === 'startup' || state.mode === 'active' || state.mode === 'recovery')) {
    return `${state.fighterId}-${state.attack.moveId}-${state.mode}`;
  }

  const clip = MODE_CLIPS[state.mode] ?? 'idle';
  return `${state.fighterId}-${clip}`;
}
