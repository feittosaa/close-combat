import type { CharacterState } from '../engine/characters/CharacterState';
import { GRAPPLER_ULTIMATE_SPIN_POSE_FRAMES } from '../engine/combat/ultimateActivation';

/** Select the victim's authored reaction without changing combat state or collision. */
export function grapplerReaction(state: CharacterState, frame: number): { name: string; drawing: number } | undefined {
  const reaction = state.grapplerGrabReaction;
  if (reaction && state.fighterId === 'grappler' && reaction.moveId !== 'ultimate-grab') frame = reaction.startedFrame + Math.max(0, frame - reaction.startedFrame) * 1.5;
  if (!reaction || (!state.commandGrabbed && !['hitstun', 'knockdown'].includes(state.mode))) return undefined;
  if (state.fighterId === 'shoto' && reaction.moveId === 'ultimate-grab') return undefined;
  if (state.fighterId === 'grappler' && reaction.moveId === 'grab-low' && !reaction.startedLying) return {name:'grappler-reaction-grab-low-standing', drawing:Math.min(5, Math.floor(Math.max(0, frame - reaction.startedFrame) / 6))};
  if (!state.commandGrabbed && state.grounded && state.mode === 'knockdown' && state.remainingStateFrames <= 12) return undefined;
  if (reaction.moveId === 'grab-throw') {
    const age = Math.max(0, frame - reaction.startedFrame);
    if (state.throwPull || age <= 1) return {name:'grappler-reaction-grab-throw', drawing:Math.min(2, Math.floor(age / 4))};
    if (!state.grounded) return {name:'air-hurt', drawing:Math.min(5, 1 + Math.floor(age / 3))};
    if (state.mode === 'knockdown') return {name:state.fighterId === 'texas' ? 'fall-landing' : 'fall', drawing:5};
  }
  if (reaction.moveId === 'grab-slam' && !state.commandGrabbed && state.grounded && state.mode === 'knockdown') {
    return {name:state.fighterId === 'texas' ? 'fall-landing' : 'fall', drawing:5};
  }
  if (reaction.moveId === 'grab-launcher' && !state.grounded) {
    return {name:'air-hurt', drawing:Math.min(5, 1 + Math.floor(Math.max(0, frame - reaction.startedFrame) / 3))};
  }
  const advance = reaction.moveId === 'grab-headbutt' ? 6 : ['grab-slam', 'grab-launcher', 'grab-low', 'grab-throw'].includes(reaction.moveId) ? 12 : 0;
  const age = Math.max(0, frame - reaction.startedFrame + advance);
  let drawing: number;
  if (reaction.moveId === 'grab-slam') drawing = Math.min(4, Math.max(0, 1 + Math.floor((frame - reaction.startedFrame - 2) / 4)));
  else if ((state.fighterId === 'texas' || state.fighterId === 'shoto') && reaction.moveId === 'grab-headbutt') drawing = Math.min(2, Math.floor(age / 6));
  else if (reaction.moveId === 'grab-low' && reaction.startedLying) drawing = Math.min(4, Math.max(0, 1 + Math.floor((frame - reaction.startedFrame - 2) / 6)));
  else if (reaction.moveId === 'ultimate-grab' && state.commandGrabbed) drawing = 1 + Math.floor(age / GRAPPLER_ULTIMATE_SPIN_POSE_FRAMES) % 3;
  else if (state.grounded && state.mode === 'knockdown' && age >= 6) drawing = 5;
  else if (reaction.moveId === 'ultimate-grab' && !state.grounded) drawing = 4;
  else drawing = Math.min(4, Math.floor(age / 6));
  // The contact frame is frozen by hitstop; the next drawing begins only on the first resumed frame.
  if (reaction.moveId === 'grab-low' && !reaction.startedLying && frame - reaction.startedFrame <= 1) drawing = Math.max(0, drawing - 1);
  return { name:`grappler-reaction-${reaction.moveId}`, drawing };
}
