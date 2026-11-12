import type { CharacterState } from '../engine/characters/CharacterState';
import { grappler } from '../engine/data/fighters/grappler';
import { getGrapplerPose } from './animations/grapplerSprites';
import { grapplerHand } from './grapplerHands';
import { GRAPPLER_ULTIMATE_HOLD_FRAMES, GRAPPLER_ULTIMATE_SPIN_FRAMES, GRAPPLER_ULTIMATE_SPIN_POSE_FRAMES } from '../engine/combat/ultimateActivation';

/**
 * How long the victim keeps to the hands after the grab connects, and how it sits on them: `body` is how far above its
 * feet its centre is held (0 keeps it on the floor, following only the hands' reach), `forward` how far past the fists.
 * The last `blend` frames hand the victim over to the engine's own motion, so it does not jump when the hands let go.
 */
const HOLDS: Readonly<Record<string, { frames: number; blend: number; body: number; forward: number }>> = {
  'grab-slam': { frames: 16, blend: 4, body: 100, forward: 35 },
  'grab-throw': { frames: 12, blend: 4, body: 100, forward: 35 },
  'grab-launcher': { frames: 7, blend: 3, body: 100, forward: 35 },
  'grab-low': { frames: 14, blend: 4, body: 60, forward: 20 },
};
/** The hands reach the next drawing's position over this many frames. */
const EASE_FRAMES = 4;

/** How far the Grappler has turned (radians) while he spins through the ultimate's middle drawings, with the victim in his hands. */
export function grapplerSpinPhase(state: CharacterState): number | undefined {
  const attack = state.attack, move = state.fighterId === 'grappler' && attack?.hasHit ? grappler.moves.find(candidate => candidate.id === attack.moveId) : undefined;
  if (!attack || move?.id !== 'ultimate-grab') return undefined;
  const age = attack.elapsedFrames - (attack.startupFrames ?? move.startup);
  return age >= 0 && age < GRAPPLER_ULTIMATE_SPIN_FRAMES ? age * 2 * Math.PI / (3 * GRAPPLER_ULTIMATE_SPIN_POSE_FRAMES) : undefined;
}

/** Presentation-only positions keep the captured drawing with the authored hands. */
export function grapplerCapturePose(target: CharacterState, attacker: CharacterState): CharacterState & { captureSpin?: { phase: number; depth: number } } {
  const attack = attacker.attack;
  if (attacker.fighterId !== 'grappler' || !attack?.hasHit) return target;
  const move = grappler.moves.find(candidate => candidate.id === attack.moveId);
  if (!move) return target;
  const age = attack.elapsedFrames - (attack.startupFrames ?? move.startup), sign = attacker.facing === 'right' ? 1 : -1;
  if (move.id === 'ultimate-grab') {
    if (!target.commandGrabbed || age < 0 || age >= GRAPPLER_ULTIMATE_HOLD_FRAMES) return target;
    const turn = Math.min(age, GRAPPLER_ULTIMATE_SPIN_FRAMES - 1) * 2 * Math.PI / (3 * GRAPPLER_ULTIMATE_SPIN_POSE_FRAMES);
    const orbit = { ...target, x: attacker.x + sign * 75 * Math.cos(turn), y: attacker.y - 85, grounded: false,
      captureSpin: { phase: turn, depth: Math.sin(turn) < 0 ? 9 : 11 } };
    if (age < GRAPPLER_ULTIMATE_SPIN_FRAMES) return orbit;
    // The last drawing lifts the victim overhead on the hands; it is let go, spinning, only after it.
    const hands = grapplerHand(attacker, 'ultimate-grab', 5);
    if (!hands) return orbit;
    const lift = Math.min(1, (age - GRAPPLER_ULTIMATE_SPIN_FRAMES + 1) / EASE_FRAMES);
    return { ...orbit, x: orbit.x + (attacker.x + hands.x + sign * 35 - orbit.x) * lift, y: orbit.y + (attacker.y + hands.y + 100 - orbit.y) * lift, captureSpin: undefined };
  }
  const hold = HOLDS[move.id];
  if (!hold || target.grapplerGrabReaction?.moveId !== move.id || age < 0 || age >= hold.frames) return target;
  const pose = getGrapplerPose(attacker, 0), hand = grapplerHand(attacker, pose.name, pose.drawing);
  if (!hand) return target;
  const heldX = attacker.x + hand.x + sign * hold.forward;
  // At the initial catch the hands are still reaching: the victim starts on the floor, then lifts with them.
  const heldY = move.id === 'grab-slam' && pose.drawing === 1 ? target.y : hold.body ? Math.min(attacker.y, attacker.y + hand.y + hold.body) : target.y;
  // The victim goes from where it stands to the hands over the first frames, and back to the engine's motion over the last.
  const grab = Math.min(1, (age + 1) / EASE_FRAMES), settle = Math.max(0, Math.min(1, (age - (hold.frames - hold.blend)) / hold.blend)), held = grab * (1 - settle);
  const y = target.y + (heldY - target.y) * held;
  return { ...target, x: target.x + (heldX - target.x) * held, y, grounded: hold.body ? y >= attacker.y : target.grounded };
}

/** The ultimate hides the captured fighter until the simulation releases the grab. */
export function hiddenByGrapplerUltimate(target: CharacterState, attacker: CharacterState): boolean {
  return Boolean(target.commandGrabbed && target.grapplerGrabReaction?.moveId === 'ultimate-grab' &&
    attacker.fighterId === 'grappler' && attacker.attack?.moveId === 'ultimate-grab' && attacker.attack.hasHit);
}
