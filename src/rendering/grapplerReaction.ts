import type { CharacterState } from '../engine/characters/CharacterState';
import { GRAPPLER_ULTIMATE_SPIN_POSE_FRAMES } from '../engine/combat/ultimateActivation';

/** Select the victim's authored reaction without changing combat state or collision. */
export function grapplerReaction(state: CharacterState, frame: number): { name: string; drawing: number } | undefined {
  const reaction = state.grapplerGrabReaction;
  if (!reaction || (!state.commandGrabbed && !['hitstun', 'knockdown'].includes(state.mode))) return undefined;
  if (state.fighterId === 'shoto' && reaction.moveId === 'ultimate-grab') return undefined;
  if (!state.commandGrabbed && state.grounded && state.mode === 'knockdown' && state.remainingStateFrames <= 12) return undefined;
  const advance = reaction.moveId === 'grab-headbutt' ? 6 : ['grab-slam', 'grab-launcher', 'grab-low', 'grab-throw'].includes(reaction.moveId) ? 12 : 0;
  const age = Math.max(0, frame - reaction.startedFrame + advance);
  let drawing: number;
  if ((state.fighterId === 'texas' || state.fighterId === 'shoto') && reaction.moveId === 'grab-headbutt') drawing = Math.min(2, Math.floor(age / 6));
  else if (reaction.moveId === 'grab-low' && reaction.startedLying && frame - reaction.startedFrame < 6) drawing = 0;
  else if (reaction.moveId === 'ultimate-grab' && state.commandGrabbed) drawing = 1 + Math.floor(age / GRAPPLER_ULTIMATE_SPIN_POSE_FRAMES) % 3;
  else if (state.grounded && state.mode === 'knockdown' && age >= 6) drawing = 5;
  else if (reaction.moveId === 'ultimate-grab' && !state.grounded) drawing = 4;
  else drawing = Math.min(4, Math.floor(age / 6));
  return { name:`grappler-reaction-${reaction.moveId}`, drawing };
}
