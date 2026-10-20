import type { CharacterState } from '../../engine/characters/CharacterState';
import testerManifest from '../../assets/animations/tester.json';

const MOVE_CLIPS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  tester: testerManifest.moveClips,
};

const MODE_CLIPS: Partial<Record<CharacterState['mode'], string>> = {
  neutral: 'idle',
  moving: 'walk',
  dashing: 'dash',
  airborne: 'jump',
  crouching: 'crouch',
  blocking: 'defense',
  hitstun: 'hit',
  blockstun: 'blockstun',
  grabbed: 'grabbed',
  knockdown: 'knockdown',
};

/** Resolve a stable Phaser animation key without giving the visual layer game authority. */
export function getCharacterAnimationKey(state: CharacterState): string {
  if (state.crouching && (state.mode === 'blocking' || state.mode === 'blockstun')) return `${state.fighterId}-crouch`;
  if (state.attack && (state.mode === 'startup' || state.mode === 'active' || state.mode === 'recovery')) {
    const clip = MOVE_CLIPS[state.fighterId]?.[state.attack.moveId] ?? state.attack.moveId;
    return `${state.fighterId}-${clip}-${state.mode}`;
  }

  const clip = MODE_CLIPS[state.mode] ?? 'idle';
  return `${state.fighterId}-${clip}`;
}
