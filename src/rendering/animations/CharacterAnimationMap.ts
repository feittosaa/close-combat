import type { CharacterState } from '../../engine/characters/CharacterState';

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
  if (state.attack && (state.mode === 'startup' || state.mode === 'active' || state.mode === 'recovery')) {
    if (state.fighterId === 'guilty-gear') {
      const buttons = state.attack.buttons;
      const weight = buttons.includes('2') || buttons.includes('4') ? 'heavy' : 'light';
      const limb = buttons.includes('3') || buttons.includes('4') ? 'kick' : 'punch';
      const kind = state.attack.airborne ? 'air' : state.attack.crouching ? 'crouch' : undefined;
      const clip = state.attack.moveId.includes('electric-palm')
        ? 'special'
        : `${kind ? `${kind}-` : ''}${weight}-${limb}`;
      if (clip) return `${state.fighterId}-${clip}`;
    }
    const punchClip = state.attack.moveId === 'test-jab'
      ? 'light-punch'
      : state.attack.moveId === 'test-cross'
        ? 'heavy-punch'
        : undefined;
    if (punchClip) return `${state.fighterId}-${punchClip}-${state.mode}`;
    return `${state.fighterId}-${state.attack.moveId}-${state.mode}`;
  }

  if (state.fighterId === 'guilty-gear') {
    const clip = MODE_CLIPS[state.mode] ?? 'idle';
    return `${state.fighterId}-${clip}`;
  }

  const clip = MODE_CLIPS[state.mode] ?? 'idle';
  return `${state.fighterId}-${clip}`;
}
