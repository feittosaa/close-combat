import { getCharacterById } from '../../engine/data/characters';
import type { CharacterState } from '../../engine/characters/CharacterState';
import testerManifest from '../../assets/animations/tester.json';

const MOVE_CLIPS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  tester: testerManifest.moveClips,
};

const MODE_CLIPS: Partial<Record<CharacterState['mode'], string>> = {
  neutral: 'idle',
  moving: 'walk',
  dashing: 'dash',
  running: 'run',
  airborne: 'jump',
  crouching: 'crouch',
  blocking: 'defense',
  hitstun: 'hit',
  blockstun: 'blockstun',
  grabbed: 'grabbed',
  knockdown: 'knockdown',
  throwRecovery: 'throw-recovery',
};

/** Resolve a stable Phaser animation key without giving the visual layer game authority. */
export function getCharacterAnimationKey(state: CharacterState, moveClips = MOVE_CLIPS[state.fighterId]): string {
  if (!state.grounded && state.combo && state.mode === 'hitstun') return `${state.fighterId}-juggle`;
  if (state.crouching && (state.mode === 'blocking' || state.mode === 'blockstun')) return `${state.fighterId}-crouch`;
  if (state.attack && (state.mode === 'startup' || state.mode === 'active' || state.mode === 'recovery')) {
    const clip = getCharacterById(state.fighterId)?.moves.find(move => move.id === state.attack?.moveId)?.combat?.animation.clip ?? moveClips?.[state.attack.moveId] ?? state.attack.moveId;
    return `${state.fighterId}-${clip}-${state.mode}`;
  }

  // An attack can finish one snapshot before the locomotion mode is recomputed.
  // Keep the visible posture consistent with the actual airborne/crouched body.
  if (state.mode === 'neutral' && !state.grounded) return `${state.fighterId}-jump`;
  if (state.mode === 'neutral' && state.crouching) return `${state.fighterId}-crouch`;

  if (state.movementDirection === 'backward' && state.mode === 'moving') return `${state.fighterId}-walk-backward`;
  if (state.movementDirection === 'backward' && state.mode === 'dashing') return `${state.fighterId}-backdash`;

  const clip = MODE_CLIPS[state.mode] ?? 'idle';
  return `${state.fighterId}-${clip}`;
}
