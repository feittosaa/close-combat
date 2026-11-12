import type { CharacterState } from '../engine/characters/CharacterState';
import { grappler } from '../engine/data/fighters/grappler';
import { getGrapplerPose } from './animations/grapplerSprites';
import { grapplerElbow, grapplerHand } from './grapplerHands';
import { GRAPPLER_DISPLAY, grapplerAdjustment } from './animations/grapplerSprites';
import { GRAPPLER_ULTIMATE_SPIN_FRAMES } from '../engine/combat/ultimateActivation';

/** `x`, `y`: world offset from the fighter, mirrored already; `scale`: world pixels per sheet pixel; `origin`: the sheet point placed there. */
export type GrapplerEffect = { name: string; frame: number; x: number; y: number; scale: number; origin: { x: number; y: number } };

/** Where the smoke leaves the arm in each sheet's regular grid frame (362 × 724), and how large it is drawn. */
const ARM_SMOKE_SCALE = .5;
const SMOKE_ORIGINS: Readonly<Record<string, { x: number; y: number }>> = {
  'air-grab': { x: 35, y: 248 }, 'grab-launcher': { x: 36, y: 510 }, 'grab-low': { x: 21, y: 337 }, 'grab-slam': { x: 95, y: 398 },
  'grab-throw': { x: 59, y: 380 }, 'hammer-punch': { x: 47, y: 382 }, 'ultimate-grab': { x: 94, y: 364 }, 'ultimate-start': { x: 180, y: 460 },
};
const WHIRL = { scale: .6, origin: { x: 181, y: 362 }, y: -115 };

/** Smoke comes out of the fists, following the arm through the drawings, and the ultimate's whirl surrounds the body. */
export function grapplerEffects(state: CharacterState, activationFrame?: number): GrapplerEffect[] {
  const attack = state.attack;
  if (!attack) return [];
  const sign = state.facing === 'right' ? 1 : -1, pose = getGrapplerPose(state, 0, activationFrame);
  const smoke = (name: string, frame: number): GrapplerEffect => {
    // The hammer's smoke comes off his elbows as the arms swing down, not from where the fists land.
    const hand = (name === 'hammer-punch' ? grapplerElbow : grapplerHand)(state, pose.name, pose.drawing) ?? { x: sign * 60, y: -150 };
    return { name, frame, ...hand, scale: ARM_SMOKE_SCALE, origin: SMOKE_ORIGINS[name] };
  };
  if (attack.moveId === 'ultimate-grab' && activationFrame !== undefined) {
    if (activationFrame < 25) return [];
    const elbows = [[36,-210],[37,-210],[45,-220],[42,-240],[45,-235],[70,-230]] as const;
    const point = elbows[pose.drawing], adjustment = grapplerAdjustment(pose.name, pose.drawing);
    const unit = GRAPPLER_DISPLAY * adjustment.scale / 640;
    return [{ name: 'ultimate-start', frame: Math.floor((activationFrame - 25) / 8) % 6,
      x: sign * (adjustment.center * GRAPPLER_DISPLAY * adjustment.scale + point[0] * unit - 55), y: point[1] * unit,
      scale: ARM_SMOKE_SCALE, origin: SMOKE_ORIGINS['ultimate-start'] }];
  }
  const move = grappler.moves.find(candidate => candidate.id === attack.moveId);
  if (!move || !SMOKE_ORIGINS[move.id] || (move.commandGrab && !attack.hasHit)) return [];
  const delay = move.id === 'grab-slam' ? 10 : move.id === 'grab-throw' ? 8 : move.id === 'hammer-punch' ? -6 : 0;
  const age = attack.elapsedFrames - (attack.startupFrames ?? move.startup) - delay;
  const result: GrapplerEffect[] = age >= 0 && age < 24 ? [smoke(move.id, Math.floor(age / 4))] : [];
  if (move.id === 'ultimate-grab' && age >= 0 && age < GRAPPLER_ULTIMATE_SPIN_FRAMES) {
    result.push({ name: 'ultimate-rotation', frame: Math.floor(age / 3) % 6, x: 0, y: WHIRL.y, scale: WHIRL.scale, origin: WHIRL.origin });
  }
  return result;
}
